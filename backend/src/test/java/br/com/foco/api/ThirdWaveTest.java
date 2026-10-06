package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-third-wave-data"})
class ThirdWaveTest {
 @Value("${local.server.port}") int port;
 @jakarta.annotation.Resource JdbcTemplate db;
 @jakarta.annotation.Resource WeeklyReviewController weekly;
 @BeforeEach void clean(){
  db.execute("DROP TRIGGER IF EXISTS reject_estimate_history");
  for(String table:new String[]{"session_work_intervals","sessions","task_plans","task_estimates","task_inbox","task_templates","tasks","change_history","settings"})db.update("DELETE FROM "+table);
  for(String id:new String[]{"a","b","c","d"})db.update("INSERT INTO tasks(id,activity,created_at,updated_at) VALUES(?,'Revisão','2026-01-01','2026-01-01')",id);
 }
 HttpResponse<String> call(String method,String path,String body,boolean token)throws Exception{
  var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
  if(token)builder.header("X-Foco-Token","test-secret");
  return HttpClient.newHttpClient().send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
 }
 @Test void estimatesPersistRemoveAndNeverChangeDeadlineOrTime()throws Exception{
  db.update("UPDATE tasks SET due_date='2026-12-31' WHERE id='a'");
  assertEquals(200,call("PUT","/api/planning/estimates/a","{\"minutes\":600}",true).statusCode());
  var rows=new ObjectMapper().readTree(call("GET","/api/planning/estimates",null,true).body());
  assertEquals(600,rows.get(0).get("minutes").asInt());
  assertEquals("2026-12-31",db.queryForObject("SELECT due_date FROM tasks WHERE id='a'",String.class));
  assertEquals(0,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
  assertEquals(200,call("PUT","/api/planning/estimates/a","{\"minutes\":null}",true).statusCode());
  assertEquals(0,db.queryForObject("SELECT count(*) FROM task_estimates",Integer.class));
  assertEquals(2,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
 }
 @Test void rejectsInvalidEstimatesMissingTaskAndMissingToken()throws Exception{
  for(String n:new String[]{"0","-1","100001","1.5"})assertEquals(400,call("PUT","/api/planning/estimates/a","{\"minutes\":"+n+"}",true).statusCode());
  assertTrue(call("PUT","/api/planning/estimates/missing","{\"minutes\":60}",true).statusCode()>=400);
  assertEquals(401,call("PUT","/api/planning/estimates/a","{\"minutes\":60}",false).statusCode());
  assertEquals(0,db.queryForObject("SELECT count(*) FROM task_estimates",Integer.class));
 }
 @Test void historyFailureRollsBackEstimate()throws Exception{
  db.execute("CREATE TRIGGER reject_estimate_history BEFORE INSERT ON change_history BEGIN SELECT RAISE(ABORT,'history failure'); END");
  try{assertTrue(call("PUT","/api/planning/estimates/a","{\"minutes\":60}",true).statusCode()>=400);assertEquals(0,db.queryForObject("SELECT count(*) FROM task_estimates",Integer.class));}
  finally{db.execute("DROP TRIGGER reject_estimate_history");}
 }
 @Test void capacityAllowsZeroButRejectsInvalidValuesWithoutPartialSave()throws Exception{
  assertEquals(200,call("PUT","/api/settings","{\"planning.capacityMinutes\":\"0\"}",true).statusCode());
  for(String n:new String[]{"-1","1441","1.5","text",""})assertEquals(400,call("PUT","/api/settings","{\"planning.capacityMinutes\":\""+n+"\",\"unrelated\":\"value\"}",true).statusCode());
  assertEquals("0",db.queryForObject("SELECT value FROM settings WHERE key='planning.capacityMinutes'",String.class));
  assertEquals(0,db.queryForObject("SELECT count(*) FROM settings WHERE key='unrelated'",Integer.class));
 }
 @Test void weeklyReviewUsesLocalDatesAndIgnoresOldWorkAndCompletedTasks(){
  LocalDate day=LocalDate.now(),planned=day.minusDays(2);
  db.update("INSERT INTO task_plans(task_id,planned_date,next_action) VALUES('a',?,'')",planned.toString());
  db.update("INSERT INTO task_plans(task_id,planned_date,next_action) VALUES('b',?,'Testar')",planned.toString());
  db.update("UPDATE tasks SET state='Aguardando' WHERE id='c'");
  db.update("INSERT INTO task_plans(task_id,review_date,next_action) VALUES('c',?,'Cobrar')",day.toString());
  db.update("UPDATE tasks SET completed=1,state='Concluída' WHERE id='d'");
  db.update("INSERT INTO sessions(id,task_id,activity,start_at,focus_seconds,status) VALUES('old','a','Revisão',?,60,'Encerrada')",planned.minusDays(1).atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime().toString());
  db.update("INSERT INTO sessions(id,task_id,activity,start_at,focus_seconds,status) VALUES('new','b','Revisão',?,60,'Encerrada')",planned.atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime().toString());
  for(int age:new int[]{7,6})db.update("INSERT INTO task_inbox(id,title,created_at) VALUES(?,?,?)","i"+age,"Captura",day.minusDays(age).atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime().toString());
  var review=weekly.review(day);
  assertEquals(java.util.List.of("a"),review.withoutNextAction());
  assertEquals(java.util.List.of("a"),review.unexecuted());assertEquals(java.util.List.of("c"),review.overdueDependencies());
  assertEquals(1,review.oldCaptures().size());assertEquals("i7",review.oldCaptures().get(0).id());
  assertEquals(DayOfWeek.MONDAY,review.weekStart().getDayOfWeek());
  assertEquals(0,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
 }
 @Test void weeklyEndpointRequiresDateAndToken()throws Exception{
  assertEquals(400,call("GET","/api/planning/weekly-review",null,true).statusCode());
  assertEquals(400,call("GET","/api/planning/weekly-review?day=bad",null,true).statusCode());
  assertEquals(401,call("GET","/api/planning/weekly-review?day=2026-10-02",null,false).statusCode());
  assertEquals(200,call("GET","/api/planning/weekly-review?day=2026-10-02",null,true).statusCode());
 }
}
