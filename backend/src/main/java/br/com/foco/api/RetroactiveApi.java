package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

record RetroactiveInput(String taskId, @Size(max=200) String client, @Size(max=200) String project,
        @NotBlank @Size(max=200) String activity, @Size(max=1000) String details,
        @Size(max=200) String consultant, @Size(max=500) String cardReference,
        @NotNull OffsetDateTime startAt, @NotNull OffsetDateTime endAt,
        @NotNull @Min(1) Long focusMinutes,
        @DecimalMin("0") @DecimalMax("1000000") BigDecimal hourlyRate,
        @NotBlank String status, @jakarta.validation.constraints.Pattern(regexp="Normal|Agenda") String category) {}

@RestController
@RequestMapping("/api/sessions/retroactive")
class RetroactiveController {
    private static final Set<String> FINAL_STATUSES=Set.of("Concluída","Encerrada","Interrompida");
    private final JdbcTemplate db;
    private final SessionController sessions;
    private final WorkIntervalRepository workIntervals;
    private final CatalogService catalogs;
    private final ChangeHistoryService history;

    RetroactiveController(JdbcTemplate db,SessionController sessions,WorkIntervalRepository workIntervals,CatalogService catalogs,ChangeHistoryService history){this.db=db;this.sessions=sessions;this.workIntervals=workIntervals;this.catalogs=catalogs;this.history=history;}

    @PostMapping SessionRow create(@Valid @RequestBody RetroactiveInput input){
        if(!FINAL_STATUSES.contains(input.status()))throw new IllegalArgumentException("Resultado retroativo inválido.");
        if(!input.endAt().isAfter(input.startAt()))throw new IllegalArgumentException("O término deve ocorrer depois do início.");
        if(input.endAt().isAfter(OffsetDateTime.now()))throw new IllegalArgumentException("O término retroativo não pode estar no futuro.");
        long intervalSeconds=Duration.between(input.startAt().toInstant(),input.endAt().toInstant()).toSeconds();
        long focusSeconds;
        try{focusSeconds=Math.multiplyExact(input.focusMinutes(),60);}catch(ArithmeticException e){throw new IllegalArgumentException("Tempo de foco inválido.");}
        if(focusSeconds>intervalSeconds)throw new IllegalArgumentException("O foco efetivo não pode exceder o intervalo informado.");
        String client=catalogs.canonical(CatalogType.CLIENT,input.client(),false);
        String project=catalogs.canonical(CatalogType.PROJECT,input.project(),false);
        String activity=catalogs.canonical(CatalogType.ACTIVITY,input.activity(),true);
        String taskId=input.taskId()==null||input.taskId().isBlank()?null:input.taskId();
        if(taskId!=null&&db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,taskId)==0)
            throw new IllegalArgumentException("Tarefa não encontrada.");
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO sessions(id,task_id,client,project,activity,details,consultant,card_reference,start_at,end_at,planned_seconds,focus_seconds,hourly_rate,status,category) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                id,taskId,client,project,activity,clean(input.details()),clean(input.consultant()),clean(input.cardReference()),input.startAt().toString(),input.endAt().toString(),0,focusSeconds,input.hourlyRate()==null?null:input.hourlyRate().toPlainString(),input.status(),input.category()==null||input.category().isBlank()?"Normal":input.category());
        db.update("UPDATE sessions SET rounded_end_at=end_at WHERE id=?",id);
        workIntervals.replaceEstimate(id,input.startAt(),input.endAt());
        SessionRow created=sessions.get(id);history.record("session",id,null,created);return created;
    }

    private static String clean(String value){return value==null?"":value.trim();}
}
