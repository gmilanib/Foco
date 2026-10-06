package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/work-hours")
class WorkHoursController {
    private final JdbcTemplate db;
    private final WorkIntervalRepository intervals;
    private final WorkHoursService service=new WorkHoursService();
    WorkHoursController(JdbcTemplate db,WorkIntervalRepository intervals){this.db=db;this.intervals=intervals;}

    @GetMapping("/intervals") List<WorkInterval> intervals(){return intervals.findAll();}

    @GetMapping WorkHoursReport report(@RequestParam(required=false) LocalDate from,
            @RequestParam(required=false) LocalDate to){
        if(from!=null&&to!=null&&from.isAfter(to))throw new IllegalArgumentException("A data inicial deve ser anterior à data final.");
        List<WorkSession> sessions=db.query("SELECT id,start_at,end_at,focus_seconds FROM sessions ORDER BY start_at",
                (r,n)->new WorkSession(r.getString(1),OffsetDateTime.parse(r.getString(2)),
                        r.getString(3)==null?null:OffsetDateTime.parse(r.getString(3)),r.getDouble(4)));
        return service.build(sessions,intervals.findAll(),from,to);
    }
}
