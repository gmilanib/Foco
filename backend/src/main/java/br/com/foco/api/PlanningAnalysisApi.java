package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

record AnalysisTask(String id,String client,String project,String activity,String details,
        LocalDate plannedDate,Double estimatedSeconds,double plannedSeconds,double actualSeconds) {}
record AnalysisGroup(String client,String name,double estimatedSeconds,double plannedSeconds,
        double actualSeconds,int missingEstimates,int unestimatedPlans,double unlinkedSeconds) {}
record AnalysisWeek(LocalDate start,double plannedSeconds,double actualSeconds,double capacitySeconds,
        int unestimatedPlans,double unlinkedSeconds) {}
record PlanningAnalysis(LocalDate from,LocalDate to,String hoursMode,List<AnalysisTask> tasks,
        List<AnalysisGroup> projects,List<AnalysisWeek> weeks,double unlinkedSeconds) {}

@RestController
@RequestMapping("/api/planning/analysis")
class PlanningAnalysisController {
    private final JdbcTemplate db;
    PlanningAnalysisController(JdbcTemplate db){this.db=db;}

    @GetMapping PlanningAnalysis analyse(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="real") String hoursMode){
        String seconds=HoursBasis.sql(hoursMode);
        if(to.isBefore(from)||ChronoUnit.DAYS.between(from,to)>365)
            throw new IllegalArgumentException("Escolha um período de até 366 dias, com início antes do fim.");
        Map<String,TaskData> tasks=new LinkedHashMap<>();
        db.query("SELECT t.*,p.planned_date,e.minutes FROM tasks t LEFT JOIN task_plans p ON p.task_id=t.id LEFT JOIN task_estimates e ON e.task_id=t.id ORDER BY t.client,t.project,t.activity,t.id",r->{
            while(r.next()){
                String date=r.getString("planned_date");
                Integer minutes=(Integer)r.getObject("minutes");
                var task=new TaskData(r.getString("id"),clean(r.getString("client")),clean(r.getString("project")),
                        r.getString("activity"),clean(r.getString("details")),date==null?null:LocalDate.parse(date),
                        minutes==null?null:minutes*60.0);
                tasks.put(task.id,task);
            }
            return null;
        });
        int capacity=db.query("SELECT value FROM settings WHERE key='planning.capacityMinutes'",r->r.next()?Integer.parseInt(r.getString(1)):480);
        Map<LocalDate,WeekData> weeks=new TreeMap<>();
        for(LocalDate day=from;!day.isAfter(to);day=day.plusDays(1))
            weeks.computeIfAbsent(monday(day),WeekData::new).capacity+=capacity*60.0;
        Map<String,ProjectData> projects=new LinkedHashMap<>();
        for(TaskData task:tasks.values())if(inRange(task.date,from,to)){
            task.included=true;
            var week=weeks.get(monday(task.date));
            if(task.estimate==null)week.missing++;
            else{task.planned=task.estimate;week.planned+=task.estimate;}
        }
        // Attribute each whole session to its local start day, as in the existing reports.
        double[] unlinked={0};
        db.query("SELECT task_id,client,project,start_at,"+seconds+" seconds FROM sessions WHERE julianday(start_at)>=julianday(?) AND julianday(start_at)<julianday(?)",r->{
            while(r.next()){
                LocalDate day=OffsetDateTime.parse(r.getString("start_at")).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
                if(!inRange(day,from,to))continue;
                double actual=r.getDouble("seconds");
                var week=weeks.get(monday(day));week.actual+=actual;
                TaskData task=tasks.get(r.getString("task_id"));
                if(task!=null){task.included=true;task.actual+=actual;}
                else{
                    unlinked[0]+=actual;week.unlinked+=actual;
                    var p=project(projects,clean(r.getString("client")),clean(r.getString("project")));
                    p.actual+=actual;p.unlinked+=actual;
                }
            }
            return null;
        },from.atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime().toString(),
                to.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime().toString());
        List<AnalysisTask> rows=new ArrayList<>();
        for(TaskData task:tasks.values())if(task.included){
            rows.add(new AnalysisTask(task.id,task.client,task.project,task.activity,task.details,task.date,task.estimate,task.planned,task.actual));
            var p=project(projects,task.client,task.project);
            p.planned+=task.planned;p.actual+=task.actual;
            if(task.estimate==null){p.missing++;if(inRange(task.date,from,to))p.unestimatedPlans++;}
            else p.estimated+=task.estimate;
        }
        var grouped=projects.values().stream().sorted(Comparator.comparing((ProjectData p)->p.client).thenComparing(p->p.name))
                .map(p->new AnalysisGroup(p.client,p.name,p.estimated,p.planned,p.actual,p.missing,p.unestimatedPlans,p.unlinked)).toList();
        var weekly=weeks.values().stream().map(w->new AnalysisWeek(w.start,w.planned,w.actual,w.capacity,w.missing,w.unlinked)).toList();
        return new PlanningAnalysis(from,to,hoursMode,rows,grouped,weekly,unlinked[0]);
    }
    private static boolean inRange(LocalDate day,LocalDate from,LocalDate to){return day!=null&&!day.isBefore(from)&&!day.isAfter(to);}
    private static LocalDate monday(LocalDate day){return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));}
    private static String clean(String value){return value==null?"":value;}
    private static ProjectData project(Map<String,ProjectData> projects,String client,String name){
        String key=client.trim().toLowerCase(Locale.ROOT)+"\u0000"+name.trim().toLowerCase(Locale.ROOT);
        return projects.computeIfAbsent(key,k->new ProjectData(client,name));
    }
    private static class TaskData {
        final String id,client,project,activity,details;final LocalDate date;final Double estimate;
        boolean included;double planned,actual;
        TaskData(String id,String client,String project,String activity,String details,LocalDate date,Double estimate){
            this.id=id;this.client=client;this.project=project;this.activity=activity;this.details=details;this.date=date;this.estimate=estimate;
        }
    }
    private static class ProjectData {
        final String client,name;double estimated,planned,actual,unlinked;int missing,unestimatedPlans;
        ProjectData(String client,String name){this.client=client;this.name=name;}
    }
    private static class WeekData {
        final LocalDate start;double planned,actual,capacity,unlinked;int missing;
        WeekData(LocalDate start){this.start=start;}
    }
}
