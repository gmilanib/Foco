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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-analysis-data"})
class PlanningAnalysisTest {
 @Value("${local.server.port}") int port;
 @jakarta.annotation.Resource JdbcTemplate db;
 @jakarta.annotation.Resource PlanningAnalysisController analysis;
 @jakarta.annotation.Resource DashboardController dashboard;
 final LocalDate from=LocalDate.of(2026,9,28),to=LocalDate.of(2026,10,5);
 @BeforeEach void clean(){
  for(String table:new String[]{"session_work_intervals","sessions","task_plans","task_estimates","tasks","change_history","settings"})db.update("DELETE FROM "+table);
 }
 void task(String id,String client,String project,String planned,Integer minutes){
  db.update("INSERT INTO tasks(id,client,project,activity,created_at,updated_at) VALUES(?,?,?,'Testar','2026-01-01','2026-01-01')",id,client,project);
  if(planned!=null)db.update("INSERT INTO task_plans(task_id,planned_date) VALUES(?,?)",id,planned);
  if(minutes!=null)db.update("INSERT INTO task_estimates(task_id,minutes) VALUES(?,?)",id,minutes);
 }
 void session(String id,String task,String client,String project,LocalDate day,double seconds){
  db.update("INSERT INTO sessions(id,task_id,client,project,activity,start_at,focus_seconds,status) VALUES(?,?,?,?,'Testar',?,?,'Encerrada')",id,task,client,project,day.atTime(10,0).atZone(ZoneId.systemDefault()).toOffsetDateTime().toString(),seconds);
 }
 @Test void comparesTasksProjectsWeeksWithoutMultiplyingEstimates(){
  task("a","Cliente A","Mesmo","2026-09-28",60);
  task("b","Cliente A","Mesmo","2026-10-05",null);
  task("c","Cliente B","Mesmo",null,30);
  task("outside","Cliente B","Fora","2026-09-27",50);
  db.update("UPDATE tasks SET completed=1,state='Concluída' WHERE id='a'");
  session("a1","a","Antigo","Antigo",from,1800);
  session("a2","a","Antigo","Antigo",to,2400);
  session("c1","c","Cliente B","Mesmo",from,900);
  session("free",null,"Cliente A","Mesmo",to,600);
  session("old","a","Cliente A","Mesmo",from.minusDays(1),10000);
  session("future","a","Cliente A","Mesmo",to.plusDays(1),10000);
  var result=analysis.analyse(from,to,"real");
  assertEquals(3,result.tasks().size());
  var a=result.tasks().stream().filter(t->t.id().equals("a")).findFirst().orElseThrow();
  assertEquals(3600,a.estimatedSeconds());assertEquals(3600,a.plannedSeconds());assertEquals(4200,a.actualSeconds());
  assertNull(result.tasks().stream().filter(t->t.id().equals("b")).findFirst().orElseThrow().estimatedSeconds());
  assertEquals(2,result.projects().size());
  var p=result.projects().get(0);assertEquals(3600,p.estimatedSeconds());assertEquals(4800,p.actualSeconds());
  assertEquals(1,p.missingEstimates());assertEquals(1,p.unestimatedPlans());assertEquals(600,p.unlinkedSeconds());
  assertEquals(2,result.weeks().size());
  assertEquals(7*480*60,result.weeks().get(0).capacitySeconds());
  assertEquals(480*60,result.weeks().get(1).capacitySeconds());
  assertEquals(2700,result.weeks().get(0).actualSeconds());assertEquals(3000,result.weeks().get(1).actualSeconds());
  assertEquals(1,result.weeks().get(1).unestimatedPlans());
  assertEquals(600,result.unlinkedSeconds());
  assertEquals(0,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
 }
 @Test void usesLocalStartDayRealHoursLegacyAndZeroCapacity(){
  task("a","","","2026-09-28",60);
  // Same instant with another offset must still be included by the backend local date.
  var start=from.atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.ofHours(-8));
  db.update("INSERT INTO sessions(id,task_id,activity,start_at,end_at,rounded_end_at,focus_seconds,status) VALUES('r','a','Testar',?,?,?,900,'Encerrada')",start.toString(),start.plusMinutes(10).toString(),start.plusMinutes(15).toString());
  session("legacy","a","","",from,120);
  db.update("INSERT INTO settings(key,value) VALUES('planning.capacityMinutes','0')");
  assertEquals(720,analysis.analyse(from,from,"real").tasks().get(0).actualSeconds(),.001);
  assertEquals(1020,analysis.analyse(from,from,"rounded").tasks().get(0).actualSeconds());
  assertEquals(0,analysis.analyse(from,from,"real").weeks().get(0).capacitySeconds());
 }
 @Test void emptyPeriodAndPartialWeekHaveNoInventedEstimates(){
  var result=analysis.analyse(from.plusDays(2),from.plusDays(3),"real");
  assertTrue(result.tasks().isEmpty());assertTrue(result.projects().isEmpty());
  assertEquals(2*480*60,result.weeks().get(0).capacitySeconds());
  assertEquals(0,result.weeks().get(0).plannedSeconds());
 }
 HttpResponse<String> get(String path,boolean token)throws Exception{
  var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path));
  if(token)builder.header("X-Foco-Token","test-secret");
  return HttpClient.newHttpClient().send(builder.GET().build(),HttpResponse.BodyHandlers.ofString());
 }
 @Test void endpointValidatesRangeModeAndToken()throws Exception{
  String path="/api/planning/analysis?from=2026-09-28&to=2026-10-05";
  assertEquals(401,get(path,false).statusCode());assertEquals(200,get(path,true).statusCode());
  for(String invalid:new String[]{"from=bad&to=2026-10-05","from=2026-10-05&to=2026-09-28","from=2025-01-01&to=2026-10-05","from=2026-09-28&to=2026-10-05&hoursMode=bad","to=2026-10-05"})
   assertEquals(400,get("/api/planning/analysis?"+invalid,true).statusCode());
  assertEquals("real",new ObjectMapper().readTree(get(path,true).body()).get("hoursMode").asText());
 }
 @Test void dashboardReturnsAllGroupsAndSubtotalsMatchFilteredTotals()throws Exception{
  for(int i=0;i<14;i++)session("s"+i,null,"Cliente "+i,"Projeto",from,60*(i+1));
  String path="/api/dashboard?hoursMode=real&group=client";
  var data=new ObjectMapper().readTree(get(path,true).body());
  assertEquals(14,data.get("groups").size());
  double sum=0;for(var group:data.get("groups"))sum+=group.get("seconds").asDouble();
  assertEquals(data.get("seconds").asDouble(),sum);
  assertEquals(14,data.get("projects").size());
  var filtered=new ObjectMapper().readTree(get(path+"&client=Cliente%201",true).body());
  assertEquals(1,filtered.get("groups").size());assertEquals(120,filtered.get("seconds").asDouble());
 }
}
