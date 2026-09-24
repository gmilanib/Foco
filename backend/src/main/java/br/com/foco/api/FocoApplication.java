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
    public FocoApplication(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    public static void main(String[] args) { SpringApplication.run(FocoApplication.class, args); }
    @EventListener(ApplicationReadyEvent.class)
    public void recoverActiveSessions(){
        ensureColumn("sessions","category","TEXT NOT NULL DEFAULT 'Normal'");
        ensureColumn("tasks","due_date","TEXT");
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
