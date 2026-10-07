package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-sixth-wave-data"})
class SixthWaveTest {
 @Value("${local.server.port}") int port;
 @jakarta.annotation.Resource JdbcTemplate db;
 @jakarta.annotation.Resource PlanningController planning;
 @jakarta.annotation.Resource TaskController tasks;
 @jakarta.annotation.Resource SettingsController settings;
 @BeforeEach void clean(){
  db.execute("DROP TRIGGER IF EXISTS reject_sixth_history");
  for(String table:new String[]{"session_work_intervals","sessions","task_plans","tasks","change_history","settings"})db.update("DELETE FROM "+table);
  for(String id:new String[]{"a","b","c","d"})db.update("INSERT INTO tasks(id,activity,due_date,created_at,updated_at) VALUES(?,'Revisar','2026-12-01','2026-01-01','2026-01-01')",id);
 }
 HttpResponse<String> call(String method,String path,String body,boolean token)throws Exception{
  var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
  if(token)request.header("X-Foco-Token","test-secret");
  return HttpClient.newHttpClient().send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
 }
 @Test void comparesSameFilteredRowsAndIdentifiesUnknownAndOngoingPrecision()throws Exception{
  db.update("INSERT INTO sessions(id,client,activity,start_at,end_at,rounded_end_at,focus_seconds,status) VALUES('r','ACME','Revisar','2026-10-06T09:00:00Z','2026-10-06T09:15:00Z','2026-10-06T09:18:00Z',600,'Encerrada')");
  db.update("INSERT INTO sessions(id,client,activity,start_at,end_at,focus_seconds,status) VALUES('legacy','ACME','Revisar','2026-10-06T09:00:00Z','2026-10-06T09:10:00Z',300,'Encerrada')");
  db.update("INSERT INTO sessions(id,client,activity,start_at,focus_seconds,status) VALUES('open','ACME','Revisar','2026-10-06T09:00:00Z',60,'Pausada')");
  db.update("INSERT INTO sessions(id,client,activity,start_at,end_at,rounded_end_at,focus_seconds,status) VALUES('other','Outra','Revisar','2026-10-06T09:00:00Z','2026-10-06T09:10:00Z','2026-10-06T09:10:00Z',420,'Encerrada')");
  var mapper=new ObjectMapper();
  for(String mode:new String[]{"real","rounded"}){
   var response=call("GET","/api/dashboard?client=ACME&hoursMode="+mode,null,true);assertEquals(200,response.statusCode());
   var comparison=mapper.readTree(response.body()).get("comparison");assertEquals(780,comparison.get("realSeconds").asDouble(),0.001);assertEquals(960,comparison.get("roundedSeconds").asDouble());assertEquals(180,comparison.get("differenceSeconds").asDouble(),0.001);assertEquals(1,comparison.get("unknownPrecision").asLong());assertEquals(1,comparison.get("ongoingSessions").asLong());
  }
  var filtered=mapper.readTree(call("GET","/api/dashboard?client=ACME&minHours=0.15&hoursMode=rounded",null,true).body()).get("comparison");assertEquals(420,filtered.get("realSeconds").asDouble(),0.001);assertEquals(600,filtered.get("roundedSeconds").asDouble());assertEquals(0,filtered.get("unknownPrecision").asLong());
  var empty=mapper.readTree(call("GET","/api/dashboard?client=Missing",null,true).body()).get("comparison");assertEquals(0,empty.get("differenceSeconds").asDouble());assertEquals(0,empty.get("realSeconds").asDouble());
 }
 @Test void movesOnlyDatePreservingDeadlineNextActionWaitingAndHistory()throws Exception{
  planning.plan("a",new PlanInput(LocalDate.parse("2026-10-06"),true,"Próximo passo","Fornecedor",LocalDate.parse("2026-10-07"),"Pendente"));
  var response=call("PUT","/api/planning/plans/a/date","{\"plannedDate\":\"2026-10-08\",\"keepPriority\":true}",true);assertEquals(200,response.statusCode(),response.body());
  PlanRow plan=planning.plans().get(0);assertEquals(LocalDate.parse("2026-10-08"),plan.plannedDate());assertTrue(plan.priority()>0);assertEquals("Próximo passo",plan.nextAction());assertEquals("Fornecedor",plan.waitingFor());assertEquals(LocalDate.parse("2026-10-07"),plan.reviewDate());assertEquals(LocalDate.parse("2026-12-01"),tasks.get("a").dueDate());assertEquals("Pendente",tasks.get("a").state());
  assertEquals(200,call("PUT","/api/planning/plans/a/date","{\"plannedDate\":null,\"keepPriority\":false}",true).statusCode());assertNull(planning.plans().get(0).plannedDate());assertEquals(0,planning.plans().get(0).priority());assertEquals(3,db.queryForObject("SELECT count(*) FROM change_history WHERE entity_id='a'",Integer.class));
 }
 @Test void rejectsFullPriorityDateAndRollsBackHistoryFailure()throws Exception{
        db.update("INSERT INTO settings(key,value) VALUES('planning.priorityLimit','3') ON CONFLICT(key) DO UPDATE SET value='3'");

  LocalDate before=LocalDate.parse("2026-10-06"),target=before.plusDays(1);
  planning.plan("a",new PlanInput(before,true,"Passo","",null,"Pendente"));
  for(String id:new String[]{"b","c","d"})planning.plan(id,new PlanInput(target,true,"","",null,"Pendente"));
  assertEquals(400,call("PUT","/api/planning/plans/a/date","{\"plannedDate\":\"2026-10-07\",\"keepPriority\":true}",true).statusCode());assertEquals(before,planning.plans().stream().filter(p->p.taskId().equals("a")).findFirst().orElseThrow().plannedDate());
  db.execute("CREATE TRIGGER reject_sixth_history BEFORE INSERT ON change_history BEGIN SELECT RAISE(ABORT,'history blocked'); END");
  assertTrue(call("PUT","/api/planning/plans/a/date","{\"plannedDate\":\"2026-10-08\",\"keepPriority\":false}",true).statusCode()>=400);assertEquals(before,planning.plans().stream().filter(p->p.taskId().equals("a")).findFirst().orElseThrow().plannedDate());
 }
 @Test void refusesArchivedCompletedAndUnauthenticatedMoves()throws Exception{
  assertEquals(401,call("PUT","/api/planning/plans/a/date","{\"plannedDate\":\"2026-10-07\"}",false).statusCode());
  db.update("UPDATE tasks SET completed=1,state='Concluída' WHERE id='a'");assertEquals(400,call("PUT","/api/planning/plans/a/date","{\"plannedDate\":\"2026-10-07\"}",true).statusCode());
  db.update("INSERT INTO task_archive(task_id,archived_at) VALUES('b','2026-10-06')");assertEquals(400,call("PUT","/api/planning/plans/b/date","{\"plannedDate\":\"2026-10-07\"}",true).statusCode());assertTrue(planning.plans().isEmpty());
 }
 @Test void validatesWorkflowPreferencesBeforeAnyWriteAndPersistsValidPreferences(){
  assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("capture.enabled","yes","theme","dark")));assertTrue(settings.all().isEmpty());
  for(String shortcut:new String[]{"Q","Ctrl+Alt+","Ctrl+Alt+F25","Ctrl+Alt+Q;run"})assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("capture.shortcut",shortcut)));
  for(String time:new String[]{"24:00","09:60","9:00","oops"})assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("reminders.review.time",time)));
  var result=settings.save(Map.of("capture.enabled","true","capture.shortcut","Ctrl+Alt+Q","reminders.planning.time","09:00","reminders.review.enabled","false"));assertEquals("Ctrl+Alt+Q",result.get("capture.shortcut"));
 }
}
