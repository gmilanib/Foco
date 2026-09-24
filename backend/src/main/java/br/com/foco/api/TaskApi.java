package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

record TaskInput(String client,String project,@NotBlank @Size(max=200) String activity,
        @Size(max=1000) String details,@Size(max=200) String consultant,@Size(max=500) String cardReference,
        @DecimalMin("0") @DecimalMax("1000000") BigDecimal hourlyRate, LocalDate dueDate) {}
record TaskRow(String id,String client,String project,String activity,String details,String consultant,
        String cardReference,BigDecimal hourlyRate,LocalDate dueDate,boolean completed,String state,int entries,double focusSeconds) {}

@RestController
@RequestMapping("/api/tasks")
class TaskController {
    private final JdbcTemplate db;
    TaskController(JdbcTemplate db){this.db=db;}
    @GetMapping List<TaskRow> list(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="Todas") String state){
        return db.query("SELECT t.*, (SELECT count(*) FROM sessions s WHERE s.task_id=t.id) entries, (SELECT coalesce(sum(focus_seconds),0) FROM sessions s WHERE s.task_id=t.id) seconds, (SELECT count(*) FROM sessions s WHERE s.task_id=t.id AND s.status IN ('Em andamento','Pausada')) active FROM tasks t ORDER BY t.updated_at DESC",(r,n)->{
            String actual=r.getInt("completed")==1?"Concluída":r.getInt("entries")>0?"Em andamento":"Pendente";
            String due=r.getString("due_date");
            return new TaskRow(r.getString("id"),r.getString("client"),r.getString("project"),r.getString("activity"),r.getString("details"),r.getString("consultant"),r.getString("card_reference"),decimal(r.getString("hourly_rate")),due==null?null:LocalDate.parse(due),r.getInt("completed")==1,actual,r.getInt("entries"),r.getDouble("seconds"));
        }).stream().filter(t->(state.equals("Todas")||state.equals(t.state()))&&(query.isBlank()||String.join(" ",t.activity(),t.client(),t.project(),t.details(),t.consultant(),t.cardReference()).toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT)))).toList();
    }
    @PostMapping TaskRow create(@Valid @RequestBody TaskInput in){
        OffsetDateTime now=OffsetDateTime.now(); String id=UUID.randomUUID().toString();
        db.update("INSERT INTO tasks(id,client,project,activity,details,consultant,card_reference,hourly_rate,due_date,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,?,?)",id,clean(in.client()),clean(in.project()),in.activity().trim(),clean(in.details()),clean(in.consultant()),clean(in.cardReference()),in.hourlyRate()==null?null:in.hourlyRate().toPlainString(),in.dueDate()==null?null:in.dueDate().toString(),now.toString(),now.toString());
        return get(id);
    }
    @GetMapping("/{id}") TaskRow get(@PathVariable String id){return list("","Todas").stream().filter(t->t.id().equals(id)).findFirst().orElseThrow();}
    @PutMapping("/{id}") TaskRow update(@PathVariable String id,@Valid @RequestBody TaskInput in){
        get(id); db.update("UPDATE tasks SET client=?,project=?,activity=?,details=?,consultant=?,card_reference=?,hourly_rate=?,due_date=?,updated_at=? WHERE id=?",clean(in.client()),clean(in.project()),in.activity().trim(),clean(in.details()),clean(in.consultant()),clean(in.cardReference()),in.hourlyRate()==null?null:in.hourlyRate().toPlainString(),in.dueDate()==null?null:in.dueDate().toString(),OffsetDateTime.now().toString(),id); return get(id);
    }
    @PostMapping("/{id}/complete") TaskRow complete(@PathVariable String id,@RequestBody CompletionInput input){
        TaskRow old=get(id);
        String now=OffsetDateTime.now().toString();
        if(input.completed()){
            int changed=db.update("UPDATE tasks SET completed=1,updated_at=? WHERE id=? AND NOT EXISTS (SELECT 1 FROM sessions WHERE task_id=? AND status IN ('Em andamento','Pausada'))",now,id,id);
            if(changed==0)throw new IllegalArgumentException("Encerre o apontamento ativo antes de concluir a tarefa.");
        }else db.update("UPDATE tasks SET completed=0,updated_at=? WHERE id=?",now,id);
        return get(old.id());
    }
    @DeleteMapping("/{id}") void delete(@PathVariable String id){
        TaskRow task=get(id); if(task.entries()>0)throw new IllegalArgumentException("Tarefas com histórico de apontamentos são preservadas.");
        db.update("DELETE FROM tasks WHERE id=?",id);
    }
    private static String clean(String v){return v==null?"":v.trim();}
    private static BigDecimal decimal(String v){return v==null?null:new BigDecimal(v);}
}
record CompletionInput(boolean completed) {}
