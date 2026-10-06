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
        String cardReference,BigDecimal hourlyRate,LocalDate dueDate,boolean completed,String state,int entries,double focusSeconds,double realFocusSeconds,boolean archived,boolean projectArchived,int checklistTotal,int checklistCompleted) {}

@RestController
@RequestMapping("/api/tasks")
class TaskController {
    private final JdbcTemplate db;
    private final CatalogService catalogs;
    private final ChangeHistoryService history;
    private final OrganizationService organization;
    TaskController(JdbcTemplate db,CatalogService catalogs,ChangeHistoryService history,OrganizationService organization){this.db=db;this.catalogs=catalogs;this.history=history;this.organization=organization;}
    @GetMapping List<TaskRow> listApi(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="Todas") String state,@RequestParam(defaultValue="active") String archive){
        if(!Set.of("active","archived","all").contains(archive))throw new IllegalArgumentException("Filtro de arquivo inválido.");
        return list(query,state).stream().filter(t->archive.equals("all")||(archive.equals("archived")== (t.archived()||t.projectArchived()))).toList();
    }
    List<TaskRow> list(String query,String state){
        return db.query("SELECT t.*, EXISTS(SELECT 1 FROM task_archive a WHERE a.task_id=t.id) archived, EXISTS(SELECT 1 FROM project_archive a WHERE a.name_key=(SELECT name_key FROM catalog_projects WHERE name=t.project)) project_archived, (SELECT count(*) FROM task_checklist c WHERE c.task_id=t.id) checklist_total, (SELECT count(*) FROM task_checklist c WHERE c.task_id=t.id AND c.completed=1) checklist_completed, (SELECT count(*) FROM sessions s WHERE s.task_id=t.id) entries, (SELECT coalesce(sum(focus_seconds),0) FROM sessions s WHERE s.task_id=t.id) seconds, (SELECT coalesce(sum("+HoursBasis.sql("real")+"),0) FROM sessions s WHERE s.task_id=t.id) real_seconds, (SELECT count(*) FROM sessions s WHERE s.task_id=t.id AND s.status IN ('Em andamento','Pausada')) active FROM tasks t ORDER BY t.updated_at DESC",(r,n)->{
            String actual=Optional.ofNullable(r.getString("state")).orElse(r.getInt("completed")==1?"Concluída":r.getInt("entries")>0?"Em andamento":"Pendente");
            String due=r.getString("due_date");
            return new TaskRow(r.getString("id"),r.getString("client"),r.getString("project"),r.getString("activity"),r.getString("details"),r.getString("consultant"),r.getString("card_reference"),decimal(r.getString("hourly_rate")),due==null?null:LocalDate.parse(due),r.getInt("completed")==1,actual,r.getInt("entries"),r.getDouble("seconds"),r.getDouble("real_seconds"),r.getBoolean("archived"),r.getBoolean("project_archived"),r.getInt("checklist_total"),r.getInt("checklist_completed"));
        }).stream().filter(t->(state.equals("Todas")||state.equals(t.state()))&&(query.isBlank()||String.join(" ",t.activity(),t.client(),t.project(),t.details(),t.consultant(),t.cardReference()).toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT)))).toList();
    }
    @PostMapping TaskRow create(@Valid @RequestBody TaskInput in){
        String client=catalogs.canonical(CatalogType.CLIENT,in.client(),false),project=catalogs.canonical(CatalogType.PROJECT,in.project(),false),activity=catalogs.canonical(CatalogType.ACTIVITY,in.activity(),true);
        organization.requireProject(project);
        OffsetDateTime now=OffsetDateTime.now(); String id=UUID.randomUUID().toString();
        db.update("INSERT INTO tasks(id,client,project,activity,details,consultant,card_reference,hourly_rate,due_date,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,?,?)",id,client,project,activity,clean(in.details()),clean(in.consultant()),clean(in.cardReference()),in.hourlyRate()==null?null:in.hourlyRate().toPlainString(),in.dueDate()==null?null:in.dueDate().toString(),now.toString(),now.toString());
        TaskRow created=get(id);history.record("task",id,null,created);return created;
    }
    @GetMapping("/{id}") TaskRow get(@PathVariable String id){return list("","Todas").stream().filter(t->t.id().equals(id)).findFirst().orElseThrow();}
    @PutMapping("/{id}") TaskRow update(@PathVariable String id,@Valid @RequestBody TaskInput in){
        TaskRow before=get(id);String client=catalogs.canonical(CatalogType.CLIENT,in.client(),false),project=catalogs.canonical(CatalogType.PROJECT,in.project(),false),activity=catalogs.canonical(CatalogType.ACTIVITY,in.activity(),true); if(!before.project().equals(project))organization.requireProject(project); db.update("UPDATE tasks SET client=?,project=?,activity=?,details=?,consultant=?,card_reference=?,hourly_rate=?,due_date=?,updated_at=? WHERE id=?",client,project,activity,clean(in.details()),clean(in.consultant()),clean(in.cardReference()),in.hourlyRate()==null?null:in.hourlyRate().toPlainString(),in.dueDate()==null?null:in.dueDate().toString(),OffsetDateTime.now().toString(),id);TaskRow updated=get(id);history.record("task",id,before,updated);return updated;
    }
    @PostMapping("/{id}/status") @org.springframework.transaction.annotation.Transactional
    TaskRow changeStatus(@PathVariable String id,@RequestBody TaskStateInput input){
        if(input.state()==null||!Set.of("Pendente","Em andamento","Concluída","Aguardando").contains(input.state()))throw new IllegalArgumentException("Estado de tarefa inválido.");
        TaskRow before=get(id);
        if(input.state().equals("Concluída")&&db.queryForObject("SELECT count(*) FROM sessions WHERE task_id=? AND status IN ('Em andamento','Pausada')",Integer.class,id)>0)
            throw new IllegalArgumentException("Encerre o apontamento ativo antes de concluir a tarefa.");
        db.update("UPDATE tasks SET state=?,completed=?,updated_at=? WHERE id=?",input.state(),input.state().equals("Concluída")?1:0,OffsetDateTime.now().toString(),id);
        if(Set.of("Concluída","Aguardando").contains(input.state()))db.update("UPDATE task_plans SET priority=0 WHERE task_id=?",id);
        TaskRow updated=get(id);history.record("task",id,before,updated);return updated;
    }
    @PostMapping("/{id}/complete") @org.springframework.transaction.annotation.Transactional
    TaskRow complete(@PathVariable String id,@RequestBody CompletionInput input){
        TaskRow old=get(id);
        String now=OffsetDateTime.now().toString();
        String state=input.completed()?"Concluída":old.entries()>0?"Em andamento":"Pendente";
        if(input.completed()){
            int changed=db.update("UPDATE tasks SET completed=1,state=?,updated_at=? WHERE id=? AND NOT EXISTS (SELECT 1 FROM sessions WHERE task_id=? AND status IN ('Em andamento','Pausada'))",state,now,id,id);
            if(changed==0)throw new IllegalArgumentException("Encerre o apontamento ativo antes de concluir a tarefa.");
        }else db.update("UPDATE tasks SET completed=0,state=?,updated_at=? WHERE id=?",state,now,id);
        if(input.completed())db.update("UPDATE task_plans SET priority=0 WHERE task_id=?",id);
        TaskRow updated=get(old.id());history.record("task",id,old,updated);return updated;
    }
    @DeleteMapping("/{id}") void delete(@PathVariable String id){
        TaskRow task=get(id); if(task.entries()>0)throw new IllegalArgumentException("Tarefas com histórico de apontamentos são preservadas.");history.record("task",id,task,null);
        db.update("DELETE FROM tasks WHERE id=?",id);
    }
    private static String clean(String v){return v==null?"":v.trim();}
    private static BigDecimal decimal(String v){return v==null?null:new BigDecimal(v);}
}
record CompletionInput(boolean completed) {}
record TaskStateInput(String state) {}
