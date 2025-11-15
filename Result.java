import module java.base;

import com.gigamonkeys.bhs.testing.*;

public sealed interface Result permits GoodResult, ErrorResult, TimeoutResult {}

record GoodResult(Map<String, TestResult[]> results) implements Result {}

record ErrorResult(Exception exception) implements Result {}

record TimeoutResult() implements Result {}
