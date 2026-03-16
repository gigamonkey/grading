import module java.base;

public class Format {

  private static final ChronoUnit[] units = {ChronoUnit.SECONDS, ChronoUnit.MINUTES, ChronoUnit.HOURS};

  public static String duration(Duration d, ChronoUnit minUnit) {
    ChronoUnit maxUnit = maximumUnit(d);
    ChronoUnit firstUnit = maxUnit.compareTo(minUnit) > 0 ? maxUnit : minUnit;

    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < units.length; i++) {
      long v = toPart(d, units[i]);
      if (units[i] == firstUnit) {
        sb.insert(0, "%d".formatted(v));
      } else if (units[i].compareTo(firstUnit) < 0 || v > 0) {
        sb.insert(0, ":%02d".formatted(v));
      }
    }
    return sb.toString();
  }

  private static ChronoUnit maximumUnit(Duration d) {
    for (int i = units.length - 1; i >= 0; i--) {
      if (d.compareTo(Duration.of(1, units[i])) >= 0) {
        return units[i];
      }
    }
    return ChronoUnit.SECONDS;
  }


  private static long toPart(Duration duration, ChronoUnit unit) {
    switch (unit) {
      case ChronoUnit.HOURS:
        return duration.toHours();
      case ChronoUnit.MINUTES:
        return duration.toMinutesPart();
      case ChronoUnit.SECONDS:
        return duration.toSecondsPart();
      default:
        throw new UnsupportedOperationException(
            "Unit " + unit + " is not supported for part extraction");
    }
  }

  public static void main(String[] args) {
    IO.println(duration(Duration.of(Integer.parseInt(args[0]), ChronoUnit.SECONDS), ChronoUnit.MINUTES));
  }
}
