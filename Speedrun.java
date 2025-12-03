import static java.lang.Math.max;

import module java.base;

import com.gigamonkeys.bhs.testing.*;

class Speedrun {

  private static final DateTimeFormatter dateFormat =
      DateTimeFormatter.ofPattern("hh:mm:ss M/d/yyyy");

  private final Repo repo;
  private final String branch;
  private final String file;
  private Optional<Class<? extends Tester>> testerClass;
  private final TestRunner runner = new TestRunner();

  public Speedrun(String dir, String branch, String file, Optional<String> testerName)
      throws ClassNotFoundException {
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

  private void dumpLog() throws IOException {

    IO.println("-*- mode: markup; -*-");
    IO.println();

    try (var lines = repo.log(branch, Duration.of(4, ChronoUnit.HOURS))) {
      List<Commit> commits = lines.toList().reversed();
      for (var c : commits) {
        var shortSha = c.sha().substring(0, 8);
        var date = c.time().atZone(ZoneId.systemDefault()).format(dateFormat);
        var code = getSource(c);

        IO.println();
        IO.println("* " + shortSha + ": " + date);
        IO.println();
        IO.println(code);
        IO.println();
      }
    }
  }

  private void withResults(long timeout, TimeUnit timeUnit)
      throws IOException, InterruptedException {
    try (var lines = repo.log(branch, Duration.of(4, ChronoUnit.HOURS))) {
      showResults(lines, 0, timeout, timeUnit);
    }
  }

  private void checkRange(
      String startSha, String endSha, int questions, long timeout, TimeUnit timeUnit)
      throws IOException, InterruptedException {
    try (var lines = repo.changes(startSha, endSha, branch)) {
      showResults(lines, questions, timeout, timeUnit);
    }
  }

  private void showResults(Stream<Commit> lines, int questions, long timeout, TimeUnit timeUnit)
      throws IOException, InterruptedException {
    ConcurrentTester tester = new ConcurrentTester(testerClass.get());

    List<Commit> commits = lines.toList();
    List<String> sources = sources(commits);
    List<Result> results = tester.testSources(sources, timeout, timeUnit);
    int mostPassed = 0;
    for (int i = 0; i < commits.size(); i++) {
      var c = commits.get(i);
      var shortSha = c.sha().substring(0, 8);
      var date = c.time().atZone(ZoneId.systemDefault()).format(dateFormat);
      var elapsed =
          i < commits.size() - 1
              ? Duration.between(commits.get(i + 1).time(), c.time())
              : Duration.ZERO;
      var r = results.get(i);
      mostPassed = max(mostPassed, numCorrect(r));
      IO.println(
          shortSha
              + ": "
              + date
              + " ("
              + durationString(elapsed, TimeUnit.MINUTES)
              + ") - "
              + showResult(r));
    }

    var start = commits.getLast();
    var end = commits.getFirst();
    var elapsed = Duration.between(start.time(), end.time());

    IO.println(
        "Total time: %s; passed %d of %d"
            .formatted(durationString(elapsed, TimeUnit.HOURS), mostPassed, questions));
  }

  private static final TimeUnit[] units = {TimeUnit.SECONDS, TimeUnit.MINUTES, TimeUnit.HOURS};

  private TimeUnit maximumUnit(Duration d) {
    for (int i = units.length - 1; i >= 0; i--) {
      if (toPart(d, units[i]) > 0) return units[i];
    }
    return TimeUnit.SECONDS;
  }

  private String durationString(Duration d, TimeUnit minUnit) {
    TimeUnit maxUnit = maximumUnit(d);
    TimeUnit firstUnit = maxUnit.compareTo(minUnit) > 0 ? maxUnit : minUnit;

    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < units.length; i++) {
      long v = toPart(d, units[i]);
      if (units[i] == firstUnit) {
        sb.insert(0, "%d".formatted(v));
      } else if (units[i].compareTo(firstUnit) < 0 || v > 0) {
        sb.insert(0, ":%02d".formatted(v));
      }
    }
    return sb.toString();
  }

  public static long toPart(Duration duration, TimeUnit unit) {
    switch (unit) {
      case TimeUnit.HOURS:
        return duration.toHoursPart();
      case TimeUnit.MINUTES:
        return duration.toMinutesPart();
      case TimeUnit.SECONDS:
        return duration.toSecondsPart();
      default:
        throw new UnsupportedOperationException(
            "Unit " + unit + " is not supported for part extraction");
    }
  }

  private String showResult(Result r) {
    return switch (r) {
      case Result.Good g -> "Passed: " + numPassed(g.results());
      case Result.Error e -> shortString(e.exception().getMessage());
      case Result.Timeout t -> "timeout";
    };
  }

  private int numCorrect(Result r) {
    return switch (r) {
      case Result.Good g -> numPassed(g.results());
      case Result.Error e -> 0;
      case Result.Timeout t -> 0;
    };
  }

  private static String shortString(String s) {
    return s.substring(0, Math.min(20, Math.max(s.length(), s.indexOf("\n"))));
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

  static void doDumpLog(List<String> args)
      throws IOException, ClassNotFoundException, InterruptedException {

    var dir = args.get(0);
    var branch = args.get(1);
    var file = args.get(2);

    var speedrun = new Speedrun(dir, branch, file, Optional.empty());
    speedrun.dumpLog();
  }

  static void doWithResults(List<String> args)
      throws IOException, ClassNotFoundException, InterruptedException {

    var dir = args.get(0);
    var branch = args.get(1);
    var file = args.get(2);
    var testerClass = args.get(3);

    var speedrun = new Speedrun(dir, branch, file, Optional.of(testerClass));
    speedrun.withResults(2, TimeUnit.SECONDS);
  }

  static void doCheck(List<String> args)
      throws IOException, ClassNotFoundException, InterruptedException {

    var dir = args.get(0);
    var branch = args.get(1);
    var file = args.get(2);
    var testerClass = args.get(3);
    var start = args.get(4);
    var end = args.get(5);
    var questions = Integer.parseInt(args.get(6));

    var speedrun = new Speedrun(dir, branch, file, Optional.of(testerClass));
    speedrun.checkRange(start, end, questions, 2, TimeUnit.SECONDS);
  }

  static void doEmit(List<String> args)
      throws IOException, ClassNotFoundException, InterruptedException {

    var dir = args.get(0);
    var repo = new Repo(dir);

    var start = repo.commit(args.get(1));
    var end = repo.commit(args.get(2));

    var elapsed = Duration.between(start.time(), end.time());

    long hours = elapsed.toHours();
    long minutes = elapsed.toMinutesPart();
    long seconds = elapsed.toSecondsPart();

    var date = end.time().atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ISO_LOCAL_DATE);

    var gitname = Path.of(dir).getFileName().toString();

    IO.println(
        "%s,%s,%s,%s,%d"
            .formatted(
                gitname.substring(0, gitname.indexOf(".git")),
                date,
                start.sha(),
                end.sha(),
                elapsed.getSeconds()));
  }

  static void main(String[] args) throws IOException, ClassNotFoundException, InterruptedException {

    if (args.length < 1) {
      System.err.println("args: command <args>");
      System.err.println("Commands:");
      System.err.println("  check   - emit a log of changes with scores for each commit in range");
      System.err.println("  emit    - emit a record with the date, shas, and elapsed seconds");
      System.err.println("  log     - emit a log of changes");
      System.err.println("  results - emit a log of changes with score for each commit");
      System.exit(1);
    }

    var rest = Arrays.asList(args).subList(1, args.length);

    switch (args[0]) {
      case "check":
        doCheck(rest);
        break;
      case "log":
        doDumpLog(rest);
        break;
      case "results":
        doWithResults(rest);
        break;
      case "emit":
        doEmit(rest);
        break;
      default:
        System.err.println("Don't understand command " + args[0]);
        System.exit(1);
    }
  }
}
