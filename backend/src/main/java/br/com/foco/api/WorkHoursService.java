package br.com.foco.api;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

record WorkSession(String id, OffsetDateTime startAt, OffsetDateTime endAt, double focusSeconds) {}
record WorkDay(LocalDate day, double workedSeconds, double undefinedSeconds,
        double regularSeconds, double extraSeconds, boolean estimated) {}
record UndefinedPeriod(LocalDate day, OffsetDateTime startAt, OffsetDateTime endAt, double seconds) {}
record WorkHoursReport(List<WorkDay> days, List<UndefinedPeriod> undefinedPeriods) {}

final class WorkHoursService {
    private static final class DayTotal {
        double tracked,undefined; boolean estimated;
        WorkDay result(LocalDate day){double worked=tracked+undefined;double normal=Math.min(worked,WorkSchedule.DAILY_TARGET_SECONDS);return new WorkDay(day,worked,undefined,normal,Math.max(0,worked-normal),estimated);}
    }

    WorkHoursReport build(List<WorkSession> sessions,List<WorkInterval> intervals,LocalDate from,LocalDate to){
        Map<LocalDate,DayTotal> totals=new TreeMap<>();Map<String,List<WorkInterval>> bySession=intervals.stream().collect(Collectors.groupingBy(WorkInterval::sessionId));
        for(WorkSession session:sessions)addTracked(session,bySession.getOrDefault(session.id(),List.of()),totals,from,to);
        List<UndefinedPeriod> gaps=addGaps(sessions,totals,from,to);
        List<WorkDay> days=totals.entrySet().stream().filter(e->e.getValue().tracked+e.getValue().undefined>0)
                .map(e->e.getValue().result(e.getKey())).toList();
        return new WorkHoursReport(days,gaps);
    }

    private void addTracked(WorkSession session,List<WorkInterval> intervals,Map<LocalDate,DayTotal> totals,LocalDate from,LocalDate to){
        if(intervals.isEmpty()){
            LocalDate day=session.startAt().atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();
            if(inRange(day,from,to)){DayTotal total=totals.computeIfAbsent(day,k->new DayTotal());total.tracked+=session.focusSeconds();total.estimated=true;}return;
        }
        double wall=intervals.stream().mapToDouble(i->seconds(i.startAt(),effectiveEnd(i))).sum();
        if(wall<=0){LocalDate day=session.startAt().atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();if(inRange(day,from,to)){DayTotal total=totals.computeIfAbsent(day,k->new DayTotal());total.tracked+=session.focusSeconds();total.estimated=true;}return;}
        double factor=session.focusSeconds()/wall;
        for(WorkInterval interval:intervals){OffsetDateTime end=effectiveEnd(interval);if(end==null||!end.isAfter(interval.startAt()))continue;
            for(LocalDate day=interval.startAt().atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();!day.isAfter(end.atZoneSameInstant(WorkSchedule.ZONE).toLocalDate());day=day.plusDays(1)){
                if(!inRange(day,from,to))continue;Instant dayStart=day.atStartOfDay(WorkSchedule.ZONE).toInstant(),dayEnd=day.plusDays(1).atStartOfDay(WorkSchedule.ZONE).toInstant();
                Instant start=max(dayStart,interval.startAt().toInstant()),stop=min(dayEnd,end.toInstant());if(!stop.isAfter(start))continue;
                DayTotal total=totals.computeIfAbsent(day,k->new DayTotal());total.tracked+=Duration.between(start,stop).toMillis()/1000.0*factor;total.estimated|="Estimado".equals(interval.precision());
            }
        }
    }

    private List<UndefinedPeriod> addGaps(List<WorkSession> sessions,Map<LocalDate,DayTotal> totals,LocalDate from,LocalDate to){
        Map<LocalDate,OffsetDateTime> covered=new HashMap<>();List<UndefinedPeriod> result=new ArrayList<>();
        for(WorkSession session:sessions.stream().sorted(Comparator.comparing(s->s.startAt().toInstant())).toList()){
            if(session.endAt()==null||!session.endAt().isAfter(session.startAt()))continue;
            LocalDate startDay=session.startAt().atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();LocalDate endDay=session.endAt().atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();
            for(LocalDate day=startDay;!day.isAfter(endDay);day=day.plusDays(1)){
                Instant dayStart=day.atStartOfDay(WorkSchedule.ZONE).toInstant(),dayEnd=day.plusDays(1).atStartOfDay(WorkSchedule.ZONE).toInstant();
                Instant segmentStart=max(dayStart,session.startAt().toInstant()),segmentEnd=min(dayEnd,session.endAt().toInstant());if(!segmentEnd.isAfter(segmentStart))continue;
                OffsetDateTime start=segmentStart.atZone(WorkSchedule.ZONE).toOffsetDateTime(),end=segmentEnd.atZone(WorkSchedule.ZONE).toOffsetDateTime();OffsetDateTime previous=covered.get(day);
                if(previous!=null&&start.isAfter(previous))for(WorkSpan span:WorkSchedule.undefinedSpans(previous,start)){
                    if(!inRange(day,from,to))continue;double seconds=span.seconds();result.add(new UndefinedPeriod(day,span.startAt(),span.endAt(),seconds));totals.computeIfAbsent(day,k->new DayTotal()).undefined+=seconds;
                }
                if(previous==null||end.isAfter(previous))covered.put(day,end);
            }
        }
        return result;
    }

    private static OffsetDateTime effectiveEnd(WorkInterval interval){return interval.endAt()!=null?interval.endAt():interval.lastTickAt();}
    private static double seconds(OffsetDateTime start,OffsetDateTime end){return end==null?0:Duration.between(start.toInstant(),end.toInstant()).toMillis()/1000.0;}
    private static boolean inRange(LocalDate day,LocalDate from,LocalDate to){return (from==null||!day.isBefore(from))&&(to==null||!day.isAfter(to));}
    private static Instant max(Instant a,Instant b){return a.isAfter(b)?a:b;}
    private static Instant min(Instant a,Instant b){return a.isBefore(b)?a:b;}
}
