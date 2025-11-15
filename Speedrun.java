import module java.base;

import com.gigamonkeys.bhs.testing.*;

class Speedrun {

  private static final DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("h:m M/d/y");


  record Repo(String dir)  {

    public Stream<Commit> log(String treeish) throws IOException {

      var args = makeArgs("log", "--pretty=tformat:%H %at", treeish);
      var inWindow = new TimeWindow(Duration.of(1, ChronoUnit.HOURS));
      var process = new ProcessBuilder(args).start();
      var reader = buffered(process.getInputStream());

      return reader.lines()
        .map(Commit::parse)
        .takeWhile(inWindow)
        .onClose(closer(process));
    }

    public String fileContents(String treeish, String path) throws IOException {
      var args = makeArgs("show", treeish + ":" + path);
      var process = new ProcessBuilder(args).start();
      var reader = buffered(process.getInputStream());
      return reader.lines().collect(Collectors.joining(""));
    }

    private String[] makeArgs(String... args) {
      String[] full = new String[args.length + 3];
      full[0] = "git";
      full[1] = "-C";
      full[2] = dir;
      System.arraycopy(args, 0, full, 3, args.length);
      return full;
    }
  }

  record Commit(String sha, Instant time) {
    static Commit parse(String line) {
      String[] parts = line.split(" ");
      return new Commit(parts[0], Instant.ofEpochSecond(Long.parseLong(parts[1])));
    }
  }

  record CommitResults(Commit commit, ConcurrentTester.Result result) {}

  private static class TimeWindow implements Predicate<Commit> {

    private final Duration duration;
    private Instant end = null;

    public TimeWindow(Duration duration) {
      this.duration = duration;
    }

    @Override
    public boolean test(Commit commit) {
      if (end == null) {
        end = commit.time().minus(duration);
      }
      return commit.time().isAfter(end);
    }
  };

  private final Repo repo;
  private final String branch;
  private final String file;
  private Optional<Class<? extends Tester>> testerClass;
  private final TestRunner runner = new TestRunner();

  public Speedrun(String dir, String branch, String file, Optional<String> testerName)
    throws ClassNotFoundException
  {
    this.repo = new Repo(dir);
    this.branch = branch;
    this.file = file;
    if (testerName.isPresent()) { // Can't use map because we want to throw ClassNotFoundException
      Class<? extends Tester> clazz = Class.forName(testerName.get()).asSubclass(Tester.class);
      testerClass = Optional.of(clazz);
    } else {
      testerClass = Optional.empty();
    }
  }

  private static BufferedReader buffered(InputStream in) {
    return new BufferedReader(new InputStreamReader(in));
  }

  private static Runnable closer(Process process) {
    return () -> {
      try {
        int exitCode = process.waitFor();

        if (exitCode != 0) {
          System.err.println("Process failed with exit code: " + exitCode);

          try (var err = buffered(process.getErrorStream())) {
            System.err.println("Error output:");
            err.lines().forEach(System.err::println);
          }  catch (IOException e) {
            System.err.println("Failed to read error stream: " + e.getMessage());
          }
        }
      } catch (InterruptedException e) {
        System.err.println("Process was interrupted: " + e.getMessage());
        Thread.currentThread().interrupt();
      }
    };
  }

  private int numPassed(Map<String, TestResult[]> results) {
    return (int) results.values().stream().filter(this::allPassed).count();
  }

  private boolean allPassed(TestResult[] results) {
    return Arrays.stream(results).allMatch(TestResult::passed);
  }

  private double scoreMethodResults(TestResult[] results) {
    return (double) Arrays.stream(results).filter(TestResult::passed).count() / results.length;
  }

  private void dumpLog() throws IOException {

    try (var lines = repo.log(branch)) {
      lines.forEach(c -> {
          try {
            var shortSha = c.sha().substring(0, 8);
            var date = c.time().atZone(ZoneId.systemDefault()).format(dateFormat);
            var code = repo.fileContents(c.sha(), branch + "/" + file);

            var results = testerClass.map(tester -> {
                try {
                  return runner.results(tester, runner.classFromSource(code));
                } catch (ClassNotFoundException cnfe) {
                  IO.println(cnfe);
                  return null;
                } catch (Exception e) {
                  return null;
                }
              });


            IO.println(shortSha + ": " + date + " (" + code.length() + ") " + results.map(this::numPassed).orElse(0));
          } catch (IOException ioe) {
            IO.println("Problem processing " + c);
          }
        });
    }
  }

  private void withResults(long timeout, TimeUnit timeUnit) throws IOException, InterruptedException {
    ConcurrentTester tester = new ConcurrentTester(testerClass.get());

    try (var lines = repo.log(branch)) {
      List<Commit> commits = lines.toList();
      List<String> sources = sources(commits);
      List<ConcurrentTester.Result> results = tester.testSources(sources, timeout, timeUnit);
      for (int i = 0; i < commits.size(); i++) {
        var c = commits.get(i);
        var shortSha = c.sha().substring(0, 8);
        var date = c.time().atZone(ZoneId.systemDefault()).format(dateFormat);
        var r = results.get(i);
        IO.println(shortSha + ": " + date + " - " + showResult(r));
      }
    }
  }

  private String showResult(ConcurrentTester.Result r) {
    if (r.results() != null) {
      return "" + numPassed(r.results());
    } else if (r.problem() != null) {
      String msg = r.problem().getMessage();
      return msg.substring(0, Math.min(20, msg.indexOf("\n")));
    } else {
      return "timeout";
    }
  }

  private String getSource(Commit commit) {
    try {
      return repo.fileContents(commit.sha(), branch + "/" + file);
    } catch (IOException ioe) {
      return "";
    }
  }

  public List<String> sources(List<Commit> commits) {
    return commits.stream().map(this::getSource).toList();
  }

  static void main(String[] args) throws IOException, ClassNotFoundException, InterruptedException {

    if (args.length < 3) {
      System.err.println("args: repo-directory branch file");
    }

    var dir = args[0];
    var branch = args[1];
    var file = args[2];

    Optional<String> testerClass = Optional.ofNullable(args.length > 3 ? args[3] : null);

    var speedrun = new Speedrun(dir, branch, file, testerClass);

    if (testerClass.isPresent()) {
      speedrun.withResults(2, TimeUnit.SECONDS);
    } else {
      speedrun.dumpLog();
    }

  }
}
