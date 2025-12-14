import module java.base;

public record Repo(String dir) {

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
  }
  ;

  public Commit commit(String treeish) throws IOException {
    var args = makeArgs("log", "-1", "--pretty=tformat:%H %at", treeish);
    var process = new ProcessBuilder(args).start();
    try {
      var reader = buffered(process.getInputStream());
      return Commit.parse(reader.readLine());
    } finally {
      close(process);
    }
  }

  public Stream<Commit> log(String treeish, Duration window) throws IOException {
    return log(treeish, new TimeWindow(window));
  }

  public Stream<Commit> log(String treeish, Predicate<Commit> takeWhile) throws IOException {
    var args = makeArgs("log", "--pretty=tformat:%H %at", treeish);
    var process = new ProcessBuilder(args).start();
    var reader = buffered(process.getInputStream());
    return reader.lines().map(Commit::parse).takeWhile(takeWhile).onClose(closer(process));
  }

  public Stream<Commit> branchChanges(String branch) throws IOException {
    var args = makeArgs("log", "--pretty=tformat:%H %at", branch, "--", branch);
    var process = new ProcessBuilder(args).start();
    var reader = buffered(process.getInputStream());
    return reader.lines().map(Commit::parse).onClose(closer(process));
  }

  public Stream<Commit> changes(String start, String end, String branch) throws IOException {
    var range = "%s^...%s".formatted(start, end);
    var args = makeArgs("log", "--pretty=tformat:%H %at", range, "--", branch);
    var process = new ProcessBuilder(args).start();
    var reader = buffered(process.getInputStream());
    return reader.lines().map(Commit::parse).onClose(closer(process));
  }

  public String fileContents(String treeish, String path) throws IOException {
    var args = makeArgs("show", treeish + ":" + path);
    var process = new ProcessBuilder(args).start();
    var reader = buffered(process.getInputStream());
    return reader.lines().onClose(closer(process)).collect(Collectors.joining("\n"));
  }

  private String[] makeArgs(String... args) {
    String[] full = new String[args.length + 3];
    full[0] = "git";
    full[1] = "-C";
    full[2] = dir;
    System.arraycopy(args, 0, full, 3, args.length);
    return full;
  }

  private static BufferedReader buffered(InputStream in) {
    return new BufferedReader(new InputStreamReader(in));
  }

  private static Runnable closer(Process process) {
    return () -> close(process);
  }

  private static void close(Process process) {
    try {
      int exitCode = process.waitFor();

      if (exitCode != 0) {
        System.err.println("Process failed with exit code: " + exitCode);

        try (var err = buffered(process.getErrorStream())) {
          System.err.println("Error output:");
          err.lines().forEach(System.err::println);
        } catch (IOException e) {
          System.err.println("Failed to read error stream: " + e.getMessage());
        }
      }
    } catch (InterruptedException e) {
      System.err.println("Process was interrupted: " + e.getMessage());
      Thread.currentThread().interrupt();
    }
  }
}
