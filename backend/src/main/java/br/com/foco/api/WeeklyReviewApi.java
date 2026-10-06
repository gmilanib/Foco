package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;

record WeeklyReviewRow(LocalDate weekStart,LocalDate weekEnd,List<InboxRow> oldCaptures,
                      List<String> withoutNextAction,List<String> unexecuted,List<String> overdueDependencies) {}

@RestController
@RequestMapping("/api/planning/weekly-review")
class WeeklyReviewController {
    private final JdbcTemplate db;
    private final PlanningController planning;
    private final TaskController tasks;
    WeeklyReviewController(JdbcTemplate db,PlanningController planning,TaskController tasks){this.db=db;this.planning=planning;this.tasks=tasks;}
    @GetMapping WeeklyReviewRow review(@RequestParam LocalDate day){
        LocalDate start=day.minusDays(day.getDayOfWeek().getValue()-1);
        Map<String,PlanRow> plans=new HashMap<>();planning.plans().forEach(p->plans.put(p.taskId(),p));
        List<String> missing=new ArrayList<>(),unexecuted=new ArrayList<>(),dependencies=new ArrayList<>();
        for(TaskRow task:tasks.list("","Todas")){
            if(task.completed()||task.archived()||task.projectArchived())continue;
            PlanRow plan=plans.get(task.id());
            if(plan==null||plan.nextAction().isBlank())missing.add(task.id());
            if(plan==null)continue;
            if(task.state().equals("Aguardando")){
                if(plan.reviewDate()!=null&&!plan.reviewDate().isAfter(day))dependencies.add(task.id());
            }else if(plan.plannedDate()!=null&&plan.plannedDate().isBefore(day)){
                boolean executed=Boolean.TRUE.equals(db.query("SELECT start_at FROM sessions WHERE task_id=? AND focus_seconds>0",r->{
                    while(r.next()){
                        LocalDate recorded=OffsetDateTime.parse(r.getString(1)).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
                        if(!recorded.isBefore(plan.plannedDate())&&!recorded.isAfter(day))return true;
                    }return false;
                },task.id()));
                if(!executed)unexecuted.add(task.id());
            }
        }
        List<InboxRow> old=planning.inbox().stream().filter(i->!OffsetDateTime.parse(i.createdAt()).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate().isAfter(day.minusDays(7))).toList();
        return new WeeklyReviewRow(start,start.plusDays(6),old,missing,unexecuted,dependencies);
    }
}
