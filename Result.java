import module java.base;

import com.gigamonkeys.bhs.testing.*;

public sealed interface Result permits Result.Good, Result.Error, Result.Timeout {

  public record Good(Map<String, TestResult[]> results) implements Result {}

  public record Error(Exception exception) implements Result {}

  public record Timeout() implements Result {}


}
