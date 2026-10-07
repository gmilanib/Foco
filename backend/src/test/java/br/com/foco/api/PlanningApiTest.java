package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-planning-data"})
class PlanningApiTest {
    @Value("${local.server.port}") int port;
    @jakarta.annotation.Resource JdbcTemplate db;
    @jakarta.annotation.Resource PlanningController planning;
    @jakarta.annotation.Resource TaskController tasks;
    @jakarta.annotation.Resource TaskTemplatesController templates;
    LocalDate today=LocalDate.now();
    @BeforeEach void clean(){
        for(String table:new String[]{"session_work_intervals","sessions","task_templates","task_plans","task_inbox","daily_reviews","tasks","change_history"})db.update("DELETE FROM "+table);
        db.update("INSERT OR IGNORE INTO catalog_activities(name_key,name) VALUES('entrega','Entrega')");
        for(int i=1;i<=4;i++)db.update("INSERT INTO tasks(id,activity,details,due_date,created_at,updated_at) VALUES(?,'Entrega','Passo específico','2026-12-01','2026-01-01','2026-01-01')","t"+i);
        db.update("INSERT INTO settings(key,value) VALUES('planning.priorityLimit','3') ON CONFLICT(key) DO UPDATE SET value='3'");
    }
    PlanInput priority(LocalDate day){return new PlanInput(day,true,"Reproduzir erro","",null,"Pendente");}
    @Test void limitsPrioritiesPerDayAndKeepsDeadlineSeparate(){
        for(int i=1;i<=3;i++)planning.plan("t"+i,priority(today));
        assertThrows(IllegalArgumentException.class,()->planning.plan("t4",priority(today)));
        assertEquals(LocalDate.parse("2026-12-01"),tasks.get("t1").dueDate());
        planning.plan("t4",priority(today.plusDays(1)));
        assertEquals(4,planning.plans().size());
        planning.move("t2",new MoveInput(-1));
        assertEquals(1,planning.plans().stream().filter(p->p.taskId().equals("t2")).findFirst().orElseThrow().priority());
    }
    @Test void waitingClearsPriorityAndReopeningDoesNotExceedLimit(){
        planning.plan("t1",priority(today));
        planning.plan("t1",new PlanInput(today,false,"Cobrar retorno","Ana",today.plusDays(1),"Aguardando"));
        assertEquals("Aguardando",tasks.get("t1").state());
        assertEquals("Ana",planning.plans().get(0).waitingFor());
        for(int i=2;i<=4;i++)planning.plan("t"+i,priority(today));
        tasks.changeStatus("t1",new TaskStateInput("Pendente"));
        assertThrows(IllegalArgumentException.class,()->planning.plan("t1",priority(today)));
        tasks.complete("t2",new CompletionInput(true));
        planning.plan("t1",priority(today));
    }
    @Test void invalidCaptureConversionRetainsInboxAndValidConversionIsNotRepeated()throws Exception{
        InboxRow item=planning.capture(new CaptureInput("Revisar testes"));
        assertEquals(400,send("/inbox/"+item.id()+"/convert","POST","{\"activity\":\"Ausente\"}").statusCode());
        assertEquals(1,planning.inbox().size());assertEquals(4,tasks.list("","Todas").size());
        assertEquals(200,send("/inbox/"+item.id()+"/convert","POST","{\"activity\":\"Entrega\",\"details\":\"Revisar testes\"}").statusCode());
        assertTrue(planning.inbox().isEmpty());assertEquals(5,tasks.list("","Todas").size());
        assertEquals(400,send("/inbox/"+item.id()+"/convert","POST","{\"activity\":\"Entrega\"}").statusCode());
        assertEquals(5,tasks.list("","Todas").size());
    }
    @Test void rejectsInvalidInputAndRequiresToken()throws Exception{
        assertEquals(400,send("/inbox","POST","{\"title\":\"   \"}").statusCode());
        assertEquals(400,send("/inbox","POST","{\"title\":\""+"a".repeat(1001)+"\"}").statusCode());
        assertEquals(400,send("/plans/t1","PUT","{\"state\":\"Pendente\",\"priority\":true}").statusCode());
        assertEquals(400,send("/templates","POST","{\"sourceId\":\"t1\",\"name\":\"Modelo\",\"recurrence\":\"daily\"}").statusCode());
        var response=HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/planning/plans")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertTrue(response.statusCode()==401||response.statusCode()==403);
    }
    @Test void completionOfActiveTaskRollsBackPlanning()throws Exception{
        planning.plan("t1",priority(today));
        db.update("INSERT INTO sessions(id,task_id,activity,start_at,status) VALUES('active','t1','Entrega','2026-01-01T09:00:00Z','Pausada')");
        assertEquals(400,send("/plans/t1","PUT","{\"state\":\"Concluída\",\"priority\":false,\"nextAction\":\"Não persistir\"}").statusCode());
        assertEquals("Reproduzir erro",planning.plans().get(0).nextAction());
        assertFalse(tasks.get("t1").completed());
    }
    @Test void manualRecurrenceGeneratesOnceAndAdvancesWithoutBacklog(){
        templates.create(new TemplateInput("t1","Diária","daily",today.minusDays(10)));
        templates.create(new TemplateInput("t2","Semanal","weekly",today.minusDays(15)));
        templates.create(new TemplateInput("t3","Futura","daily",today.plusDays(1)));
        assertEquals(4,tasks.list("","Todas").size()); // Reading never generates tasks.
        var created=templates.generate();assertEquals(2,created.size());
        assertTrue(created.stream().allMatch(t->!t.completed()&&t.dueDate()==null&&t.entries()==0));
        assertTrue(planning.plans().stream().allMatch(p->today.equals(p.plannedDate())&&p.priority()==0));
        assertTrue(templates.list().stream().allMatch(t->t.nextDate().isAfter(today)));
        assertTrue(templates.generate().isEmpty());
        assertEquals(6,tasks.list("","Todas").size());
    }
    @Test void templateUsesCurrentSourceAndRemovingItPreservesCreatedTasks(){
        var template=templates.create(new TemplateInput("t1","Revisão","none",null));
        db.update("UPDATE tasks SET details='Texto atualizado',completed=1,state='Concluída' WHERE id='t1'");
        var created=templates.use(template.id());assertEquals("Texto atualizado",created.details());
        assertFalse(created.completed());assertNull(created.dueDate());
        templates.delete(template.id());assertEquals(created.id(),tasks.get(created.id()).id());
    }
    @Test void reviewPersistsWithoutClosingTasksAndRejectsFuture(){
        assertNull(planning.review(today).reviewedAt());
        planning.review(today,new ReviewInput("Continuar amanhã"));
        assertEquals("Continuar amanhã",planning.review(today).notes());
        assertNotNull(planning.review(today).reviewedAt());
        assertFalse(tasks.get("t1").completed());
        assertThrows(IllegalArgumentException.class,()->planning.review(today.plusDays(1),new ReviewInput("Futura")));
    }
    private HttpResponse<String> send(String path,String method,String body)throws Exception{
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/planning"+path))
                .header("X-Foco-Token","test-secret").header("Content-Type","application/json")
                .method(method,HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
}
