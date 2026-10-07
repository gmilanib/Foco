package br.com.foco.api;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.nio.file.Files;
import static org.junit.jupiter.api.Assertions.*;

class VersionCompatibilityTest {
    @Test void planningSchemaIsAdditiveAndCanBeAppliedTwice() throws Exception {
        var file=Files.createTempFile("foco-planning-compat-",".db");
        try {
            var source=new DriverManagerDataSource("jdbc:sqlite:"+file);
            JdbcTemplate db=new JdbcTemplate(source);
            db.execute("CREATE TABLE tasks(id TEXT PRIMARY KEY,activity TEXT,details TEXT,due_date TEXT)");
            db.update("INSERT INTO tasks VALUES('legacy','Entrega','Texto preservado','2026-12-01')");
            for(int i=0;i<2;i++)try(var connection=source.getConnection()){
                org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection,
                        new org.springframework.core.io.ClassPathResource("db/migration/schema.sql"));
            }
            assertEquals("Texto preservado",db.queryForObject("SELECT details FROM tasks WHERE id='legacy'",String.class));
            assertEquals("2026-12-01",db.queryForObject("SELECT due_date FROM tasks WHERE id='legacy'",String.class));
            for(String table:new String[]{"task_plans","task_inbox","task_templates","daily_reviews","task_estimates","task_archive","project_archive","task_checklist","template_options"})
                assertEquals(0,db.queryForObject("SELECT count(*) FROM "+table,Integer.class));
        } finally { Files.deleteIfExists(file); }
    }
    @Test void newVersionAddsOnlyOptionalFieldsToStableDatabase() throws Exception {
        var file=Files.createTempFile("foco-stable-compat-",".db");
        try {
            var source=new DriverManagerDataSource("jdbc:sqlite:"+file);
            JdbcTemplate db=new JdbcTemplate(source);
            db.execute("CREATE TABLE tasks(id TEXT PRIMARY KEY)");
            db.execute("CREATE TABLE sessions(id TEXT PRIMARY KEY,status TEXT,end_at TEXT,start_at TEXT,focus_seconds REAL DEFAULT 0)");
            db.update("INSERT INTO sessions(id,status,end_at,start_at,focus_seconds) VALUES('legacy','Em andamento',NULL,'2026-09-24T09:00:00-03:00',0)");
            var migration=new RoundingMigration(source,new LocalBackup(db,file.getParent().toString()),new DatabaseMaintenance(),file.getParent().toString());
            new FocoApplication(db,new WorkIntervalRepository(db),migration).recoverActiveSessions();
            assertTrue(hasColumn(db,"tasks","due_date"));
            assertTrue(hasColumn(db,"tasks","state"));
            assertTrue(hasColumn(db,"sessions","category"));
            assertTrue(hasColumn(db,"sessions","rounding_version"));
            assertEquals("Normal",db.queryForObject("SELECT category FROM sessions WHERE id='legacy'",String.class));
            assertEquals("Pausada",db.queryForObject("SELECT status FROM sessions WHERE id='legacy'",String.class));
        } finally { Files.deleteIfExists(file); }
    }

    private boolean hasColumn(JdbcTemplate db,String table,String name){
        return db.query("PRAGMA table_info("+table+")",r->{while(r.next())if(name.equals(r.getString("name")))return true;return false;});
    }
}
