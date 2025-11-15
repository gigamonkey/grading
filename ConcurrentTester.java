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


  public record Result(Map<String, TestResult[]> results, Exception problem) {
    public static final Result TIMEOUT = new Result(null, null);
    public boolean hasResults() {
      return results != null;
    }
  }


  private final TestRunner runner = new TestRunner();
  private final Class<? extends Tester> testerClass;

  public ConcurrentTester(Class<? extends Tester> testerClass) {
    this.testerClass = testerClass;
  }

  public Result testSource(String source) throws Exception {
    var r = runner.results(testerClass, runner.classFromSource(source));
    return new Result(r, null);
  }

  public Callable<Result> makeTask(String source) {
    return new Callable<>() {
      public Result call() throws Exception {
        return testSource(source);
      }
      public String toString() {
        return "Source: " + source;
      }
    };
  }

  public List<Result> testSources(List<String> sources, long timeout, TimeUnit unit) throws InterruptedException {
    ExecutorService executor = Executors.newCachedThreadPool(daemons);
    List<Callable<Result>> tasks = sources.stream().map(this::makeTask).toList();

    try {
      List<Future<Result>> futures = executor.invokeAll(tasks, timeout, unit);

      return futures.stream().map(future -> {
          if (!future.isCancelled()) {
            try {
              return future.get(); // Normal completion
            } catch (ExecutionException e) {
              return new Result(null, (Exception) e.getCause()); // Exceptional completion
            } catch (InterruptedException ie) {
              return new Result(null, ie); // Exceptional completion
            }
          } else {
            return Result.TIMEOUT; // Canceled due to timeout
          }
        }).toList();

    } finally {
      List<Runnable> notStartedTasks = executor.shutdownNow();
      if (!notStartedTasks.isEmpty()) {
        System.out.println(notStartedTasks.size() + " tasks were never started.");
      }
    }
  }
}
