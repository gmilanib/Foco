package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.function.Function;

record OvertimeInput(@NotNull LocalDate from, @NotNull LocalDate to,
        @NotNull @Pattern(regexp="real|rounded") String journeyMode,
        @NotNull @Pattern(regexp="real|rounded") String extraMode,
        @Size(max=200) String provider, @Size(max=200) String email,
        @Size(max=200) String company, @Size(max=40) String cnpj,
        @Size(max=200) String manager, @DecimalMin("0") @DecimalMax("100000000") BigDecimal monthlyAmount,
        @Min(0) @Max(1440) int toleranceMinutes) {
    void validate() {
        if(from==null||to==null||from.isAfter(to)||from.getYear()<1900||to.getYear()>9999)
            throw new IllegalArgumentException("Informe datas entre 1900 e 9999, com início anterior ou igual ao fim.");
        HoursBasis.sql(journeyMode); HoursBasis.sql(extraMode);
    }
}
record OvertimeLine(LocalDate day, double startSeconds, long seconds, String description, String note) {}
record OvertimeReport(List<OvertimeLine> lines, long extraSeconds, long deductionSeconds, long totalSeconds, List<String> warnings) {}

@RestController
@RequestMapping("/api/overtime")
class OvertimeController {
    private final SessionController sessions;
    private final WorkIntervalRepository intervals;
    private final ScheduleRepository schedule;
    OvertimeController(SessionController sessions,WorkIntervalRepository intervals,ScheduleRepository schedule){this.sessions=sessions;this.intervals=intervals;this.schedule=schedule;}
    @PostMapping("/preview") OvertimeReport preview(@Valid @RequestBody OvertimeInput input) {
        input.validate();
        return OvertimeCalculator.calculate(input,sessions.list(Map.of()),intervals.findAll(),schedule.resolver());
    }
    @PostMapping("/export") ResponseEntity<byte[]> export(@Valid @RequestBody OvertimeInput input) {
        var report=preview(input);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=horas-extras-"+input.from()+"_a_"+input.to()+".xlsx")
            .header(HttpHeaders.CACHE_CONTROL,"no-store").body(OvertimeWorkbook.write(input,report));
    }
}

final class OvertimeCalculator {
    private record Slice(SessionRow session, Instant start, Instant end, double real, double rounded, boolean estimated) {}
    static OvertimeReport calculate(OvertimeInput input,List<SessionRow> sessions,List<WorkInterval> intervals,Function<LocalDate,ScheduleDay> schedule) {
        input.validate();
        var grouped=new HashMap<String,List<WorkInterval>>();
        for(var interval:intervals)grouped.computeIfAbsent(interval.sessionId(),key->new ArrayList<>()).add(interval);
        var slices=new ArrayList<Slice>(); var warnings=new LinkedHashSet<String>();
        Instant periodStart=input.from().atStartOfDay(WorkSchedule.ZONE).toInstant(),periodEnd=input.to().plusDays(1).atStartOfDay(WorkSchedule.ZONE).toInstant();
        for(var session:sessions){
            if(session.startAt().toInstant().isAfter(periodEnd))continue;
            if(session.endAt()==null||Set.of("Em andamento","Pausada").contains(session.status())){
                if(session.startAt().toInstant().isBefore(periodEnd))warnings.add("Apontamentos em andamento ou pausados não entram na exportação.");
                continue;
            }
            if(!session.endAt().toInstant().isAfter(periodStart))continue;
            var spans=grouped.getOrDefault(session.id(),List.of()).stream().filter(w->w.endAt()!=null&&w.endAt().isAfter(w.startAt())).sorted(Comparator.comparing(w->w.startAt().toInstant())).toList();
            if(spans.isEmpty()&&session.endAt().isAfter(session.startAt()))spans=List.of(new WorkInterval(session.id(),session.startAt(),session.endAt(),session.endAt(),"Estimado"));
            double wall=spans.stream().mapToDouble(w->seconds(w.startAt().toInstant(),w.endAt().toInstant())).sum();
            if(wall<=0){warnings.add("Há apontamentos sem intervalo válido; eles não foram exportados.");continue;}
            double real=HoursBasis.seconds(session,"real"),bonus=Math.max(0,HoursBasis.seconds(session,"rounded")-real);
            for(int i=0;i<spans.size();i++){
                var span=spans.get(i);Instant cursor=span.startAt().toInstant(),end=span.endAt().toInstant();
                while(cursor.isBefore(end)){
                    LocalDate day=cursor.atZone(WorkSchedule.ZONE).toLocalDate();
                    Instant midnight=day.plusDays(1).atStartOfDay(WorkSchedule.ZONE).toInstant(),stop=end.isBefore(midnight)?end:midnight;
                    double amount=real*seconds(cursor,stop)/wall;
                    // The persisted rounding belongs to the end of the session, never to pauses.
                    double rounding=i==spans.size()-1&&stop.equals(end)?bonus:0;
                    if(!day.isBefore(input.from())&&!day.isAfter(input.to()))slices.add(new Slice(session,cursor,stop,amount,amount+rounding,!"Precisa".equals(span.precision())||session.roundedEndAt()==null));
                    cursor=stop;
                }
            }
        }
        slices.sort(Comparator.comparing(Slice::start).thenComparing(s->s.session().id()));
        var consumed=new HashMap<LocalDate,Double>(); var lines=new ArrayList<OvertimeLine>();Instant furthest=null;
        for(var slice:slices){
            LocalDate day=slice.start().atZone(WorkSchedule.ZONE).toLocalDate();
            if(furthest!=null&&slice.start().isBefore(furthest))warnings.add("Há horários sobrepostos. As durações dos apontamentos são somadas; revise os conflitos antes de enviar.");
            if(furthest==null||slice.end().isAfter(furthest))furthest=slice.end();
            double target=target(schedule.apply(day)),used=consumed.getOrDefault(day,0d),remaining=Math.max(0,target-used);
            double normal=input.journeyMode().equals("rounded")?slice.rounded():slice.real();
            double extra=input.extraMode().equals("rounded")?slice.rounded():slice.real();
            consumed.put(day,used+normal);
            if(normal<remaining)continue;
            long amount=Math.round(Math.max(0,extra-remaining));
            if(amount<=0)continue;
            double start=slice.start().atZone(WorkSchedule.ZONE).toLocalTime().toSecondOfDay()+Math.min(remaining,slice.real());
            String description=java.util.stream.Stream.of(slice.session().client(),slice.session().project(),slice.session().activity(),slice.session().details()).filter(s->s!=null&&!s.isBlank()).collect(java.util.stream.Collectors.joining(" / "));
            String note="Após jornada de "+String.format(Locale.ROOT,"%.2f",target/3600)+"h; jornada "+label(input.journeyMode())+", extras "+label(input.extraMode())+"; horários calculados pela duração.";
            if(slice.estimated()){note+=" Intervalo estimado/legado.";warnings.add("Há intervalos estimados/legados; os horários são calculados pela duração registrada.");}
            lines.add(new OvertimeLine(day,start,amount,description,note));
            if(lines.size()>10000)throw new IllegalArgumentException("O período excede 10.000 linhas. Escolha um período menor.");
        }
        long extras=lines.stream().mapToLong(OvertimeLine::seconds).sum(),deductions=0;
        LocalDate today=LocalDate.now(WorkSchedule.ZONE);
        for(LocalDate day=input.from();!day.isAfter(input.to())&&day.isBefore(today);day=day.plusDays(1)){
            double target=target(schedule.apply(day));
            long deficit=Math.round(Math.max(0,target-consumed.getOrDefault(day,0d)-input.toleranceMinutes()*60d));
            if(deficit>0){
                deductions+=deficit;
                lines.add(new OvertimeLine(day,deficit,-deficit,"Abatimento de jornada","Saldo negativo após tolerância diária de "+input.toleranceMinutes()+" min; jornada "+label(input.journeyMode())+". Não representa horário trabalhado."));
                if(lines.size()>10000)throw new IllegalArgumentException("O período excede 10.000 linhas. Escolha um período menor.");
                if(!consumed.containsKey(day))warnings.add("Dias úteis sem apontamentos também geram abatimento. Confira o período e as folgas da jornada.");
            }
        }
        lines.sort(Comparator.comparing(OvertimeLine::day).thenComparingDouble(OvertimeLine::startSeconds));
        return new OvertimeReport(List.copyOf(lines),extras,deductions,extras-deductions,List.copyOf(warnings));
    }
    private static double target(ScheduleDay day){return day.windows().isEmpty()?0:day.targetSeconds();}
    private static double seconds(Instant start,Instant end){return Duration.between(start,end).toMillis()/1000d;}
    private static String label(String mode){return mode.equals("real")?"reais":"arredondadas";}
}
