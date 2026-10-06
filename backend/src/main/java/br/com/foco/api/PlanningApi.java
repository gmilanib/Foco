package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

record PlanRow(String taskId,LocalDate plannedDate,int priority,String nextAction,String waitingFor,LocalDate reviewDate) {}
record PlanInput(LocalDate plannedDate,boolean priority,@Size(max=1000) String nextAction,
                 @Size(max=200) String waitingFor,LocalDate reviewDate,@NotBlank String state) {}
record InboxRow(String id,String title,String createdAt) {}
record CaptureInput(@NotBlank @Size(max=1000) String title) {}
record ReviewRow(LocalDate day,String notes,String reviewedAt) {}
record ReviewInput(@Size(max=2000) String notes) {}
record MoveInput(@Min(-1) @Max(1) int direction) {}

@RestController
@RequestMapping("/api/planning")
class PlanningController {
    private final JdbcTemplate db;
    private final TaskController tasks;
    private final ChangeHistoryService history;
    PlanningController(JdbcTemplate db,TaskController tasks,ChangeHistoryService history){
        this.db=db;this.tasks=tasks;this.history=history;
    }
    @GetMapping("/plans") List<PlanRow> plans(){
        return db.query("SELECT p.* FROM task_plans p JOIN tasks t ON t.id=p.task_id",(r,n)->new PlanRow(
                r.getString("task_id"),date(r.getString("planned_date")),r.getInt("priority"),
                r.getString("next_action"),r.getString("waiting_for"),date(r.getString("review_date"))));
    }
    @PutMapping("/plans/{id}") @Transactional
    PlanRow plan(@PathVariable String id,@Valid @RequestBody PlanInput in){
        TaskRow task=tasks.get(id);
        if(task.archived()||task.projectArchived())throw new IllegalArgumentException("Restaure a tarefa e seu projeto antes de planejar.");
        if(in.priority()&&(in.plannedDate()==null||in.state().equals("Concluída")||in.state().equals("Aguardando")))
            throw new IllegalArgumentException("Uma prioridade precisa de data e deve estar disponível para execução.");
        PlanRow before=plans().stream().filter(p->p.taskId().equals(id)).findFirst().orElse(null);
        int rank=0;
        if(in.priority()){
            int count=db.queryForObject("SELECT count(*) FROM task_plans p JOIN tasks t ON t.id=p.task_id WHERE p.planned_date=? AND p.priority>0 AND p.task_id<>? AND t.completed=0 AND coalesce(t.state,'')<>'Aguardando' AND NOT EXISTS(SELECT 1 FROM task_archive a WHERE a.task_id=t.id) AND NOT EXISTS(SELECT 1 FROM project_archive a WHERE a.name_key=(SELECT name_key FROM catalog_projects WHERE name=t.project))",Integer.class,in.plannedDate().toString(),id);
            if(count>=3)throw new IllegalArgumentException("Escolha até três prioridades para esta data.");
            rank=before!=null&&Objects.equals(before.plannedDate(),in.plannedDate())&&before.priority()>0?before.priority():
                    db.queryForObject("SELECT coalesce(max(priority),0)+1 FROM task_plans WHERE planned_date=?",Integer.class,in.plannedDate().toString());
        }
        if(!task.state().equals(in.state()))tasks.changeStatus(id,new TaskStateInput(in.state()));
        db.update("INSERT INTO task_plans(task_id,planned_date,priority,next_action,waiting_for,review_date) VALUES(?,?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET planned_date=excluded.planned_date,priority=excluded.priority,next_action=excluded.next_action,waiting_for=excluded.waiting_for,review_date=excluded.review_date",
                id,str(in.plannedDate()),rank,clean(in.nextAction()),clean(in.waitingFor()),str(in.reviewDate()));
        PlanRow after=new PlanRow(id,in.plannedDate(),rank,clean(in.nextAction()),clean(in.waitingFor()),in.reviewDate());
        history.record("task",id,before,after);return after;
    }
    @PostMapping("/plans/{id}/move") @Transactional
    void move(@PathVariable String id,@Valid @RequestBody MoveInput input){
        PlanRow current=plans().stream().filter(p->p.taskId().equals(id)).findFirst().orElseThrow();
        if(current.plannedDate()==null||current.priority()==0||Math.abs(input.direction())!=1)
            throw new IllegalArgumentException("Selecione uma prioridade e uma direção.");
        List<String> ordered=db.queryForList("SELECT p.task_id FROM task_plans p JOIN tasks t ON t.id=p.task_id WHERE p.planned_date=? AND p.priority>0 AND t.completed=0 AND coalesce(t.state,'')<>'Aguardando' AND NOT EXISTS(SELECT 1 FROM task_archive a WHERE a.task_id=t.id) AND NOT EXISTS(SELECT 1 FROM project_archive a WHERE a.name_key=(SELECT name_key FROM catalog_projects WHERE name=t.project)) ORDER BY p.priority,p.task_id",String.class,str(current.plannedDate()));
        int index=ordered.indexOf(id),target=index+input.direction();
        if(index<0||target<0||target>=ordered.size())return;
        Collections.swap(ordered,index,target);
        for(int i=0;i<ordered.size();i++)db.update("UPDATE task_plans SET priority=? WHERE task_id=?",i+1,ordered.get(i));
    }
    @GetMapping("/inbox") List<InboxRow> inbox(){
        return db.query("SELECT * FROM task_inbox ORDER BY created_at,id",(r,n)->new InboxRow(r.getString("id"),r.getString("title"),r.getString("created_at")));
    }
    @PostMapping("/inbox") InboxRow capture(@Valid @RequestBody CaptureInput input){
        InboxRow row=new InboxRow(UUID.randomUUID().toString(),input.title().trim(),OffsetDateTime.now().toString());
        db.update("INSERT INTO task_inbox(id,title,created_at) VALUES(?,?,?)",row.id(),row.title(),row.createdAt());return row;
    }
    @PostMapping("/inbox/{id}/convert") @Transactional
    TaskRow convert(@PathVariable String id,@Valid @RequestBody TaskInput input){
        if(db.queryForObject("SELECT count(*) FROM task_inbox WHERE id=?",Integer.class,id)!=1)
            throw new IllegalArgumentException("Esta captura já foi organizada ou removida.");
        TaskRow task=tasks.create(input);db.update("DELETE FROM task_inbox WHERE id=?",id);return task;
    }
    @DeleteMapping("/inbox/{id}") void discard(@PathVariable String id){db.update("DELETE FROM task_inbox WHERE id=?",id);}
    @GetMapping("/reviews/{day}") ReviewRow review(@PathVariable LocalDate day){
        return db.query("SELECT * FROM daily_reviews WHERE day=?",r->r.next()?new ReviewRow(day,r.getString("notes"),r.getString("reviewed_at")):new ReviewRow(day,"",null),str(day));
    }
    @PutMapping("/reviews/{day}") ReviewRow review(@PathVariable LocalDate day,@Valid @RequestBody ReviewInput input){
        if(day.isAfter(LocalDate.now()))throw new IllegalArgumentException("Revise o dia atual ou uma data passada.");
        String now=OffsetDateTime.now().toString();
        db.update("INSERT INTO daily_reviews(day,notes,reviewed_at) VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET notes=excluded.notes,reviewed_at=excluded.reviewed_at",str(day),clean(input.notes()),now);
        return review(day);
    }
    private static LocalDate date(String value){return value==null?null:LocalDate.parse(value);}
    private static String str(LocalDate value){return value==null?null:value.toString();}
    private static String clean(String value){return value==null?"":value.trim();}
}
