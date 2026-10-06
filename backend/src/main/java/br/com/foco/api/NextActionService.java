package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class NextActionService {
    private final JdbcTemplate db;
    private final ChangeHistoryService history;
    NextActionService(JdbcTemplate db,ChangeHistoryService history){this.db=db;this.history=history;}
    void save(String taskId,String value){
        if(value==null)return; // Omission preserves the current annotation, including timed finishes.
        if(value.length()>1000)throw new IllegalArgumentException("A próxima ação deve ter até 1000 caracteres.");
        if(taskId==null)throw new IllegalArgumentException("A próxima ação precisa de uma tarefa vinculada.");
        String before=db.query("SELECT next_action FROM task_plans WHERE task_id=?",r->r.next()?r.getString(1):"",taskId);
        String after=value.trim();
        db.update("INSERT INTO task_plans(task_id,next_action) VALUES(?,?) ON CONFLICT(task_id) DO UPDATE SET next_action=excluded.next_action",taskId,after);
        if(!before.equals(after))history.record("task",taskId,java.util.Map.of("nextAction",before),java.util.Map.of("nextAction",after));
    }
}
