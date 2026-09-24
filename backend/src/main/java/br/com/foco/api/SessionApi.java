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
        OffsetDateTime endAt, int plannedSeconds, double focusSeconds, BigDecimal hourlyRate, String status, String category) {
    BigDecimal cost() { return hourlyRate == null ? null : hourlyRate.multiply(BigDecimal.valueOf(focusSeconds)).divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP); }
}

@RestController
@RequestMapping("/api/sessions")
class SessionController {
    private final JdbcTemplate db;
    SessionController(JdbcTemplate db) { this.db = db; }
    @GetMapping List<SessionRow> list(@RequestParam Map<String,String> filters) { return find(filters); }
    @GetMapping("/{id}") SessionRow get(@PathVariable String id) { return db.query("SELECT * FROM sessions WHERE id=?", (r,n)->row(r), id).stream().findFirst().orElseThrow(); }
    @DeleteMapping("/{id}") void delete(@PathVariable String id) {
        SessionRow existing=get(id);
        if(Set.of("Em andamento","Pausada").contains(existing.status()))
            throw new IllegalArgumentException("Encerre o apontamento antes de excluí-lo.");
        db.update("DELETE FROM sessions WHERE id=?",id);
    }
    @PostMapping SessionRow create(@Valid @RequestBody SessionInput input) {
        if(input.taskId()!=null){Integer completed=db.queryForObject("SELECT completed FROM tasks WHERE id=?",Integer.class,input.taskId());if(completed==null||completed==1)throw new IllegalArgumentException("Tarefa ausente ou concluída.");}
        if ("Em andamento".equals(input.status()) && db.queryForObject("SELECT count(*) FROM sessions WHERE status IN ('Em andamento','Pausada')", Integer.class)>0)
            throw new IllegalArgumentException("Encerre ou pause a sessão ativa antes de iniciar outra.");
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO sessions(id,task_id,client,project,activity,details,consultant,card_reference,start_at,end_at,planned_seconds,focus_seconds,hourly_rate,status,category) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                id,input.taskId(),clean(input.client()),clean(input.project()),input.activity().trim(),clean(input.details()),clean(input.consultant()),clean(input.cardReference()),input.startAt().toString(),input.endAt()==null?null:input.endAt().toString(),input.plannedSeconds(),0,input.hourlyRate()==null?null:input.hourlyRate().toPlainString(),input.status(),category(input.category()));
        return get(id);
    }
    @PostMapping("/{id}/pause") SessionRow pause(@PathVariable String id,@RequestBody TickInput tick){
        if(!Double.isFinite(tick.focusSeconds())||tick.focusSeconds()<0)throw new IllegalArgumentException("Tempo inválido.");
        get(id);db.update("UPDATE sessions SET focus_seconds=?,status='Pausada' WHERE id=? AND status='Em andamento'",tick.focusSeconds(),id);return get(id);
    }
    @PostMapping("/{id}/resume") SessionRow resume(@PathVariable String id){
        get(id);if(db.queryForObject("SELECT count(*) FROM sessions WHERE status='Em andamento'",Integer.class)>0)throw new IllegalArgumentException("Já existe uma sessão em andamento.");
        db.update("UPDATE sessions SET status='Em andamento' WHERE id=? AND status='Pausada'",id);return get(id);
    }
    @PutMapping("/{id}") SessionRow update(@PathVariable String id,@Valid @RequestBody SessionInput input) {
        SessionRow existing=get(id);
        if(input.endAt()!=null&&!input.endAt().isAfter(input.startAt()))throw new IllegalArgumentException("O término deve ocorrer depois do início.");
        boolean timeChanged=!input.startAt().toInstant().equals(existing.startAt().toInstant())||!Objects.equals(input.endAt()==null?null:input.endAt().toInstant(),existing.endAt()==null?null:existing.endAt().toInstant());
        double focusSeconds=!timeChanged||input.endAt()==null?existing.focusSeconds():Duration.between(input.startAt().toInstant(),input.endAt().toInstant()).toMillis()/1000.0;
        db.update("UPDATE sessions SET task_id=?,client=?,project=?,activity=?,details=?,consultant=?,card_reference=?,start_at=?,end_at=?,planned_seconds=?,focus_seconds=?,hourly_rate=?,status=?,category=? WHERE id=?",
                input.taskId(),clean(input.client()),clean(input.project()),input.activity().trim(),clean(input.details()),clean(input.consultant()),clean(input.cardReference()),input.startAt().toString(),input.endAt()==null?null:input.endAt().toString(),input.plannedSeconds(),focusSeconds,input.hourlyRate()==null?null:input.hourlyRate().toPlainString(),input.status(),category(input.category()),id);
        return get(id);
    }
    @PostMapping("/{id}/tick") SessionRow tick(@PathVariable String id,@RequestBody TickInput tick) {
        if (tick.focusSeconds()<0 || !Double.isFinite(tick.focusSeconds())) throw new IllegalArgumentException("Tempo inválido.");
        get(id); db.update("UPDATE sessions SET focus_seconds=? WHERE id=?", tick.focusSeconds(), id); return get(id);
    }
    @PostMapping("/{id}/finish") SessionRow finish(@PathVariable String id,@RequestBody FinishInput finish) {
        if (!Set.of("Concluída","Encerrada","Interrompida").contains(finish.status()) || !Double.isFinite(finish.focusSeconds()) || finish.focusSeconds()<0) throw new IllegalArgumentException("Resultado ou tempo inválido.");
        get(id); db.update("UPDATE sessions SET status=?,end_at=?,focus_seconds=? WHERE id=?",finish.status(),OffsetDateTime.now().toString(),Math.ceil(finish.focusSeconds()/300.0)*300,id); return get(id);
    }
    @GetMapping(value="/export.csv", produces="text/csv;charset=UTF-8") String csv(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="false") boolean showValues) {
        var rows=find(Map.of("query",query));
        return "\uFEFFCliente;Projeto;Consultor_solicitante;Card_ou_Link;Atividade;Detalhamento;Inicio;Termino;Duracao_planejada_segundos;Tempo_foco_segundos;Resultado;Categoria"+(showValues?";Valor_hora_BRL;Custo_BRL":"")+"\r\n"+rows.stream().map(s->line(s,showValues)).collect(Collectors.joining("\r\n"));
    }
    private static String line(SessionRow s,boolean values) {
        List<String> cells=new ArrayList<>(List.of(cell(s.client()),cell(s.project()),cell(s.consultant()),cell(s.cardReference()),cell(s.activity()),cell(s.details()),cell(s.startAt().toString()),cell(s.endAt()==null?"":s.endAt().toString()),Integer.toString(s.plannedSeconds()),Double.toString(s.focusSeconds()),cell(s.status()),cell(s.category())));
        if(values){ cells.add(s.hourlyRate()==null?"":s.hourlyRate().toPlainString()); cells.add(s.cost()==null?"":s.cost().toPlainString()); }
        return String.join(";",cells);
    }
    private static String cell(String text){ String v=clean(text); if(!v.isEmpty() && "=+-@".indexOf(v.stripLeading().charAt(0))>=0)v="'"+v; return "\""+v.replace("\"","\"\"")+"\""; }
    private static String clean(String value){return value==null?"":value.trim();}
    private static String category(String value){return value==null||value.isBlank()?"Normal":value;}
    private List<SessionRow> find(Map<String,String> filters) {
        StringBuilder sql=new StringBuilder("SELECT * FROM sessions WHERE 1=1"); List<Object> args=new ArrayList<>();
        for(String key:List.of("query","client","project","activity","consultant","status","category")) {
            String value=filters.getOrDefault(key,"").trim(); if(value.isBlank())continue;
            if(key.equals("query")){sql.append(" AND (lower(client||' '||project||' '||activity||' '||details||' '||consultant||' '||card_reference) LIKE ?)");args.add("%"+value.toLowerCase(Locale.ROOT)+"%");}
            else {sql.append(" AND lower(").append(key).append(") LIKE ?");args.add("%"+value.toLowerCase(Locale.ROOT)+"%");}
        }
        String from=filters.getOrDefault("from","").trim(),to=filters.getOrDefault("to","").trim();
        if(!from.isBlank()){sql.append(" AND start_at>=?");args.add(from);}
        if(!to.isBlank()){sql.append(" AND start_at<?");try{args.add(LocalDate.parse(to).plusDays(1).toString());}catch(DateTimeException e){args.add(to);}}
        numericFilter(sql,args,"focus_seconds",filters.get("minHours"),true,3600);numericFilter(sql,args,"focus_seconds",filters.get("maxHours"),false,3600);
        numericFilter(sql,args,"(focus_seconds*CAST(COALESCE(hourly_rate,'0') AS REAL)/3600)",filters.get("minValue"),true,1);numericFilter(sql,args,"(focus_seconds*CAST(COALESCE(hourly_rate,'0') AS REAL)/3600)",filters.get("maxValue"),false,1);
        String sort=switch(filters.getOrDefault("sort","recent")){case "oldest"->"start_at ASC";case "focus"->"focus_seconds DESC";case "client"->"client COLLATE NOCASE, project COLLATE NOCASE, start_at DESC";default->"start_at DESC";};
        sql.append(" ORDER BY ").append(sort);return db.query(sql.toString(),(r,n)->row(r),args.toArray());
    }
    private static void numericFilter(StringBuilder sql,List<Object> args,String column,String raw,boolean minimum,double divisor){
        if(raw==null||raw.isBlank())return;try{double value=Double.parseDouble(raw);if(!Double.isFinite(value)||value<0)throw new NumberFormatException();sql.append(" AND ").append(column).append(minimum?">=":"<=").append("?");args.add(value*divisor);}catch(NumberFormatException e){throw new IllegalArgumentException("Filtro numérico inválido.");}
    }
    private static SessionRow row(java.sql.ResultSet r) throws java.sql.SQLException {
        String rate=r.getString("hourly_rate"); String end=r.getString("end_at");
        return new SessionRow(r.getString("id"),r.getString("task_id"),r.getString("client"),r.getString("project"),r.getString("activity"),r.getString("details"),r.getString("consultant"),r.getString("card_reference"),OffsetDateTime.parse(r.getString("start_at")),end==null?null:OffsetDateTime.parse(end),r.getInt("planned_seconds"),r.getDouble("focus_seconds"),rate==null?null:new BigDecimal(rate),r.getString("status"),r.getString("category"));
    }
}
record TickInput(double focusSeconds) {}
record FinishInput(String status,double focusSeconds) {}
