import module java.base;

/**
 * Run a bunch of tasks concurrently, mostly so we can timeout runs that don't
 * return (e.g. student code that goes into an infinite loop.)
 */
public class WithTimeouts<R> {

  public sealed interface Result<R> permits Result.Good, Result.Error, Result.Timeout {
    public record Good<R>(R result, String emoji) implements Result<R> {}
    public record Error<R>(Exception exception, String emoji) implements Result<R> {}
    public record Timeout<R>(String emoji) implements Result<R> {}

    public String emoji();

    public static <R> Result<R> of(Future<R> future) {
      if (!future.isCancelled()) {
        try {
          return new Result.Good<>(future.get(), "✅");
        } catch (ExecutionException e) {
          return new Result.Error<>((Exception) e.getCause(), "❌");
        } catch (InterruptedException ie) {
          return new Result.Error<>(ie, "❌");
        }
      } else {
        return new Result.Timeout<>("⏱️");
      }
    }
  }

  private final long timeout;
  private final TimeUnit unit;

  public WithTimeouts(long timeout, TimeUnit unit) {
    this.timeout = timeout;
    this.unit = unit;
  }

  public List<Result<R>> run(List<? extends Callable<R>> tasks) throws InterruptedException {
    ExecutorService executor = Executors.newCachedThreadPool(DaemonThreads.factory());
    try {
      return executor.invokeAll(tasks, timeout, unit).stream().map(Result::of).toList();
    } finally {
      var notStartedTasks = executor.shutdownNow();
      if (!notStartedTasks.isEmpty()) {
        System.out.println(notStartedTasks.size() + " tasks were never started.");
      }
    }
  }
}
