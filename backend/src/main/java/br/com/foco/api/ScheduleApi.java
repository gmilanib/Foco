package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Function;

record ClockWindow(String start, String end) {}
record ScheduleRule(LocalDate effectiveFrom, List<List<ClockWindow>> week) {}
record ScheduleException(LocalDate day, List<ClockWindow> windows) {}
record ScheduleConfig(List<ScheduleRule> rules, List<ScheduleException> exceptions) {}
record ScheduleWeek(List<List<ClockWindow>> week) {}
record ScheduleWindows(List<ClockWindow> windows) {}
record ScheduleDay(List<ClockWindow> windows, double targetSeconds, String source) {
    List<WorkSpan> gaps(OffsetDateTime from, OffsetDateTime to) {
        LocalDate day = from.atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();
        if (!day.equals(to.atZoneSameInstant(WorkSchedule.ZONE).toLocalDate()) || !to.isAfter(from)) return List.of();
        var result = new ArrayList<WorkSpan>();
        for (var window : windows) {
            Instant start = day.atTime(LocalTime.parse(window.start())).atZone(WorkSchedule.ZONE).toInstant();
            Instant end = day.atTime(LocalTime.parse(window.end())).atZone(WorkSchedule.ZONE).toInstant();
            if (from.toInstant().isAfter(start)) start = from.toInstant();
            if (to.toInstant().isBefore(end)) end = to.toInstant();
            if (end.isAfter(start)) result.add(new WorkSpan(start.atZone(WorkSchedule.ZONE).toOffsetDateTime(), end.atZone(WorkSchedule.ZONE).toOffsetDateTime()));
        }
        return result;
    }
    static ScheduleDay legacy(LocalDate day) {
        boolean working = day.getDayOfWeek().getValue() <= 5;
        return new ScheduleDay(working ? List.of(new ClockWindow("09:00", "12:00"), new ClockWindow("13:00", "18:00")) : List.of(), 28800, "Padrão histórico");
    }
}

@Service
class ScheduleRepository {
    private final JdbcTemplate db;
    private final ObjectMapper mapper = new ObjectMapper();
    ScheduleRepository(JdbcTemplate db) { this.db = db; }
    ScheduleConfig config() {
        return new ScheduleConfig(db.query("SELECT * FROM work_schedule_rules ORDER BY effective_from", (r,n) -> new ScheduleRule(LocalDate.parse(r.getString("effective_from")), mapper.readValue(r.getString("week_json"), ScheduleWeek.class).week())),
            db.query("SELECT * FROM work_schedule_exceptions ORDER BY day", (r,n) -> new ScheduleException(LocalDate.parse(r.getString("day")), mapper.readValue(r.getString("windows_json"), ScheduleWindows.class).windows())));
    }
    Function<LocalDate, ScheduleDay> resolver() {
        ScheduleConfig config = config();
        return day -> {
            List<ClockWindow> windows = null; String source = "";
            for (var rule : config.rules()) if (!day.isBefore(rule.effectiveFrom())) { windows = rule.week().get(day.getDayOfWeek().getValue()-1); source = "Regra desde " + rule.effectiveFrom(); }
            for (var exception : config.exceptions()) if (day.equals(exception.day())) { windows = exception.windows(); source = "Exceção de " + day; }
            if (windows == null) return ScheduleDay.legacy(day);
            double seconds = windows.stream().mapToLong(w -> Duration.between(LocalTime.parse(w.start()), LocalTime.parse(w.end())).getSeconds()).sum();
            return new ScheduleDay(windows, seconds, source);
        };
    }
    static void editable(LocalDate day) {
        if (day == null || day.isBefore(LocalDate.now())) throw new IllegalArgumentException("Escolha hoje ou uma data futura. Regras de dias anteriores são preservadas.");
    }
    static List<ClockWindow> validate(List<ClockWindow> windows) {
        if (windows == null || windows.size() > 8) throw new IllegalArgumentException("Informe até oito intervalos por dia.");
        var result = new ArrayList<ClockWindow>(); LocalTime previous = null;
        for (var window : windows) {
            if (window == null || window.start() == null || window.end() == null || !window.start().matches("[0-2][0-9]:[0-5][0-9]") || !window.end().matches("[0-2][0-9]:[0-5][0-9]")) throw new IllegalArgumentException("Use horários HH:mm.");
            LocalTime start, end;
            try { start = LocalTime.parse(window.start()); end = LocalTime.parse(window.end()); } catch (DateTimeException e) { throw new IllegalArgumentException("Horário inválido."); }
            if (!end.isAfter(start) || previous != null && start.isBefore(previous)) throw new IllegalArgumentException("Intervalos devem estar em ordem, sem sobreposição e terminar no mesmo dia.");
            result.add(window); previous = end;
        }
        return List.copyOf(result);
    }
    @Transactional public ScheduleConfig saveRule(ScheduleRule rule) {
        editable(rule.effectiveFrom());
        if (rule.week() == null || rule.week().size() != 7) throw new IllegalArgumentException("Informe os sete dias, de segunda a domingo.");
        var week = rule.week().stream().map(ScheduleRepository::validate).toList();
        db.update("INSERT INTO work_schedule_rules VALUES(?,?) ON CONFLICT(effective_from) DO UPDATE SET week_json=excluded.week_json", rule.effectiveFrom().toString(), mapper.writeValueAsString(new ScheduleWeek(week)));
        return config();
    }
    @Transactional public ScheduleConfig saveException(ScheduleException exception) {
        editable(exception.day()); var windows = validate(exception.windows());
        db.update("INSERT INTO work_schedule_exceptions VALUES(?,?) ON CONFLICT(day) DO UPDATE SET windows_json=excluded.windows_json", exception.day().toString(), mapper.writeValueAsString(new ScheduleWindows(windows)));
        return config();
    }
    @Transactional public ScheduleConfig remove(String table, LocalDate day) { editable(day); db.update("DELETE FROM " + table + " WHERE " + (table.equals("work_schedule_rules") ? "effective_from" : "day") + "=?", day.toString()); return config(); }
}

@RestController
@RequestMapping("/api/work-schedule")
class ScheduleController {
    private final ScheduleRepository repository;
    ScheduleController(ScheduleRepository repository) { this.repository = repository; }
    @GetMapping ScheduleConfig config() { return repository.config(); }
    @PutMapping("/rules") ScheduleConfig rule(@RequestBody ScheduleRule rule) { return repository.saveRule(rule); }
    @PutMapping("/exceptions") ScheduleConfig exception(@RequestBody ScheduleException exception) { return repository.saveException(exception); }
    @DeleteMapping("/rules/{day}") ScheduleConfig removeRule(@PathVariable LocalDate day) { return repository.remove("work_schedule_rules", day); }
    @DeleteMapping("/exceptions/{day}") ScheduleConfig removeException(@PathVariable LocalDate day) { return repository.remove("work_schedule_exceptions", day); }
}
