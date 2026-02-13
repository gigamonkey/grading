import module java.base;

import com.gigamonkeys.bhs.testing.*;

public sealed interface Result permits Result.Good, Result.Error, Result.Timeout {

  public void dump();

  public record Good(Map<String, TestResult[]> results) implements Result {
    public void dump() {
      TestRunner.printJson(results);
    }
  }

  public record Error(Throwable exception) implements Result {
    public void dump() {
      IO.println(exception);
    }

  }

  public record Timeout() implements Result {
    public void dump() {
      IO.println("Timed out");
    }

  }
}
