package br.com.foco.api;

import java.time.*;
import java.util.*;

record WorkSpan(OffsetDateTime startAt, OffsetDateTime endAt) {
    double seconds() { return Duration.between(startAt.toInstant(), endAt.toInstant()).toMillis()/1000.0; }
}

final class WorkSchedule {
    static final ZoneId ZONE = ZoneId.systemDefault();
    static final double DAILY_TARGET_SECONDS = 8 * 60 * 60;
    private static final List<LocalTime[]> WINDOWS = List.of(
            new LocalTime[]{LocalTime.of(9,0),LocalTime.NOON},
            new LocalTime[]{LocalTime.of(13,0),LocalTime.of(18,0)});
    private WorkSchedule() {}

    static List<WorkSpan> undefinedSpans(OffsetDateTime from, OffsetDateTime to) {
        LocalDate day=from.atZoneSameInstant(ZONE).toLocalDate();
        if(!day.equals(to.atZoneSameInstant(ZONE).toLocalDate()) || !isWeekday(day) || !to.isAfter(from))return List.of();
        List<WorkSpan> spans=new ArrayList<>();
        for(LocalTime[] window:WINDOWS){
            ZonedDateTime start=day.atTime(window[0]).atZone(ZONE),end=day.atTime(window[1]).atZone(ZONE);
            Instant clippedStart=from.toInstant().isAfter(start.toInstant())?from.toInstant():start.toInstant();
            Instant clippedEnd=to.toInstant().isBefore(end.toInstant())?to.toInstant():end.toInstant();
            if(clippedEnd.isAfter(clippedStart))spans.add(new WorkSpan(clippedStart.atZone(ZONE).toOffsetDateTime(),clippedEnd.atZone(ZONE).toOffsetDateTime()));
        }
        return spans;
    }

    private static boolean isWeekday(LocalDate day) {
        return day.getDayOfWeek()!=DayOfWeek.SATURDAY&&day.getDayOfWeek()!=DayOfWeek.SUNDAY;
    }
}
