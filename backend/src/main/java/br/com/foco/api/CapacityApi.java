package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.math.BigDecimal;

record EstimateInput(@DecimalMin("1") @DecimalMax("100000") @Digits(integer=6,fraction=0) BigDecimal minutes) {}
record EstimateRow(String taskId,Integer minutes) {}

@RestController
@RequestMapping("/api/planning/estimates")
class CapacityController {
    private final JdbcTemplate db;
    private final TaskController tasks;
    private final ChangeHistoryService history;
    CapacityController(JdbcTemplate db,TaskController tasks,ChangeHistoryService history){this.db=db;this.tasks=tasks;this.history=history;}
    @GetMapping List<EstimateRow> list(){
        return db.query("SELECT * FROM task_estimates",(r,n)->new EstimateRow(r.getString("task_id"),r.getInt("minutes")));
    }
    @PutMapping("/{id}") @Transactional
    EstimateRow save(@PathVariable String id,@Valid @RequestBody EstimateInput input){
        tasks.get(id);
        Integer minutes=input.minutes()==null?null:input.minutes().intValueExact();
        EstimateRow before=list().stream().filter(e->e.taskId().equals(id)).findFirst().orElse(new EstimateRow(id,null));
        if(minutes==null)db.update("DELETE FROM task_estimates WHERE task_id=?",id);
        else db.update("INSERT INTO task_estimates(task_id,minutes) VALUES(?,?) ON CONFLICT(task_id) DO UPDATE SET minutes=excluded.minutes",id,minutes);
        EstimateRow after=new EstimateRow(id,minutes);
        if(!before.equals(after))history.record("task",id,before,after);
        return after;
    }
}
