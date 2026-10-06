package br.com.foco.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.nio.file.*;
import java.time.Instant;
import java.util.zip.ZipFile;
import static org.junit.jupiter.api.Assertions.*;

class BackupTest {
 @TempDir Path root;
 private JdbcTemplate db;
 private Path data;
 private LocalBackup backup() throws Exception {
  data=Files.createDirectories(root.resolve("data"));
  db=new JdbcTemplate(new DriverManagerDataSource("jdbc:sqlite:"+data.resolve("foco.db")));
  db.execute("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT)");
  db.execute("CREATE TABLE sessions(id TEXT PRIMARY KEY)");
  db.update("INSERT INTO sessions VALUES('preserved')");
  return new LocalBackup(db,data.toString());
 }
 private void setting(String key,String value){db.update("INSERT OR REPLACE INTO settings VALUES(?,?)",key,value);}
 @Test void manualBackupsIgnoreIntervalAndContainRecoverableDatabase() throws Exception {
  var backup=backup();var destination=root.resolve("copies");
  var first=backup.create(destination.toString(),true);
  assertFalse(backup.due(destination,Instant.now()));
  assertEquals("",backup.create(destination.toString(),false).path());
  var second=backup.create(destination.toString(),true);
  assertNotEquals(first.path(),second.path());
  assertTrue(Files.exists(Path.of(first.path())));
  try(var zip=new ZipFile(second.path())){
   assertNotNull(zip.getEntry("manifest.txt"));
   var restored=root.resolve("restored.db");
   try(var input=zip.getInputStream(zip.getEntry("foco.db"))){Files.copy(input,restored);}
   var restoredDb=new JdbcTemplate(new DriverManagerDataSource("jdbc:sqlite:"+restored));
   assertEquals("preserved",restoredDb.queryForObject("SELECT id FROM sessions",String.class));
   assertEquals("ok",restoredDb.queryForObject("PRAGMA quick_check",String.class));
  }
 }
 @Test void intervalUsesElapsedTimeAndNewDestinationGetsBackup() throws Exception {
  var backup=backup();var destination=root.resolve("copies");var now=Instant.parse("2026-09-30T12:00:00Z");
  setting("backup.lastDestination",destination.toString());setting("backup.lastSuccessAt",now.toString());
  assertFalse(backup.due(destination,now.plusSeconds(86399)));
  assertTrue(backup.due(destination,now.plusSeconds(86400)));
  setting("backup.intervalMinutes","60");
  assertFalse(backup.due(destination,now.plusSeconds(3599)));
  assertTrue(backup.due(destination,now.plusSeconds(3600)));
  assertTrue(backup.due(root.resolve("other"),now));
  setting("backup.lastSuccessAt","invalid");assertTrue(backup.due(destination,now));
 }
 @Test void invalidIntervalsAndDestinationAreRejectedWithoutBackup() throws Exception {
  var backup=backup();
  for(String value:new String[]{"0","-1","1.5","525601","text"})
   assertThrows(IllegalArgumentException.class,()->LocalBackup.validateInterval(value));
  assertEquals(1,LocalBackup.validateInterval("1"));
  assertThrows(IllegalArgumentException.class,()->backup.create(data.resolve("copies").toString(),true));
  assertThrows(IllegalArgumentException.class,()->backup.create("",true));
  var blocked=root.resolve("file");Files.writeString(blocked,"keep");
  assertThrows(IllegalArgumentException.class,()->backup.create(blocked.toString(),true));
  assertEquals(0,db.queryForObject("SELECT count(*) FROM settings WHERE key='backup.lastSuccessAt'",Integer.class));
 }
 @Test void diagnosticsKeepLastSuccessWhenLaterAttemptFailsAndSkipDoesNotReplaceResult() throws Exception {
  var backup=backup();var destination=root.resolve("copies");
  backup.create(destination.toString(),true);
  String success=db.queryForObject("SELECT value FROM settings WHERE key='backup.lastSuccessAt'",String.class);
  assertEquals("Sucesso",db.queryForObject("SELECT value FROM settings WHERE key='backup.lastResult'",String.class));
  var blocked=root.resolve("blocked");Files.writeString(blocked,"keep");
  assertThrows(IllegalArgumentException.class,()->backup.create(blocked.toString(),true));
  assertEquals("Falha",db.queryForObject("SELECT value FROM settings WHERE key='backup.lastResult'",String.class));
  String attempt=db.queryForObject("SELECT value FROM settings WHERE key='backup.lastAttemptAt'",String.class);
  assertFalse(attempt.isBlank());
  backup.create(destination.toString(),false);
  assertEquals(attempt,db.queryForObject("SELECT value FROM settings WHERE key='backup.lastAttemptAt'",String.class));
  assertEquals(success,db.queryForObject("SELECT value FROM settings WHERE key='backup.lastSuccessAt'",String.class));
 }
}
