import module java.base;

record Commit(String sha, Instant time) {
  static Commit parse(String line) {
    String[] parts = line.split(" ");
    return new Commit(parts[0], Instant.ofEpochSecond(Long.parseLong(parts[1])));
  }

  public long timestamp() {
    return time.getEpochSecond();
  }
}
