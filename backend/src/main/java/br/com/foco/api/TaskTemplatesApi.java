package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

record TemplateRow(String id,String sourceId,String name,String recurrence,LocalDate nextDate,
                   boolean paused,List<Integer> weekdays,Integer monthDay,boolean sourceArchived) {}
record TemplateInput(@NotBlank String sourceId,@NotBlank @Size(max=200) String name,
                     @NotBlank String recurrence,LocalDate nextDate,boolean paused,List<Integer> weekdays,Integer monthDay) {
    TemplateInput(String sourceId,String name,String recurrence,LocalDate nextDate){this(sourceId,name,recurrence,nextDate,false,List.of(),null);}
}

@RestController
@RequestMapping("/api/planning/templates")
class TaskTemplatesController {
    private final JdbcTemplate db;
    private final TaskController tasks;
    private final PlanningController planning;
    private final OrganizationService organization;
    private final ChangeHistoryService history;
    TaskTemplatesController(JdbcTemplate db,TaskController tasks,PlanningController planning,OrganizationService organization,ChangeHistoryService history){
        this.db=db;this.tasks=tasks;this.planning=planning;this.organization=organization;this.history=history;
    }
    @GetMapping List<TemplateRow> list(){
        return db.query("SELECT m.*,coalesce(o.paused,0) paused,coalesce(o.weekdays,'') weekdays,o.month_day FROM task_templates m LEFT JOIN template_options o ON o.template_id=m.id JOIN tasks t ON t.id=m.source_id ORDER BY m.name,m.id",(r,n)->{
            String stored=r.getString("weekdays");
            List<Integer> days=stored.isBlank()?List.of():Arrays.stream(stored.split(",")).map(Integer::valueOf).toList();
            return new TemplateRow(r.getString("id"),r.getString("source_id"),r.getString("name"),r.getString("recurrence"),r.getString("next_date")==null?null:LocalDate.parse(r.getString("next_date")),r.getBoolean("paused"),days,(Integer)r.getObject("month_day"),organization.taskArchived(r.getString("source_id")));
        });
    }
    @PostMapping @Transactional TemplateRow create(@Valid @RequestBody TemplateInput input){return save(UUID.randomUUID().toString(),input,null);}
    @PutMapping("/{id}") @Transactional TemplateRow update(@PathVariable String id,@Valid @RequestBody TemplateInput input){return save(id,input,find(id));}
    private TemplateRow save(String id,TemplateInput input,TemplateRow before){
        tasks.get(input.sourceId());
        if(before==null||!before.sourceId().equals(input.sourceId()))organization.requireAvailable(input.sourceId());
        List<Integer> days=RecurrenceSchedule.weekdays(input.recurrence(),input.weekdays());
        Integer monthDay=input.recurrence().equals("monthly")?input.monthDay():null;
        RecurrenceSchedule.validate(input.recurrence(),input.nextDate(),days,monthDay);
        String date=input.recurrence().equals("none")?null:input.nextDate().toString();
        db.update("INSERT INTO task_templates(id,source_id,name,recurrence,next_date) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_id=excluded.source_id,name=excluded.name,recurrence=excluded.recurrence,next_date=excluded.next_date",id,input.sourceId(),input.name().trim(),input.recurrence(),date);
        db.update("INSERT INTO template_options(template_id,paused,weekdays,month_day) VALUES(?,?,?,?) ON CONFLICT(template_id) DO UPDATE SET paused=excluded.paused,weekdays=excluded.weekdays,month_day=excluded.month_day",id,input.paused()?1:0,String.join(",",days.stream().map(String::valueOf).toList()),monthDay);
        TemplateRow after=find(id);history.record("task",input.sourceId(),before,after);return after;
    }
    @DeleteMapping("/{id}") @Transactional void delete(@PathVariable String id){TemplateRow before=find(id);db.update("DELETE FROM task_templates WHERE id=?",id);history.record("task",before.sourceId(),before,null);}
    @PostMapping("/{id}/use") @Transactional TaskRow use(@PathVariable String id){return duplicate(find(id).sourceId());}
    @PostMapping("/generate") @Transactional List<TaskRow> generate(){return generateFor(LocalDate.now());}
    List<TaskRow> generateFor(LocalDate today){
        List<TaskRow> created=new ArrayList<>();
        for(TemplateRow template:list()){
            if(template.paused()||template.sourceArchived()||template.nextDate()==null||template.nextDate().isAfter(today)||template.recurrence().equals("none"))continue;
            LocalDate next=RecurrenceSchedule.next(template,today);
            int changed=db.update("UPDATE task_templates SET next_date=? WHERE id=? AND next_date=?",next.toString(),template.id(),template.nextDate().toString());
            if(changed==0)continue;
            TaskRow task=duplicate(template.sourceId());
            planning.plan(task.id(),new PlanInput(today,false,"","",null,"Pendente"));created.add(task);
        }
        return created;
    }
    private TemplateRow find(String id){return list().stream().filter(t->t.id().equals(id)).findFirst().orElseThrow(()->new IllegalArgumentException("Modelo não encontrado."));}
    private TaskRow duplicate(String id){
        organization.requireAvailable(id);TaskRow source=tasks.get(id);
        return tasks.create(new TaskInput(source.client(),source.project(),source.activity(),source.details(),source.consultant(),source.cardReference(),source.hourlyRate(),null));
    }
}
