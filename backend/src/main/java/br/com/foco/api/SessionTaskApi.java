package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Objects;
import java.util.Set;

record SessionTaskInput(String taskId) {}

@RestController
@RequestMapping("/api/sessions")
class SessionTaskController {
    private final JdbcTemplate db;
    private final SessionController sessions;
    private final TaskController tasks;
    private final ChangeHistoryService history;
    SessionTaskController(JdbcTemplate db,SessionController sessions,TaskController tasks,ChangeHistoryService history){
        this.db=db;this.sessions=sessions;this.tasks=tasks;this.history=history;
    }
    @PutMapping("/{id}/task") @Transactional
    public SessionRow link(@PathVariable String id,@RequestBody SessionTaskInput input){
        SessionRow before=sessions.get(id);
        if(Set.of("Em andamento","Pausada").contains(before.status()))
            throw new IllegalArgumentException("Encerre o apontamento antes de alterar o vínculo.");
        String target=input.taskId()==null||input.taskId().isBlank()?null:input.taskId().trim();
        if(target!=null&&db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,target)==0)
            throw new IllegalArgumentException("Tarefa não encontrada.");
        if(Objects.equals(before.taskId(),target))return before;
        TaskRow oldTask=before.taskId()==null?null:tasks.get(before.taskId());
        TaskRow newTask=target==null?null:tasks.get(target);
        db.update("UPDATE sessions SET task_id=? WHERE id=?",target,id);
        SessionRow after=sessions.get(id);
        history.record("session",id,before,after);
        if(oldTask!=null)history.record("task",oldTask.id(),oldTask,tasks.get(oldTask.id()));
        if(newTask!=null)history.record("task",newTask.id(),newTask,tasks.get(newTask.id()));
        return after;
    }
}
