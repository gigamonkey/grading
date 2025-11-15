import module java.base;

import com.gigamonkeys.bhs.testing.*;

class Speedrun {

  private static final DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("h:m M/d/y");

  record CommitResults(Commit commit, Result result) {}

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
      List<Result> results = tester.testSources(sources, timeout, timeUnit);
      for (int i = 0; i < commits.size(); i++) {
        var c = commits.get(i);
        var shortSha = c.sha().substring(0, 8);
        var date = c.time().atZone(ZoneId.systemDefault()).format(dateFormat);
        var r = results.get(i);
        IO.println(shortSha + ": " + date + " - " + showResult(r));
      }
    }
  }

  private String showResult(Result r) {
    return switch (r) {
    case GoodResult g -> "Passed: " + numPassed(g.results());
    case ErrorResult e -> shortString(e.exception().getMessage());
    case TimeoutResult t -> "timeout";
    };
  }

  private static String shortString(String s) {
    return s.substring(0, Math.min(20, s.indexOf("\n")));
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
