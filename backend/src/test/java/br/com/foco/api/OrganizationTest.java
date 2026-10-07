package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-organization-data"})
class OrganizationTest {
 @Value("${local.server.port}") int port;
 @jakarta.annotation.Resource JdbcTemplate db;
 @jakarta.annotation.Resource TaskTemplatesController templates;
 @jakarta.annotation.Resource TaskController tasks;
 @jakarta.annotation.Resource CatalogService catalogs;
 @BeforeEach void clean(){
  db.execute("DROP TRIGGER IF EXISTS reject_organization_history");
  for(String t:new String[]{"session_work_intervals","sessions","task_checklist","task_archive","project_archive","template_options","task_templates","task_plans","tasks","change_history","catalog_projects","catalog_activities"})db.update("DELETE FROM "+t);
  db.update("INSERT INTO catalog_activities VALUES('entrega','Entrega')");
  db.update("INSERT INTO catalog_projects(name_key,name) VALUES('área','ÁREA')");
  for(String id:List.of("a","b"))db.update("INSERT INTO tasks(id,project,activity,due_date,created_at,updated_at) VALUES(?,'ÁREA','Entrega','2026-12-31','2026-01-01','2026-01-01')",id);
 }
 HttpResponse<String> call(String method,String path,String body)throws Exception{return call(method,path,body,true);}
 HttpResponse<String> call(String method,String path,String body,boolean token)throws Exception{
  var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
  if(token)builder.header("X-Foco-Token","test-secret");
  return HttpClient.newHttpClient().send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
 }
 String projectPath(){return "/api/catalogs/projects/"+URLEncoder.encode("ÁREA",java.nio.charset.StandardCharsets.UTF_8)+"/archive";}
 void session(String status){db.update("INSERT INTO sessions(id,task_id,project,activity,start_at,focus_seconds,status) VALUES('s','a','ÁREA','Entrega','2026-01-01T09:00:00-03:00',600,?)",status);}
 @Test void checklistCrudKeepsTimeTaskStateAndDeadlineAndHasOwnershipValidation()throws Exception{
  session("Encerrada");
  var created=call("POST","/api/tasks/a/checklist","{\"title\":\" Conferir testes \",\"completed\":false}");assertEquals(200,created.statusCode());
  String id=new ObjectMapper().readTree(created.body()).get("id").asText(),path="/api/tasks/a/checklist/"+id;
  assertEquals(200,call("PUT",path,"{\"title\":\"Validar entrega\",\"completed\":true}").statusCode());
  assertEquals(1,tasks.get("a").checklistCompleted());assertEquals(1,tasks.get("a").checklistTotal());
  assertFalse(tasks.get("a").completed());assertEquals(600,tasks.get("a").focusSeconds());assertEquals(LocalDate.parse("2026-12-31"),tasks.get("a").dueDate());
  assertEquals(400,call("PUT","/api/tasks/b/checklist/"+id,"{\"title\":\"Outra\",\"completed\":false}").statusCode());
  assertEquals(400,call("POST","/api/tasks/a/checklist","{\"title\":\" \",\"completed\":false}").statusCode());
  assertEquals(200,call("DELETE",path,null).statusCode());assertEquals(0,tasks.get("a").checklistTotal());
  assertEquals(3,db.queryForObject("SELECT count(*) FROM change_history WHERE entity_type='task' AND entity_id='a'",Integer.class));
 }
 @Test void checklistRequiresTokenAndArchiveIsReadOnly()throws Exception{
  assertEquals(401,call("POST","/api/tasks/a/checklist","{\"title\":\"Passo\"}",false).statusCode());
  assertEquals(200,call("PUT","/api/tasks/a/archive","{\"archived\":true}").statusCode());
  assertEquals(400,call("POST","/api/tasks/a/checklist","{\"title\":\"Passo\"}").statusCode());
  assertEquals(200,call("GET","/api/tasks/a/checklist",null).statusCode());
 }
 @Test void archivesAndRestoresWithoutLosingReportsAndDoesNotReclaimPriority()throws Exception{
  session("Encerrada");
  db.update("INSERT INTO task_plans(task_id,planned_date,priority,next_action) VALUES('a','2026-10-02',1,'Conferir')");
  String summary=call("GET","/api/dashboard",null).body();
  assertEquals(200,call("PUT","/api/tasks/a/archive","{\"archived\":true}").statusCode());
  assertTrue(tasks.get("a").archived());assertEquals(1,new ObjectMapper().readTree(call("GET","/api/tasks",null).body()).size());
  assertEquals(1,new ObjectMapper().readTree(call("GET","/api/tasks?archive=archived",null).body()).size());
  assertEquals(summary,call("GET","/api/dashboard",null).body());
  assertEquals(200,call("PUT","/api/tasks/a/archive","{\"archived\":false}").statusCode());
  assertFalse(tasks.get("a").archived());assertEquals(0,db.queryForObject("SELECT priority FROM task_plans WHERE task_id='a'",Integer.class));
  assertEquals("Conferir",db.queryForObject("SELECT next_action FROM task_plans WHERE task_id='a'",String.class));
  assertEquals(600,tasks.get("a").focusSeconds());assertEquals(summary,call("GET","/api/dashboard",null).body());
 }
 @Test void projectArchiveUsesUnicodeNamesAndDoesNotRestoreIndividualArchives()throws Exception{
  call("PUT","/api/tasks/a/archive","{\"archived\":true}");
  assertEquals(200,call("PUT",projectPath(),"{\"archived\":true}").statusCode());
  assertTrue(tasks.get("b").projectArchived());assertTrue(catalogs.snapshot().archivedProjects().contains("ÁREA"));
  assertEquals(0,new ObjectMapper().readTree(call("GET","/api/tasks",null).body()).size());
  assertThrows(IllegalArgumentException.class,()->tasks.create(new TaskInput("","ÁREA","Entrega","","","",null,null)));
  assertEquals(400,call("PUT","/api/planning/plans/b","{\"plannedDate\":\"2026-10-02\",\"priority\":false,\"state\":\"Pendente\"}").statusCode());
  assertEquals(200,call("PUT",projectPath(),"{\"archived\":false}").statusCode());
  assertTrue(tasks.get("a").archived());assertFalse(tasks.get("b").projectArchived());
  assertEquals(1,new ObjectMapper().readTree(call("GET","/api/tasks",null).body()).size());
 }
 @Test void archiveRejectsRunningAndPausedSessionsIncludingDifferentHistoricalProject()throws Exception{
  for(String state:List.of("Em andamento","Pausada")){
   db.update("DELETE FROM sessions");session(state);db.update("UPDATE sessions SET project='' WHERE id='s'");
   assertEquals(400,call("PUT","/api/tasks/a/archive","{\"archived\":true}").statusCode());
   assertEquals(400,call("PUT",projectPath(),"{\"archived\":true}").statusCode());
  }
  assertFalse(tasks.get("a").archived());assertFalse(tasks.get("a").projectArchived());
 }
 @Test void projectRenameAndMergeRetainArchiveState()throws Exception{
  call("PUT",projectPath(),"{\"archived\":true}");
  catalogs.rename(CatalogType.PROJECT,"ÁREA","Novo");assertTrue(tasks.get("a").projectArchived());
  catalogs.create(CatalogType.PROJECT,"Destino");catalogs.merge(CatalogType.PROJECT,"Novo","Destino");
  assertTrue(tasks.get("a").projectArchived());assertEquals(List.of("Destino"),catalogs.snapshot().archivedProjects());
 }
 @Test void historyFailureRollsBackChecklistArchiveAndTemplateEdits()throws Exception{
  String template=templates.create(new TemplateInput("a","Modelo","daily",LocalDate.now())).id();
  db.execute("CREATE TRIGGER reject_organization_history BEFORE INSERT ON change_history BEGIN SELECT RAISE(ABORT,'history failure'); END");
  try{
   assertTrue(call("POST","/api/tasks/a/checklist","{\"title\":\"Passo\"}").statusCode()>=400);
   assertTrue(call("PUT","/api/tasks/a/archive","{\"archived\":true}").statusCode()>=400);
   assertTrue(call("PUT",projectPath(),"{\"archived\":true}").statusCode()>=400);
   assertTrue(call("PUT","/api/planning/templates/"+template,"{\"sourceId\":\"a\",\"name\":\"Alterado\",\"recurrence\":\"none\"}").statusCode()>=400);
   assertEquals(0,tasks.get("a").checklistTotal());assertFalse(tasks.get("a").archived());assertFalse(tasks.get("a").projectArchived());
   assertEquals("Modelo",templates.list().get(0).name());
  }finally{db.execute("DROP TRIGGER reject_organization_history");}
 }
 @Test void pausedTemplateCanBeEditedAndUsedManuallyButNeverGenerated()throws Exception{
  LocalDate now=LocalDate.now();String id=templates.create(new TemplateInput("a","Modelo","daily",now.minusDays(10))).id();
  String body="{\"sourceId\":\"a\",\"name\":\"Renomeado\",\"recurrence\":\"weekly\",\"nextDate\":\""+now+"\",\"paused\":true}";
  assertEquals(200,call("PUT","/api/planning/templates/"+id,body).statusCode());
  assertTrue(templates.list().get(0).paused());assertEquals("Renomeado",templates.list().get(0).name());
  assertEquals("[]",call("POST","/api/planning/templates/generate",null).body());
  assertEquals(now,templates.list().get(0).nextDate());
  assertEquals(200,call("POST","/api/planning/templates/"+id+"/use",null).statusCode());
  assertEquals(200,call("PUT","/api/planning/templates/"+id,body.replace("true","false")).statusCode());
  assertEquals(1,new ObjectMapper().readTree(call("POST","/api/planning/templates/generate",null).body()).size());
  assertEquals("[]",call("POST","/api/planning/templates/generate",null).body());
 }
 @Test void archivedOriginSkipsGenerationWithoutAdvancingAndBlocksManualUse()throws Exception{
  LocalDate now=LocalDate.now();String id=templates.create(new TemplateInput("a","Modelo","daily",now)).id();
  call("PUT",projectPath(),"{\"archived\":true}");
  assertEquals("[]",call("POST","/api/planning/templates/generate",null).body());assertEquals(now,templates.list().get(0).nextDate());
  assertEquals(400,call("POST","/api/planning/templates/"+id+"/use",null).statusCode());
  call("PUT",projectPath(),"{\"archived\":false}");
  assertEquals(1,new ObjectMapper().readTree(call("POST","/api/planning/templates/generate",null).body()).size());
 }
 @Test void newSchedulesValidateDatesDaysAndMonthlyDayAndRequireToken()throws Exception{
  String root="/api/planning/templates";
  for(String fields:List.of("\"recurrence\":\"weekdays\",\"weekdays\":[]","\"recurrence\":\"weekdays\",\"weekdays\":[8]","\"recurrence\":\"workdays\",\"nextDate\":\"2026-10-03\"","\"recurrence\":\"monthly\",\"monthDay\":32","\"recurrence\":\"monthly\",\"monthDay\":31,\"nextDate\":\"2026-10-02\"")){
   assertEquals(400,call("POST",root,"{\"sourceId\":\"a\",\"name\":\"Modelo\","+fields+"}").statusCode());
  }
  assertEquals(401,call("PUT","/api/tasks/a/archive","{\"archived\":true}",false).statusCode());
  assertEquals(401,call("PUT",projectPath(),"{\"archived\":true}",false).statusCode());
  assertEquals(401,call("POST",root,"{\"sourceId\":\"a\",\"name\":\"Modelo\",\"recurrence\":\"none\"}",false).statusCode());
 }
 @Test void generationAdvancesEachNewScheduleAndNeverAccumulatesMissedDates()throws Exception{
  templates.create(new TemplateInput("a","Dias úteis","workdays",LocalDate.parse("2026-09-07"),false,List.of(),null));
  templates.create(new TemplateInput("a","Específica","weekdays",LocalDate.parse("2026-09-07"),false,List.of(1,3),null));
  templates.create(new TemplateInput("a","Mensal","monthly",LocalDate.parse("2026-01-31"),false,List.of(),31));
  assertEquals(3,templates.generateFor(LocalDate.parse("2026-10-02")).size());
  var byName=new HashMap<String,LocalDate>();templates.list().forEach(t->byName.put(t.name(),t.nextDate()));
  assertEquals(LocalDate.parse("2026-10-05"),byName.get("Dias úteis"));assertEquals(LocalDate.parse("2026-10-05"),byName.get("Específica"));assertEquals(LocalDate.parse("2026-10-31"),byName.get("Mensal"));
  assertTrue(templates.generateFor(LocalDate.parse("2026-10-02")).isEmpty());
 }
}
