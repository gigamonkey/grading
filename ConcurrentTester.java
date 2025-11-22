import module java.base;

import com.gigamonkeys.bhs.testing.*;

/**
 * Run tests against a bunch of source code concurrently, mostly so we can
 * timeout runs that don't return (e.g. student code goes into an infinite
 * loop.)
 */
public class ConcurrentTester {

  private static final ThreadFactory daemons = new ThreadFactory() {
      private final ThreadFactory defaultFactory = Executors.defaultThreadFactory();

      @Override
      public Thread newThread(Runnable r) {
        Thread thread = defaultFactory.newThread(r);
        thread.setDaemon(true);
        return thread;
      }
    };

  private final TestRunner runner = new TestRunner();
  private final Class<? extends Tester> testerClass;

  public ConcurrentTester(Class<? extends Tester> testerClass) {
    this.testerClass = testerClass;
  }

  public List<Result> testSources(List<String> sources, long timeout, TimeUnit unit) throws InterruptedException {
    ExecutorService executor = Executors.newCachedThreadPool(daemons);
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
        return new Result.Error((Exception) e.getCause());
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

  private Map<String, TestResult[]>  testSource(String source) throws Exception {
    return runner.results(testerClass, TestRunner.classFromSource(source));
  }

}
