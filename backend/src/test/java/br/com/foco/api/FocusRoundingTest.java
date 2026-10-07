package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.sqlite.SQLiteDataSource;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.zip.ZipFile;
import static org.junit.jupiter.api.Assertions.*;

class FocusRoundingTest {
    @TempDir Path root;
    SQLiteDataSource source;
    JdbcTemplate db;
    Path data;
    @BeforeEach void setup()throws Exception {
        data=Files.createDirectories(root.resolve("data"));
        source=new SQLiteDataSource();source.setUrl("jdbc:sqlite:"+data.resolve("foco.db"));db=new JdbcTemplate(source);
        try(var resource=getClass().getResourceAsStream("/db/migration/schema.sql")){
            for(String sql:new String(resource.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).split(";"))if(!sql.isBlank())db.execute(sql);
        }
        new WorkIntervalRepository(db).initialize();
    }
    @ParameterizedTest @CsvSource({"0,0","0.5,120","119.999,120","120,120","120.001,240","240,240","301,360","420.5,480","3600,3600"})
    void twoMinuteBoundaries(double real,double expected){assertEquals(expected,FocusRounding.round(real));}
    @Test void invalidFocusIsRejected(){for(double value:new double[]{-1,Double.NaN,Double.POSITIVE_INFINITY})assertThrows(IllegalArgumentException.class,()->FocusRounding.round(value));}
    void seed(String id,double focus,String end,String rounded,String status,int version){
        db.update("INSERT INTO sessions(id,activity,start_at,end_at,rounded_end_at,focus_seconds,status,rounding_version) VALUES(?,'A','2026-10-06T09:00:00Z',?,?,?,?,?)",id,end,rounded,focus,status,version);
    }
    void historical(){seed("old",600,"2026-10-06T09:15:00Z","2026-10-06T09:17:59.5Z","Encerrada",0);}
    RoundingMigration service(LocalBackup backup){return new RoundingMigration(source,backup,new DatabaseMaintenance(),data.toString());}
    LocalBackup backup(){return new LocalBackup(db,data.toString());}
    @Test void migrationKeepsRealFocusPausesAndCostsAuditsAndDoesNotRepeat()throws Exception {
        historical();db.update("UPDATE sessions SET hourly_rate='120'");
        db.update("INSERT INTO session_work_intervals VALUES('old','2026-10-06T09:00:00Z','2026-10-06T09:07:00Z','2026-10-06T09:07:00Z','Precisa')");
        service(backup()).run();
        assertEquals(480,db.queryForObject("SELECT focus_seconds FROM sessions",Double.class));
        assertEquals(420.5,db.queryForObject("SELECT "+HoursBasis.sql("real")+" FROM sessions",Double.class),0.001);
        assertEquals("2026-10-06T09:15:59.500Z",db.queryForObject("SELECT rounded_end_at FROM sessions",String.class));
        assertEquals("2026-10-06T09:15:00Z",db.queryForObject("SELECT end_at FROM sessions",String.class));
        assertEquals("2026-10-06T09:07:00Z",db.queryForObject("SELECT end_at FROM session_work_intervals",String.class));
        assertEquals(16,db.queryForObject("SELECT focus_seconds*hourly_rate/3600 FROM sessions",Double.class));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
        assertTrue(db.queryForObject("SELECT old_value FROM change_history",String.class).contains("600"));
        service(backup()).run();assertEquals(1,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM settings WHERE key='rounding.migratedSessions' AND value='1'",Integer.class));
    }
    @Test void missingPrecisionRetroactiveActiveAndNewEntriesStayIntact(){
        historical();
        seed("legacy",300,"2026-10-06T10:00:00Z",null,"Encerrada",0);
        seed("retro",181,"2026-10-06T10:00:00Z","2026-10-06T10:00:00Z","Encerrada",0);
        seed("active",121,null,null,"Pausada",0);
        seed("new",240,"2026-10-06T10:00:00Z","2026-10-06T10:01:59Z","Encerrada",2);
        service(backup()).run();
        for(var expected:java.util.Map.of("legacy",300.0,"retro",181.0,"active",121.0,"new",240.0).entrySet())assertEquals(expected.getValue(),db.queryForObject("SELECT focus_seconds FROM sessions WHERE id=?",Double.class,expected.getKey()));
        assertNull(db.queryForObject("SELECT rounded_end_at FROM sessions WHERE id='legacy'",String.class));
    }
    @Test void safetyCopyContainsOriginalDurations()throws Exception {
        historical();service(backup()).run();
        String file=db.queryForObject("SELECT value FROM settings WHERE key='rounding.safetyBackup'",String.class);
        Path original=root.resolve("original.db");
        try(var zip=new ZipFile(file);var input=zip.getInputStream(zip.getEntry("foco.db"))){Files.copy(input,original);}
        try(var connection=DriverManager.getConnection("jdbc:sqlite:"+original);var query=connection.createStatement();var rows=query.executeQuery("SELECT focus_seconds,rounding_version FROM sessions")){assertTrue(rows.next());assertEquals(600,rows.getDouble(1));assertEquals(0,rows.getInt(2));}
    }
    @Test void backupFailurePreventsMigration(){
        historical();var failed=new LocalBackup(db,data.toString()){@Override BackupResult create(String folder,boolean manual){throw new IllegalArgumentException("Sem espaço");}};
        assertThrows(IllegalStateException.class,()->service(failed).run());assertEquals(600,db.queryForObject("SELECT focus_seconds FROM sessions",Double.class));assertEquals(0,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
    }
    @Test void auditFailureRollsBackAllEntriesAndMarkers(){
        historical();db.execute("CREATE TRIGGER reject_audit BEFORE INSERT ON change_history BEGIN SELECT RAISE(ABORT,'forced failure'); END");
        assertThrows(IllegalStateException.class,()->service(backup()).run());assertEquals(600,db.queryForObject("SELECT focus_seconds FROM sessions",Double.class));assertEquals(0,db.queryForObject("SELECT rounding_version FROM sessions",Integer.class));assertEquals(0,db.queryForObject("SELECT count(*) FROM settings WHERE key LIKE 'rounding.%'",Integer.class));
    }
    @Test void corruptAdjustmentRollsBackRatherThanInventingRealTime(){
        historical();seed("z-invalid",60,"2026-10-06T10:00:00Z","2026-10-06T10:05:00Z","Encerrada",0);
        assertThrows(IllegalStateException.class,()->service(backup()).run());assertEquals(600,db.queryForObject("SELECT focus_seconds FROM sessions WHERE id='old'",Double.class));assertEquals(0,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
    }
}
