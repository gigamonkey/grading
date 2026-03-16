import module java.base;

import com.gigamonkeys.bhs.testing.*;

// Given a branch, file, and tester class, number of questions, and a list of
// repo directories, test the file in the given path in each repo and print out
// the start and end of the changes and the number of tests passed.

// Run the tests concurrently with a timeout.

class Bootup {

  record InRepo(Repo repo, String handle, Commit first, Commit last, int commits, Exception e) {

    public String source(String branch, String file) {
      if (last != null) {
        try {
          return repo.fileContents(last.sha(), branch + "/" + file);
        } catch (IOException ioe) {
          return "";
        }
      } else {
        return "";
      }
    }

    public String withResults(Result r) {
      return "%s\t%s\t%s\t%d\t%d\t%d".formatted(
        handle,
        first != null ? first.abbrev() : "-",
        last != null ? last.abbrev() : "-",
        commits,
        numCorrect(r),
        first != null && last != null ? first.time().until(last.time()).toSeconds() : Integer.MAX_VALUE
      );
    }
  }

  private static final int TIMEOUT = 10;
  private static final TimeUnit TIMEOUT_UNIT = TimeUnit.SECONDS;

  private static final DateTimeFormatter dateFormat =
      DateTimeFormatter.ofPattern("hh:mm:ss M/d/yyyy");

  private final String branch;
  private final String file;
  private final Class<? extends Tester> testerClass;
  private final List<Repo> repos;

  public Bootup(String branch, String file, Class<? extends Tester> testerClass, List<Repo> repos) {
    this.branch = branch;
    this.file = file;
    this.testerClass = testerClass;
    this.repos = repos;
  }

  public void show() throws IOException, InterruptedException {
    ConcurrentTester tester = new ConcurrentTester(testerClass);

    List<InRepo> inRepos = repos.stream().map(this::inRepo).toList();
    List<String> sources = inRepos.stream().map(r -> r.source(branch, file)).toList();
    List<Result> results = tester.testSources(sources, TIMEOUT, TIMEOUT_UNIT);

    for (int i = 0; i < inRepos.size(); i++) {
      IO.println(branch + "\t" + inRepos.get(i).withResults(results.get(i)));
    }
  }

  private static int numCorrect(Result r) {
    return switch (r) {
      case Result.Good g -> TestResult.numPassed(g.results());
      case Result.Error e -> 0;
      case Result.Timeout t -> 0;
    };
  }

  private InRepo inRepo(Repo repo) {
    try {
      List<Commit> commits = repo.branchChanges(branch).toList();
      if (!commits.isEmpty()) {
        String name = repo.name();
        Commit first = commits.getLast(); // git log is reversed.
        Commit last = commits.getFirst();
        int numCommits = commits.size();
        return new InRepo(repo, name, first, last, numCommits, null);
      } else {
        return new InRepo(repo, repo.name(), null, null, 0, null);
      }
    } catch (IOException ioe) {
      return new InRepo(repo, repo.name(), null, null, 0, ioe);
    }
  }

  static void main(String[] args) throws IOException, ClassNotFoundException, InterruptedException {

    if (args.length < 4) {
      System.err.println("args: branch file testerClass repoDirs...");
      System.exit(1);
    }

    var branch = args[0];
    var file = args[1];
    var testerClass = Class.forName(args[2]).asSubclass(Tester.class);
    var repos = Arrays.asList(args).subList(3, args.length).stream().map(Repo::new).toList();

    new Bootup(branch, file, testerClass, repos).show();
  }
}
