package br.com.foco.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
public class FocoApplication {
    private final JdbcTemplate jdbc;
    private final WorkIntervalRepository workIntervals;
    public FocoApplication(JdbcTemplate jdbc, WorkIntervalRepository workIntervals) {
        this.jdbc = jdbc; this.workIntervals = workIntervals;
    }
    public static void main(String[] args) { SpringApplication.run(FocoApplication.class, args); }
    @EventListener(ApplicationReadyEvent.class)
    public void recoverActiveSessions(){
        ensureColumn("sessions","category","TEXT NOT NULL DEFAULT 'Normal'");
        ensureColumn("sessions","rounded_end_at","TEXT");
        ensureColumn("tasks","due_date","TEXT");
        ensureColumn("tasks","state","TEXT");
        workIntervals.initialize();
        workIntervals.closeActiveAtLastTick();
        jdbc.update("UPDATE sessions SET status='Pausada',end_at=NULL WHERE status='Em andamento'");
    }
    private void ensureColumn(String table,String column,String definition){
        boolean exists=Boolean.TRUE.equals(jdbc.query("PRAGMA table_info("+table+")",r->r.next()?hasColumn(r,column):false));
        if(!exists)jdbc.execute("ALTER TABLE "+table+" ADD COLUMN "+column+" "+definition);
    }
    private boolean hasColumn(java.sql.ResultSet first,String column)throws java.sql.SQLException{
        do{if(column.equals(first.getString("name")))return true;}while(first.next());
        return false;
    }
}
