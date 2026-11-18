package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;

@Service
class SessionTasks {
    private final TaskController tasks;
    private final JdbcTemplate db;
    SessionTasks(TaskController tasks,JdbcTemplate db){this.tasks=tasks;this.db=db;}

    void complete(String id){
        if(id!=null&&!id.isBlank()&&!tasks.get(id).completed())tasks.complete(id,new CompletionInput(true));
    }

    String ensure(String id,String client,String project,String activity,String details,String consultant,String cardReference,BigDecimal rate){
        return ensure(id,client,project,activity,details,consultant,cardReference,rate,false);
    }

    String ensure(String id,String client,String project,String activity,String details,String consultant,String cardReference,BigDecimal rate,boolean completeNewTask){
        if(id!=null&&!id.isBlank()){tasks.get(id);return id;}
        LocalDate today=LocalDate.now();
        TaskRow task=tasks.create(new TaskInput(client,project,activity,details,consultant,cardReference,rate,today));
        db.update("INSERT INTO task_plans(task_id,planned_date) VALUES(?,?)",task.id(),today.toString());
        if(completeNewTask)tasks.complete(task.id(),new CompletionInput(true));
        return task.id();
    }
}
