
import module java.base;

import com.gigamonkeys.bhs.testing.*;

class TestSha {

  private final Repo repo;
  private final String branch;
  private final String file;
  private final Class<? extends Tester> testerClass;
  private final String sha;
  private final TestRunner runner = new TestRunner();

  public TestSha(String repoDir, String branch, String file, String testerName, String sha)
      throws ClassNotFoundException {
    this.repo = new Repo(repoDir);
    this.branch = branch;
    this.file = file;
    this.testerClass = Class.forName(testerName).asSubclass(Tester.class);
    this.sha = sha;
  }

  public void run() throws Exception {
    String source = repo.fileContents(sha, branch + "/" + file);
    runner.printResults(testerClass, TestRunner.classFromSource(source));
  }

  static void main(String[] args) throws Exception {
    if (args.length < 5) {
      System.err.println("args: repoDir branch file testerClass sha");
      System.exit(1);
    }

    var dir = args[0];
    var branch = args[1];
    var file = args[2];
    var testerClass = args[3];
    var sha = args[4];

    new TestSha(dir, branch, file, testerClass, sha).run();
  }
}
