package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

record ChecklistRow(String id,String taskId,String title,boolean completed,int position) {}
record ChecklistInput(@NotBlank @Size(max=200) String title,boolean completed) {}

@RestController
@RequestMapping("/api/tasks/{taskId}/checklist")
class ChecklistController {
    private final JdbcTemplate db;
    private final OrganizationService organization;
    private final ChangeHistoryService history;
    ChecklistController(JdbcTemplate db,OrganizationService organization,ChangeHistoryService history){this.db=db;this.organization=organization;this.history=history;}
    @GetMapping List<ChecklistRow> list(@PathVariable String taskId){
        if(db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,taskId)!=1)throw new IllegalArgumentException("Tarefa não encontrada.");
        return db.query("SELECT * FROM task_checklist WHERE task_id=? ORDER BY position,id",(r,n)->new ChecklistRow(r.getString("id"),taskId,r.getString("title"),r.getBoolean("completed"),r.getInt("position")),taskId);
    }
    @PostMapping @Transactional
    ChecklistRow create(@PathVariable String taskId,@Valid @RequestBody ChecklistInput input){
        organization.requireAvailable(taskId);
        if(list(taskId).size()>=100)throw new IllegalArgumentException("Use até 100 passos por tarefa.");
        String id=UUID.randomUUID().toString();
        int position=db.queryForObject("SELECT coalesce(max(position),0)+1 FROM task_checklist WHERE task_id=?",Integer.class,taskId);
        ChecklistRow row=new ChecklistRow(id,taskId,input.title().trim(),input.completed(),position);
        db.update("INSERT INTO task_checklist(id,task_id,title,completed,position) VALUES(?,?,?,?,?)",id,taskId,row.title(),row.completed()?1:0,position);
        history.record("task",taskId,null,row);return row;
    }
    @PutMapping("/{id}") @Transactional
    ChecklistRow update(@PathVariable String taskId,@PathVariable String id,@Valid @RequestBody ChecklistInput input){
        organization.requireAvailable(taskId);ChecklistRow before=find(taskId,id);
        ChecklistRow row=new ChecklistRow(id,taskId,input.title().trim(),input.completed(),before.position());
        db.update("UPDATE task_checklist SET title=?,completed=? WHERE id=? AND task_id=?",row.title(),row.completed()?1:0,id,taskId);
        history.record("task",taskId,before,row);return row;
    }
    @DeleteMapping("/{id}") @Transactional
    void delete(@PathVariable String taskId,@PathVariable String id){
        organization.requireAvailable(taskId);ChecklistRow before=find(taskId,id);
        db.update("DELETE FROM task_checklist WHERE id=? AND task_id=?",id,taskId);history.record("task",taskId,before,null);
    }
    private ChecklistRow find(String taskId,String id){return list(taskId).stream().filter(r->r.id().equals(id)).findFirst().orElseThrow(()->new IllegalArgumentException("Passo não encontrado nesta tarefa."));}
}
