import module java.base;

import com.gigamonkeys.bhs.testing.*;

/**
 * Run tests against a bunch of source code concurrently, mostly so we can
 * timeout runs that don't return (e.g. student code goes into an infinite
 * loop.)
 */
public class ConcurrentTester {

  private final TestRunner runner = new TestRunner();
  private final Class<? extends Tester> testerClass;

  public ConcurrentTester(Class<? extends Tester> testerClass) {
    this.testerClass = testerClass;
  }

  public List<Result> testSources(List<String> sources, long timeout, TimeUnit unit)
      throws InterruptedException {
    ExecutorService executor = Executors.newCachedThreadPool(DaemonThreads.factory());
    List<Callable<Map<String, TestResult[]>>> tasks = sources.stream().map(this::makeTask).toList();

    try {
      List<Future<Map<String, TestResult[]>>> futures = executor.invokeAll(tasks, timeout, unit);

      return futures.stream().map(this::mapResult).toList();

    } finally {
      List<Runnable> notStartedTasks = executor.shutdownNow();
      if (!notStartedTasks.isEmpty()) {
        System.out.println(notStartedTasks.size() + " tasks were never started.");
      }
    }
  }

  private Result mapResult(Future<Map<String, TestResult[]>> future) {
    if (!future.isCancelled()) {
      try {
        return new Result.Good(future.get());
      } catch (ExecutionException e) {
        return new Result.Error(e.getCause());
      } catch (InterruptedException ie) {
        return new Result.Error(ie);
      }
    } else {
      return new Result.Timeout();
    }
  }

  private Callable<Map<String, TestResult[]>> makeTask(String source) {
    return new Callable<>() {
      public Map<String, TestResult[]> call() throws Exception {
        return testSource(source);
      }

      public String toString() {
        return "Source: " + source;
      }
    };
  }

  private Map<String, TestResult[]> testSource(String source) throws Exception {
    return runner.results(testerClass, TestRunner.classFromSource(source));
  }


  public static void main(String[] args) throws Exception {

    Class<? extends Tester> testerClass = Class.forName("com.gigamonkeys.bhs.assignments." + args[0]).asSubclass(Tester.class);

    List<Path> paths = Arrays.asList(args).subList(1, args.length).stream().map(Path::of).toList();
    List<String> sources = paths.stream().map(ConcurrentTester::getSource).toList();
    List<Result> results = new ConcurrentTester(testerClass).testSources(sources, 10L, TimeUnit.SECONDS);

    for (int i = 0; i < paths.size(); i++) {
      Path p = paths.get(i);
      saveResults(p.getParent(), results.get(i));
      IO.println("%s - %s".formatted(paths.get(i), results.get(i)));
    }
  }

  private static void saveResults(Path dir, Result r) throws IOException {
    switch (r) {
      case Result.Good(var results) -> {
        Files.writeString(dir.resolve("results.json"), TestRunner.resultsJson(results));
      }
      case Result.Error(var exception) -> {
        Files.writeString(dir.resolve("exception.txt"), String.valueOf(exception));
      }
      case Result.Timeout() -> {
        Files.writeString(dir.resolve("timeout.txt"), "");
      }
    }
  }

  private static String getSource(Path p) {
    try {
      return Files.readString(p);
    } catch (IOException ioe) {
      return "";
    }
  }


}
