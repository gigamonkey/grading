import module java.base;

public class DaemonThreads implements ThreadFactory {

  private static final ThreadFactory defaultFactory = Executors.defaultThreadFactory();
  private static final ThreadFactory factory = new DaemonThreads();

  private DaemonThreads() {}

  public static ThreadFactory factory() {
    return factory;
  }

  @Override
  public Thread newThread(Runnable r) {
    Thread thread = defaultFactory.newThread(r);
    thread.setDaemon(true);
    return thread;
  }
}
