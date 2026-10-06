package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.math.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

record SessionInput(String taskId, String client, String project,
        @NotBlank @Size(max=200) String activity, @Size(max=1000) String details,
        @Size(max=200) String consultant, @Size(max=500) String cardReference,
        @NotNull OffsetDateTime startAt, OffsetDateTime endAt,
        @Min(0) @Max(59940) int plannedSeconds, @DecimalMin("0") @DecimalMax("1000000") BigDecimal hourlyRate,
        @NotBlank String status, @Pattern(regexp="Normal|Agenda") String category) {}
record SessionRow(String id, String taskId, String client, String project, String activity,
        String details, String consultant, String cardReference, OffsetDateTime startAt,
        OffsetDateTime endAt, OffsetDateTime roundedEndAt, int plannedSeconds, double focusSeconds, BigDecimal hourlyRate, String status, String category) {
    BigDecimal cost() { return hourlyRate == null ? null : hourlyRate.multiply(BigDecimal.valueOf(focusSeconds)).divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP); }
}

@RestController
@RequestMapping("/api/sessions")
class SessionController {
    private final JdbcTemplate db;
    private final WorkIntervalRepository workIntervals;
    private final CatalogService catalogs;
    private final ChangeHistoryService history;
    private final NextActionService nextActions;
    private final OrganizationService organization;
    SessionController(JdbcTemplate db, WorkIntervalRepository workIntervals,CatalogService catalogs,ChangeHistoryService history,NextActionService nextActions,OrganizationService organization) { this.db = db; this.workIntervals=workIntervals; this.catalogs=catalogs; this.history=history; this.nextActions=nextActions;this.organization=organization; }
    @GetMapping List<SessionRow> list(@RequestParam Map<String,String> filters) { return find(filters); }
    @GetMapping("/{id}") SessionRow get(@PathVariable String id) { return db.query("SELECT * FROM sessions WHERE id=?", (r,n)->row(r), id).stream().findFirst().orElseThrow(); }
    @DeleteMapping("/{id}") void delete(@PathVariable String id) {
        SessionRow existing=get(id);
        if(Set.of("Em andamento","Pausada").contains(existing.status()))
            throw new IllegalArgumentException("Encerre o apontamento antes de excluí-lo.");
        history.record("session",id,existing,null);
        db.update("DELETE FROM session_work_intervals WHERE session_id=?",id);
        db.update("DELETE FROM sessions WHERE id=?",id);
    }
    @PostMapping SessionRow create(@Valid @RequestBody SessionInput input) {
        String client=catalogs.canonical(CatalogType.CLIENT,input.client(),false);
        String project=catalogs.canonical(CatalogType.PROJECT,input.project(),false);
        String activity=catalogs.canonical(CatalogType.ACTIVITY,input.activity(),true);
        organization.requireProject(project);
        if(input.taskId()!=null){organization.requireAvailable(input.taskId());Integer completed=db.queryForObject("SELECT completed FROM tasks WHERE id=?",Integer.class,input.taskId());if(completed==null||completed==1)throw new IllegalArgumentException("Tarefa ausente ou concluída.");}
        if ("Em andamento".equals(input.status()) && db.queryForObject("SELECT count(*) FROM sessions WHERE status IN ('Em andamento','Pausada')", Integer.class)>0)
            throw new IllegalArgumentException("Encerre ou pause a sessão ativa antes de iniciar outra.");
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO sessions(id,task_id,client,project,activity,details,consultant,card_reference,start_at,end_at,planned_seconds,focus_seconds,hourly_rate,status,category) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                id,input.taskId(),client,project,activity,clean(input.details()),clean(input.consultant()),clean(input.cardReference()),input.startAt().toString(),input.endAt()==null?null:input.endAt().toString(),input.plannedSeconds(),0,input.hourlyRate()==null?null:input.hourlyRate().toPlainString(),input.status(),category(input.category()));
        db.update("UPDATE sessions SET rounded_end_at=end_at WHERE id=?",id);
        if("Em andamento".equals(input.status()))workIntervals.open(id,input.startAt(),"Precisa");
        SessionRow created=get(id);history.record("session",id,null,created);return created;
    }
    @PostMapping("/{id}/pause") SessionRow pause(@PathVariable String id,@RequestBody TickInput tick){
        if(!Double.isFinite(tick.focusSeconds())||tick.focusSeconds()<0)throw new IllegalArgumentException("Tempo inválido.");
        SessionRow before=get(id);OffsetDateTime now=OffsetDateTime.now();db.update("UPDATE sessions SET focus_seconds=?,status='Pausada' WHERE id=? AND status='Em andamento'",tick.focusSeconds(),id);workIntervals.close(id,now);SessionRow updated=get(id);history.record("session",id,before,updated);return updated;
    }
    @PostMapping("/{id}/resume") SessionRow resume(@PathVariable String id){
        get(id);if(db.queryForObject("SELECT count(*) FROM sessions WHERE status='Em andamento'",Integer.class)>0)throw new IllegalArgumentException("Já existe uma sessão em andamento.");
        SessionRow before=get(id);db.update("UPDATE sessions SET status='Em andamento' WHERE id=? AND status='Pausada'",id);workIntervals.open(id,OffsetDateTime.now(),"Precisa");SessionRow updated=get(id);history.record("session",id,before,updated);return updated;
    }
    @PutMapping("/{id}") SessionRow update(@PathVariable String id,@Valid @RequestBody SessionInput input) {
        SessionRow existing=get(id);
        if(!Objects.equals(existing.taskId(),input.taskId()))throw new IllegalArgumentException("Use a ação Vincular tarefa para alterar o vínculo.");
        String client=catalogs.canonical(CatalogType.CLIENT,input.client(),false);
        String project=catalogs.canonical(CatalogType.PROJECT,input.project(),false);
        String activity=catalogs.canonical(CatalogType.ACTIVITY,input.activity(),true);
        if(input.endAt()!=null&&!input.endAt().isAfter(input.startAt()))throw new IllegalArgumentException("O término deve ocorrer depois do início.");
        boolean timeChanged=!input.startAt().toInstant().equals(existing.startAt().toInstant())||!Objects.equals(input.endAt()==null?null:input.endAt().toInstant(),existing.endAt()==null?null:existing.endAt().toInstant());
        double focusSeconds=!timeChanged||input.endAt()==null?existing.focusSeconds():Duration.between(input.startAt().toInstant(),input.endAt().toInstant()).toMillis()/1000.0;
        db.update("UPDATE sessions SET task_id=?,client=?,project=?,activity=?,details=?,consultant=?,card_reference=?,start_at=?,end_at=?,planned_seconds=?,focus_seconds=?,hourly_rate=?,status=?,category=? WHERE id=?",
                input.taskId(),client,project,activity,clean(input.details()),clean(input.consultant()),clean(input.cardReference()),input.startAt().toString(),input.endAt()==null?null:input.endAt().toString(),input.plannedSeconds(),focusSeconds,input.hourlyRate()==null?null:input.hourlyRate().toPlainString(),input.status(),category(input.category()),id);
        if(timeChanged){db.update("UPDATE sessions SET rounded_end_at=end_at WHERE id=?",id);workIntervals.replaceEstimate(id,input.startAt(),input.endAt());if(input.endAt()==null&&"Em andamento".equals(input.status()))workIntervals.open(id,OffsetDateTime.now(),"Precisa");}
        SessionRow updated=get(id);history.record("session",id,existing,updated);return updated;
    }
    @PostMapping("/{id}/tick") SessionRow tick(@PathVariable String id,@RequestBody TickInput tick) {
        if (tick.focusSeconds()<0 || !Double.isFinite(tick.focusSeconds())) throw new IllegalArgumentException("Tempo inválido.");
        get(id); int changed=db.update("UPDATE sessions SET focus_seconds=? WHERE id=? AND status IN ('Em andamento','Pausada')", tick.focusSeconds(), id);if(changed>0)workIntervals.tick(id,OffsetDateTime.now());return get(id);
    }
    @PostMapping("/{id}/finish") @org.springframework.transaction.annotation.Transactional public SessionRow finish(@PathVariable String id,@RequestBody FinishInput finish) {
        if (!Set.of("Concluída","Encerrada","Interrompida").contains(finish.status()) || !Double.isFinite(finish.focusSeconds()) || finish.focusSeconds()<0) throw new IllegalArgumentException("Resultado ou tempo inválido.");
        SessionRow before=get(id);
        if(!Set.of("Em andamento","Pausada").contains(before.status()))throw new IllegalArgumentException("O apontamento já foi finalizado.");
        nextActions.save(before.taskId(),finish.nextAction());
        OffsetDateTime now=OffsetDateTime.now();
        double roundedFocus=Math.ceil(finish.focusSeconds()/300.0)*300;
        OffsetDateTime roundedEnd=now.plusNanos(Math.round((roundedFocus-finish.focusSeconds())*1_000_000_000));
        db.update("UPDATE sessions SET status=?,end_at=?,rounded_end_at=?,focus_seconds=? WHERE id=?",finish.status(),now.toString(),roundedEnd.toString(),roundedFocus,id);workIntervals.close(id,now);SessionRow updated=get(id);history.record("session",id,before,updated);return updated;
    }
    @GetMapping(value="/export.csv", produces="text/csv;charset=UTF-8") String csv(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="false") boolean showValues,@RequestParam(defaultValue="real") String endMode,@RequestParam(defaultValue="rounded") String hoursMode) {
        if(!Set.of("real","rounded").contains(endMode))throw new IllegalArgumentException("Tipo de término inválido.");
        var rows=find(Map.of("query",query,"hoursMode",hoursMode));
        return "\uFEFFCliente;Projeto;Consultor_solicitante;Card_ou_Link;Atividade;Detalhamento;Inicio;Termino;Duracao_planejada_segundos;Tempo_foco_segundos;Resultado;Categoria;Base_horas;Base_termino"+(showValues?";Valor_hora_BRL;Custo_BRL":"")+"\r\n"+rows.stream().map(s->line(s,showValues,endMode,hoursMode)).collect(Collectors.joining("\r\n"));
    }
    private static String line(SessionRow s,boolean values,String endMode,String hoursMode) {
        double seconds=HoursBasis.seconds(s,hoursMode);
        List<String> cells=new ArrayList<>(List.of(cell(s.client()),cell(s.project()),cell(s.consultant()),cell(s.cardReference()),cell(s.activity()),cell(s.details()),cell(s.startAt().toString()),cell(s.endAt()==null?"":("rounded".equals(endMode)?s.roundedEndAt():s.endAt()).toString()),Integer.toString(s.plannedSeconds()),Double.toString(seconds),cell(s.status()),cell(s.category()),cell(hoursMode),cell(endMode)));
        if(values){ cells.add(s.hourlyRate()==null?"":s.hourlyRate().toPlainString()); cells.add(s.hourlyRate()==null?"":s.hourlyRate().multiply(BigDecimal.valueOf(seconds)).divide(BigDecimal.valueOf(3600),2,RoundingMode.HALF_UP).toPlainString()); }
        return String.join(";",cells);
    }
    private static String cell(String text){ String v=clean(text); if(!v.isEmpty() && "=+-@".indexOf(v.stripLeading().charAt(0))>=0)v="'"+v; return "\""+v.replace("\"","\"\"")+"\""; }
    private static String clean(String value){return value==null?"":value.trim();}
    private static String category(String value){return value==null||value.isBlank()?"Normal":value;}
    private List<SessionRow> find(Map<String,String> filters) {
        String seconds=HoursBasis.sql(filters.getOrDefault("hoursMode","rounded"));
        StringBuilder sql=new StringBuilder("SELECT * FROM sessions WHERE 1=1"); List<Object> args=new ArrayList<>();
        for(String key:List.of("query","client","project","activity","consultant","status","category")) {
            String value=filters.getOrDefault(key,"").trim(); if(value.isBlank())continue;
            if(key.equals("query")){sql.append(" AND (lower(client||' '||project||' '||activity||' '||details||' '||consultant||' '||card_reference) LIKE ?)");args.add("%"+value.toLowerCase(Locale.ROOT)+"%");}
            else {sql.append(" AND lower(").append(key).append(") LIKE ?");args.add("%"+value.toLowerCase(Locale.ROOT)+"%");}
        }
        String from=filters.getOrDefault("from","").trim(),to=filters.getOrDefault("to","").trim();
        if(!from.isBlank()){sql.append(" AND start_at>=?");args.add(from);}
        if(!to.isBlank()){sql.append(" AND start_at<?");try{args.add(LocalDate.parse(to).plusDays(1).toString());}catch(DateTimeException e){args.add(to);}}
        numericFilter(sql,args,seconds,filters.get("minHours"),true,3600);numericFilter(sql,args,seconds,filters.get("maxHours"),false,3600);
        numericFilter(sql,args,"("+seconds+"*CAST(COALESCE(hourly_rate,'0') AS REAL)/3600)",filters.get("minValue"),true,1);numericFilter(sql,args,"("+seconds+"*CAST(COALESCE(hourly_rate,'0') AS REAL)/3600)",filters.get("maxValue"),false,1);
        String sort=switch(filters.getOrDefault("sort","recent")){case "oldest"->"start_at ASC";case "focus"->seconds+" DESC";case "client"->"client COLLATE NOCASE, project COLLATE NOCASE, start_at DESC";default->"start_at DESC";};
        sql.append(" ORDER BY ").append(sort);return db.query(sql.toString(),(r,n)->row(r),args.toArray());
    }
    private static void numericFilter(StringBuilder sql,List<Object> args,String column,String raw,boolean minimum,double divisor){
        if(raw==null||raw.isBlank())return;try{double value=Double.parseDouble(raw);if(!Double.isFinite(value)||value<0)throw new NumberFormatException();sql.append(" AND ").append(column).append(minimum?">=":"<=").append("?");args.add(value*divisor);}catch(NumberFormatException e){throw new IllegalArgumentException("Filtro numérico inválido.");}
    }
    private static SessionRow row(java.sql.ResultSet r) throws java.sql.SQLException {
        String rate=r.getString("hourly_rate"); String end=r.getString("end_at"); String rounded=r.getString("rounded_end_at");
        return new SessionRow(r.getString("id"),r.getString("task_id"),r.getString("client"),r.getString("project"),r.getString("activity"),r.getString("details"),r.getString("consultant"),r.getString("card_reference"),OffsetDateTime.parse(r.getString("start_at")),end==null?null:OffsetDateTime.parse(end),rounded==null?(end==null?null:OffsetDateTime.parse(end)):OffsetDateTime.parse(rounded),r.getInt("planned_seconds"),r.getDouble("focus_seconds"),rate==null?null:new BigDecimal(rate),r.getString("status"),r.getString("category"));
    }
}
record TickInput(double focusSeconds) {}
record FinishInput(String status,double focusSeconds,String nextAction) {
    FinishInput(String status,double focusSeconds){this(status,focusSeconds,null);}
}
