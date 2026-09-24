package br.com.foco.api;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.nio.file.Files;
import static org.junit.jupiter.api.Assertions.*;

class VersionCompatibilityTest {
    @Test void newVersionAddsOnlyOptionalFieldsToStableDatabase() throws Exception {
        var file=Files.createTempFile("foco-stable-compat-",".db");
        try {
            var source=new DriverManagerDataSource("jdbc:sqlite:"+file);
            JdbcTemplate db=new JdbcTemplate(source);
            db.execute("CREATE TABLE tasks(id TEXT PRIMARY KEY)");
            db.execute("CREATE TABLE sessions(id TEXT PRIMARY KEY,status TEXT,end_at TEXT)");
            db.update("INSERT INTO sessions VALUES('legacy','Em andamento',NULL)");
            new FocoApplication(db).recoverActiveSessions();
            assertTrue(hasColumn(db,"tasks","due_date"));
            assertTrue(hasColumn(db,"sessions","category"));
            assertEquals("Normal",db.queryForObject("SELECT category FROM sessions WHERE id='legacy'",String.class));
            assertEquals("Pausada",db.queryForObject("SELECT status FROM sessions WHERE id='legacy'",String.class));
        } finally { Files.deleteIfExists(file); }
    }

    private boolean hasColumn(JdbcTemplate db,String table,String name){
        return db.query("PRAGMA table_info("+table+")",r->{while(r.next())if(name.equals(r.getString("name")))return true;return false;});
    }
}
