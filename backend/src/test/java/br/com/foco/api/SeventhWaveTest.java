package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.zip.*;
import javax.sql.DataSource;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-seventh-wave-data"})
class SeventhWaveTest {
 @Value("${local.server.port}") int port;
 @jakarta.annotation.Resource JdbcTemplate db;
 @jakarta.annotation.Resource DataSource dataSource;
 @jakarta.annotation.Resource LocalBackup backup;
 @jakarta.annotation.Resource LocalRestore restore;
 @jakarta.annotation.Resource ScheduleRepository schedule;
 @jakarta.annotation.Resource WorkHoursController hours;
 @jakarta.annotation.Resource DatabaseMaintenance maintenance;
 @TempDir Path root;
 private final ObjectMapper mapper=new ObjectMapper();
 @BeforeEach void clean(){
  db.execute("DROP TRIGGER IF EXISTS reject_restore");
  for(String table:List.of("session_work_intervals","sessions","tasks","change_history","settings","task_inbox","daily_reviews","project_archive","catalog_projects","catalog_clients","catalog_activities","work_schedule_rules","work_schedule_exceptions"))db.update("DELETE FROM "+table);
 }
 HttpResponse<String> call(String method,String path,Object body,boolean token)throws Exception {
  var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");if(token)builder.header("X-Foco-Token","test-secret");
  return HttpClient.newHttpClient().send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
 }
 List<List<ClockWindow>> week(){var result=new ArrayList<List<ClockWindow>>();for(int i=0;i<7;i++)result.add(i==0?List.of(new ClockWindow("09:00","10:00"),new ClockWindow("11:00","12:00")):List.of());return result;}
 void seed(){
  db.update("INSERT INTO tasks(id,activity,details,created_at,updated_at) VALUES('t','Original','before','2026-01-01','2026-01-01')");
  db.update("INSERT INTO sessions(id,task_id,activity,start_at,end_at,focus_seconds,status) VALUES('original','t','Original','2026-09-21T09:00:00Z','2026-09-21T10:00:00Z',3600,'Encerrada')");
  db.update("INSERT INTO task_checklist VALUES('check','t','Conferir',1,0)");db.update("INSERT INTO settings VALUES('theme','dark')");
 }
 String zip(){return backup.create(root.resolve("copies").toString(),true).path();}
 @Test void restoringOldRoundingConvertsPreciselyAndKeepsSafetyCopy(){
  seed();db.update("UPDATE sessions SET focus_seconds=600,rounded_end_at='2026-09-21T10:03:00Z'");String file=zip();mutate();
  var result=restore.restore(confirmed(file));assertTrue(Files.isRegularFile(Path.of(result.safetyBackup())));
  assertEquals(480,db.queryForObject("SELECT focus_seconds FROM sessions",Double.class));assertEquals(420,db.queryForObject("SELECT "+HoursBasis.sql("real")+" FROM sessions",Double.class),0.001);
  assertEquals(2,db.queryForObject("SELECT rounding_version FROM sessions",Integer.class));assertEquals(1,db.queryForObject("SELECT count(*) FROM change_history WHERE entity_id='original'",Integer.class));
 }
 void mutate(){db.update("UPDATE tasks SET details='changed'");db.update("UPDATE sessions SET focus_seconds=7200");db.update("INSERT INTO settings VALUES('sentinel','preserved')");}
 RestoreRequest confirmed(String file){return new RestoreRequest(file,restore.preview(file).sha256(),true);}
 String stamp(LocalDate day,int hour){return day.atTime(hour,0).atZone(WorkSchedule.ZONE).toOffsetDateTime().toString();}
 @Test void rulesAndExceptionsUseTheirDateWhileHistoricalReportStaysIdentical()throws Exception {
  LocalDate day=LocalDate.now().plusDays(14).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY)),historic=day.minusDays(7);
  for(var date:List.of(day,historic))for(int hour:List.of(8,13))db.update("INSERT INTO sessions(id,activity,start_at,end_at,focus_seconds,status) VALUES(?,'Work',?,?,3600,'Encerrada')",date+"-"+hour,stamp(date,hour),stamp(date,hour+1));
  String before=mapper.writeValueAsString(hours.report(historic,historic));
  assertEquals(200,call("PUT","/api/work-schedule/rules",new ScheduleRule(day,week()),true).statusCode());
  assertEquals(before,mapper.writeValueAsString(hours.report(historic,historic)));
  var report=hours.report(day,day);assertEquals(7200,report.days().get(0).targetSeconds());assertEquals(7200,report.days().get(0).undefinedSeconds());assertEquals(7200,report.days().get(0).extraSeconds());assertEquals(2,report.undefinedPeriods().size());
  schedule.saveException(new ScheduleException(day,List.of()));report=hours.report(day,day);assertEquals(0,report.days().get(0).targetSeconds());assertEquals(0,report.undefinedPeriods().size());assertEquals(7200,report.days().get(0).extraSeconds());
  schedule.remove("work_schedule_exceptions",day);assertEquals(7200,hours.report(day,day).days().get(0).targetSeconds());
  assertEquals(401,call("GET","/api/work-schedule",null,false).statusCode());
 }
 @Test void rejectsPastOverlappingUnorderedAndInvalidSchedulesWithoutPartialWrite()throws Exception {
  var today=LocalDate.now();
  assertEquals(400,call("PUT","/api/work-schedule/rules",new ScheduleRule(today.minusDays(1),week()),true).statusCode());
  for(var windows:List.of(List.of(new ClockWindow("10:00","09:00")),List.of(new ClockWindow("09:00","12:00"),new ClockWindow("11:00","13:00")),List.of(new ClockWindow("29:00","30:00"))))assertEquals(400,call("PUT","/api/work-schedule/exceptions",new ScheduleException(today,windows),true).statusCode());
  assertEquals(400,call("PUT","/api/work-schedule/rules",new ScheduleRule(today,List.of()),true).statusCode());
  assertTrue(schedule.config().rules().isEmpty());assertTrue(schedule.config().exceptions().isEmpty());
  schedule.saveRule(new ScheduleRule(today,week()));assertEquals(400,call("DELETE","/api/work-schedule/rules/"+today.minusDays(1),null,true).statusCode());assertEquals(1,schedule.config().rules().size());
 }
 @Test void previewAndHttpRestoreReplaceDataAndKeepAnExactSafetyCopy()throws Exception {
  seed();schedule.saveRule(new ScheduleRule(LocalDate.now().plusDays(1),week()));String file=zip();mutate();
  var preview=restore.preview(file);assertEquals(1,preview.counts().get("sessions"));assertEquals(1,preview.counts().get("task_checklist"));assertEquals(1,preview.counts().get("work_schedule_rules"));
  var httpPreview=call("POST","/api/backup/preview",Map.of("path",file),true);assertEquals(200,httpPreview.statusCode(),httpPreview.body());assertEquals(preview.sha256(),mapper.readTree(httpPreview.body()).get("sha256").asText());
  assertEquals(401,call("POST","/api/backup/preview",Map.of("path",file),false).statusCode());assertEquals(401,call("POST","/api/backup/restore",confirmed(file),false).statusCode());
  var response=call("POST","/api/backup/restore",confirmed(file),true);assertEquals(200,response.statusCode(),response.body());
  assertEquals("before",db.queryForObject("SELECT details FROM tasks",String.class));assertEquals(3600,db.queryForObject("SELECT focus_seconds FROM sessions",Double.class));assertEquals(1,db.queryForObject("SELECT count(*) FROM task_checklist",Integer.class));assertEquals(1,schedule.config().rules().size());
  assertEquals(0,db.queryForObject("SELECT count(*) FROM settings WHERE key='sentinel'",Integer.class));assertEquals("ok",db.queryForObject("PRAGMA integrity_check",String.class));
  Path safety=Path.of(mapper.readTree(response.body()).get("safetyBackup").asText());assertTrue(Files.isRegularFile(safety));
  Path previous=root.resolve("previous.db");try(var archive=new ZipFile(safety.toFile());var input=archive.getInputStream(archive.getEntry("foco.db"))){Files.copy(input,previous);}
  try(var connection=DriverManager.getConnection("jdbc:sqlite:"+previous);var statement=connection.createStatement();var rows=statement.executeQuery("SELECT details FROM tasks")){assertTrue(rows.next());assertEquals("changed",rows.getString(1));}
  try(var listing=Files.list(Path.of("target/test-seventh-wave-data"))){assertFalse(listing.anyMatch(p->p.getFileName().toString().startsWith("restore-preview-")));}
 }
 @Test void confirmationChangedFileAndActiveCurrentSessionAreRejected()throws Exception {
  seed();String file=zip();var request=confirmed(file);
  assertThrows(IllegalArgumentException.class,()->restore.restore(new RestoreRequest(file,request.sha256(),false)));
  assertThrows(IllegalArgumentException.class,()->restore.restore(new RestoreRequest(file,"changed",true)));
  assertEquals("before",db.queryForObject("SELECT details FROM tasks",String.class));
  for(String status:List.of("Em andamento","Pausada")){db.update("UPDATE sessions SET status=?",status);assertThrows(IllegalArgumentException.class,()->restore.restore(request));}
  assertEquals(1,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
 }
 @Test void restoreRollsBackBusinessDataWhenAnInsertFails() {
  seed();String file=zip();mutate();var request=confirmed(file);
  db.execute("CREATE TRIGGER reject_restore BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'forced failure'); END");
  assertThrows(IllegalArgumentException.class,()->restore.restore(request));
  assertEquals("changed",db.queryForObject("SELECT details FROM tasks",String.class));assertEquals(7200,db.queryForObject("SELECT focus_seconds FROM sessions",Double.class));assertEquals("preserved",db.queryForObject("SELECT value FROM settings WHERE key='sentinel'",String.class));assertEquals(1,db.queryForObject("SELECT count(*) FROM task_checklist",Integer.class));
  assertEquals("ok",db.queryForObject("PRAGMA integrity_check",String.class));
 }
 @Test void safetyBackupFailurePreventsAnyReplacement() {
  seed();String file=zip();mutate();var request=confirmed(file);
  var broken=new LocalBackup(db,"target/test-seventh-wave-data"){@Override BackupResult create(String folder,boolean manual){throw new IllegalArgumentException("No space");}};
  var service=new LocalRestore(db,dataSource,broken,maintenance,"target/test-seventh-wave-data");assertThrows(IllegalArgumentException.class,()->service.restore(request));assertEquals("changed",db.queryForObject("SELECT details FROM tasks",String.class));
 }
 @Test void sessionsOpenInBackupRecoverPausedAtLastRecordedTick(){
  seed();db.update("UPDATE sessions SET status='Em andamento',end_at=NULL");db.update("INSERT INTO session_work_intervals VALUES('original','2026-09-21T09:00:00Z',NULL,'2026-09-21T09:10:00Z','Precisa')");String file=zip();db.update("UPDATE sessions SET status='Encerrada'");
  assertEquals(1,restore.preview(file).activeSessions());restore.restore(confirmed(file));assertEquals("Pausada",db.queryForObject("SELECT status FROM sessions",String.class));assertEquals("2026-09-21T09:10:00Z",db.queryForObject("SELECT end_at FROM session_work_intervals",String.class));
 }
 String archive(Path database,String name)throws Exception {
  Path zip=root.resolve(name+".zip");try(var output=new ZipOutputStream(Files.newOutputStream(zip))){output.putNextEntry(new ZipEntry("foco.db"));Files.copy(database,output);output.closeEntry();output.putNextEntry(new ZipEntry("manifest.txt"));output.write("FOCO BACKUP 1\n".getBytes());output.closeEntry();}return zip.toString();
 }
 @Test void olderCompatibleBackupGetsDefaultColumnsAndMissingOptionalTables()throws Exception {
  seed();Path old=root.resolve("old.db");
  try(var connection=DriverManager.getConnection("jdbc:sqlite:"+old);var statement=connection.createStatement()){
   statement.execute("CREATE TABLE tasks(id TEXT PRIMARY KEY,activity TEXT,created_at TEXT,updated_at TEXT)");statement.execute("INSERT INTO tasks VALUES('old','Old','2026-01-01','2026-01-01')");
   statement.execute("CREATE TABLE sessions(id TEXT PRIMARY KEY,task_id TEXT,activity TEXT,start_at TEXT,end_at TEXT,status TEXT)");statement.execute("INSERT INTO sessions VALUES('old-session','old','Old','2026-01-01T09:00:00Z','2026-01-01T10:00:00Z','Encerrada')");statement.execute("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT)");
  }
  String file=archive(old,"old");restore.restore(confirmed(file));assertEquals("Old",db.queryForObject("SELECT activity FROM tasks",String.class));assertEquals("Normal",db.queryForObject("SELECT category FROM sessions",String.class));assertEquals(0,db.queryForObject("SELECT count(*) FROM task_checklist",Integer.class));assertEquals(1,db.queryForObject("SELECT count(*) FROM session_work_intervals WHERE precision='Estimado'",Integer.class));
 }
 @Test void invalidAndFutureSchemaBackupsNeverModifyLiveData()throws Exception {
  seed();Path corrupt=root.resolve("corrupt.db");Files.writeString(corrupt,"not SQLite");assertThrows(IllegalArgumentException.class,()->restore.preview(archive(corrupt,"corrupt")));
  Path future=root.resolve("future.db");try(var connection=DriverManager.getConnection("jdbc:sqlite:"+future);var statement=connection.createStatement()){statement.execute("CREATE TABLE future_feature(id TEXT)");}
  assertThrows(IllegalArgumentException.class,()->restore.preview(archive(future,"future")));assertEquals("before",db.queryForObject("SELECT details FROM tasks",String.class));
  Path invalid=root.resolve("null-key.db");try(var original=new ZipFile(zip());var input=original.getInputStream(original.getEntry("foco.db"))){Files.copy(input,invalid);}
  try(var connection=DriverManager.getConnection("jdbc:sqlite:"+invalid);var statement=connection.createStatement()){statement.execute("UPDATE tasks SET id=NULL");}
  assertThrows(IllegalArgumentException.class,()->restore.preview(archive(invalid,"null-key")));
  try(var connection=DriverManager.getConnection("jdbc:sqlite:"+invalid);var statement=connection.createStatement()){statement.execute("UPDATE tasks SET id='t'");statement.execute("UPDATE sessions SET start_at='invalid-date'");}
  assertThrows(IllegalArgumentException.class,()->restore.preview(archive(invalid,"invalid-date")));assertEquals("before",db.queryForObject("SELECT details FROM tasks",String.class));
 }
 @Test void previewRejectsRowsIncompatibleWithCurrentConstraints()throws Exception {
  seed();String file=zip();Path incompatible=root.resolve("incompatible.db");
  try(var archive=new ZipFile(file);var input=archive.getInputStream(archive.getEntry("foco.db"))){Files.copy(input,incompatible);}
  try(var connection=DriverManager.getConnection("jdbc:sqlite:"+incompatible);var statement=connection.createStatement()){
   statement.execute("PRAGMA ignore_check_constraints=ON");statement.execute("INSERT INTO task_estimates VALUES('t',-10)");
  }
  assertThrows(IllegalArgumentException.class,()->restore.preview(archive(incompatible,"incompatible")));assertEquals("before",db.queryForObject("SELECT details FROM tasks",String.class));
 }
}
