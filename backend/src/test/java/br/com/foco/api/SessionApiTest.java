package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.regex.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-foco-data"})
class SessionApiTest {
    @Value("${local.server.port}") int port;
    @jakarta.annotation.Resource JdbcTemplate db;
    private static final String AUTH="test-secret";
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    @BeforeEach void clean(){db.update("DELETE FROM sessions");db.update("DELETE FROM tasks");db.update("DELETE FROM settings");}

    @Test void apiRequiresLocalTokenButHealthIsPublic() throws Exception {
        assertEquals(401,send("GET","/api/sessions",null,false).statusCode());
        HttpResponse<String> health=send("GET","/api/health",null,false);
        assertEquals(200,health.statusCode());assertTrue(health.body().contains("\"status\":\"ok\""));
    }

    @Test void activeSessionCannotBeDuplicatedAndPauseFinishPreserveRoundedFocus() throws Exception {
        String body="{\"activity\":\"Revisão\",\"client\":\"ACME\",\"project\":\"P1\",\"details\":\"\",\"consultant\":\"\",\"cardReference\":\"\",\"startAt\":\"2026-09-23T10:00:00-03:00\",\"plannedSeconds\":0,\"hourlyRate\":120,\"status\":\"Em andamento\"}";
        HttpResponse<String> first=send("POST","/api/sessions",body,true);assertEquals(200,first.statusCode());String id=id(first.body());
        assertEquals(400,send("POST","/api/sessions",body,true).statusCode());
        assertEquals(200,send("POST","/api/sessions/"+id+"/pause","{\"focusSeconds\":301}",true).statusCode());
        HttpResponse<String> finished=send("POST","/api/sessions/"+id+"/finish","{\"status\":\"Concluída\",\"focusSeconds\":301}",true);
        assertEquals(200,finished.statusCode());assertTrue(finished.body().contains("\"focusSeconds\":600.0"));
        assertEquals(200,send("GET","/api/sessions?client=ACME&minHours=0.1",null,true).statusCode());
    }

    @Test void csvNeutralizesSpreadsheetFormulas() throws Exception {
        db.update("INSERT INTO sessions(id,client,activity,start_at,focus_seconds,status) VALUES('csv1','=HYPERLINK(1)','Atividade','2026-09-23T10:00:00Z',60,'Encerrada')");
        HttpResponse<String> csv=send("GET","/api/sessions/export.csv",null,true);
        assertEquals(200,csv.statusCode());assertTrue(csv.body().contains("'=HYPERLINK(1)"));
    }

    @Test void editingSessionTimesRecalculatesFocusAndRejectsInvalidRanges() throws Exception {
        db.update("INSERT INTO sessions(id,client,activity,start_at,end_at,focus_seconds,status) VALUES('edit-time','ACME','Revisão','2026-09-23T10:00:00-03:00','2026-09-23T10:05:00-03:00',300,'Concluída')");
        String edit="{\"client\":\"ACME\",\"project\":\"P1\",\"activity\":\"Revisão\",\"details\":\"\",\"consultant\":\"Ana\",\"cardReference\":\"\",\"startAt\":\"2026-09-23T09:30:00-03:00\",\"endAt\":\"2026-09-23T11:15:00-03:00\",\"plannedSeconds\":0,\"hourlyRate\":120,\"status\":\"Concluída\"}";
        HttpResponse<String> updated=send("PUT","/api/sessions/edit-time",edit,true);
        assertEquals(200,updated.statusCode(),updated.body());assertTrue(updated.body().contains("\"focusSeconds\":6300.0"));
        assertEquals(6300.0,db.queryForObject("SELECT focus_seconds FROM sessions WHERE id='edit-time'",Double.class));

        String invalid=edit.replace("2026-09-23T11:15:00-03:00","2026-09-23T09:30:00-03:00");
        assertEquals(400,send("PUT","/api/sessions/edit-time",invalid,true).statusCode());
        assertEquals(6300.0,db.queryForObject("SELECT focus_seconds FROM sessions WHERE id='edit-time'",Double.class));
    }

    @Test void taskAccumulatesEntriesAndCannotCompleteUntilSessionIsFinished() throws Exception {
        String task="{\"client\":\"ACME\",\"project\":\"P1\",\"activity\":\"Entrega\",\"details\":\"Revisar\",\"consultant\":\"Solicitante\",\"cardReference\":\"T-42\",\"hourlyRate\":120}";
        HttpResponse<String> created=send("POST","/api/tasks",task,true);assertEquals(200,created.statusCode());assertTrue(created.body().contains("Pendente"));String taskId=id(created.body());
        String session="{\"taskId\":\""+taskId+"\",\"activity\":\"Entrega\",\"client\":\"ACME\",\"project\":\"P1\",\"startAt\":\"2026-09-23T10:00:00-03:00\",\"plannedSeconds\":0,\"status\":\"Em andamento\"}";
        HttpResponse<String> active=send("POST","/api/sessions",session,true);assertEquals(200,active.statusCode());String sessionId=id(active.body());
        assertEquals(taskId,db.queryForObject("SELECT task_id FROM sessions WHERE id=?",String.class,sessionId),active.body());
        assertEquals(1,db.queryForObject("SELECT count(*) FROM sessions WHERE task_id=? AND status IN ('Em andamento','Pausada')",Integer.class,taskId));
        HttpResponse<String> blocked=send("POST","/api/tasks/"+taskId+"/complete","{\"completed\":true}",true);
        assertEquals(400,blocked.statusCode(),blocked.body());
        assertEquals(200,send("POST","/api/sessions/"+sessionId+"/finish","{\"status\":\"Encerrada\",\"focusSeconds\":90}",true).statusCode());
        HttpResponse<String> completed=send("POST","/api/tasks/"+taskId+"/complete","{\"completed\":true}",true);
        assertEquals(200,completed.statusCode());assertTrue(completed.body().contains("Concluída"));assertTrue(completed.body().contains("\"entries\":1"));
    }

    @Test void deletesOneFinishedEntryAndUpdatesTaskAndDashboardTotals() throws Exception {
        db.update("INSERT INTO tasks(id,activity,created_at,updated_at) VALUES('delete-task','Entrega','2026-09-23T10:00:00Z','2026-09-23T10:00:00Z')");
        db.update("INSERT INTO sessions(id,task_id,client,activity,start_at,focus_seconds,status) VALUES('finished','delete-task','ACME','Entrega','2026-09-23T10:00:00Z',3600,'Concluída'),('other','delete-task','ACME','Entrega','2026-09-23T11:00:00Z',1800,'Concluída')");
        assertEquals(401,send("DELETE","/api/sessions/finished",null,false).statusCode());
        assertEquals(200,send("DELETE","/api/sessions/finished",null,true).statusCode());
        assertEquals(0,db.queryForObject("SELECT count(*) FROM sessions WHERE id='finished'",Integer.class));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM sessions WHERE task_id='delete-task'",Integer.class));
        assertTrue(send("GET","/api/dashboard?group=client",null,true).body().contains("\"seconds\":1800.0"));
        assertEquals(404,send("DELETE","/api/sessions/finished",null,true).statusCode());
    }

    @Test void rejectsDeletingActiveAndPausedEntries() throws Exception {
        db.update("INSERT INTO sessions(id,activity,start_at,focus_seconds,status) VALUES('running','A','2026-09-23T10:00:00Z',60,'Em andamento'),('paused','B','2026-09-23T11:00:00Z',60,'Pausada')");
        assertEquals(400,send("DELETE","/api/sessions/running",null,true).statusCode());
        assertEquals(400,send("DELETE","/api/sessions/paused",null,true).statusCode());
        assertEquals(2,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
    }

    @Test void savesAgendaCategoryAndFiltersItWhileRejectingUnknownCategories() throws Exception {
        String body="{\"activity\":\"Reunião de projeto\",\"startAt\":\"2026-09-23T10:00:00-03:00\",\"plannedSeconds\":0,\"status\":\"Em andamento\",\"category\":\"Agenda\"}";
        HttpResponse<String> created=send("POST","/api/sessions",body,true);
        assertEquals(200,created.statusCode(),created.body());assertTrue(created.body().contains("\"category\":\"Agenda\""));
        assertTrue(send("GET","/api/sessions?category=Agenda",null,true).body().contains("Reunião de projeto"));
        assertFalse(send("GET","/api/sessions?category=Normal",null,true).body().contains("Reunião de projeto"));
        assertEquals(400,send("POST","/api/sessions",body.replace("Agenda","Compromisso"),true).statusCode());
    }

    @Test void persistsTaskDueDateAndRejectsInvalidCalendarDates() throws Exception {
        String body="{\"activity\":\"Entrega\",\"dueDate\":\"2026-10-15\"}";
        HttpResponse<String> created=send("POST","/api/tasks",body,true);
        assertEquals(200,created.statusCode(),created.body());assertTrue(created.body().contains("\"dueDate\":\"2026-10-15\""));
        assertEquals("2026-10-15",db.queryForObject("SELECT due_date FROM tasks",String.class));
        assertEquals(400,send("POST","/api/tasks",body.replace("2026-10-15","2026-13-45"),true).statusCode());
    }

    @Test void dashboardReturnsClientTotalsAndExpandableProjectSubtotals() throws Exception {
        db.update("INSERT INTO sessions(id,client,project,activity,consultant,start_at,focus_seconds,hourly_rate,status) VALUES('d1','ACME','P1','A','Ana','2026-09-23T10:00:00Z',3600,'120','Concluída'),('d2','ACME','P2','B','Ana','2026-09-23T11:00:00Z',1800,NULL,'Encerrada')");
        HttpResponse<String> result=send("GET","/api/dashboard?group=client",null,true);
        assertEquals(200,result.statusCode());assertTrue(result.body().contains("\"sessions\":2"));assertTrue(result.body().contains("\"seconds\":5400.0"));assertTrue(result.body().contains("\"projects\":[{"));assertTrue(result.body().contains("P2"));
    }

    @Test void dashboardIncludesLocalDayBoundariesAndRespectsTimestampOffsets() throws Exception {
        db.update("INSERT INTO sessions(id,client,activity,start_at,focus_seconds,status) VALUES('today-start','ACME','A','2026-09-23T03:00:00Z',60,'Concluída'),('today-end','ACME','B','2026-09-24T02:59:59Z',120,'Concluída'),('tomorrow-offset','ACME','C','2026-09-24T02:59:59-03:00',300,'Concluída'),('tomorrow-start','ACME','D','2026-09-24T03:00:00Z',600,'Concluída')");
        HttpResponse<String> result=send("GET","/api/dashboard?group=client&from=2026-09-23T03:00:00Z&to=2026-09-24T03:00:00Z",null,true);
        assertEquals(200,result.statusCode());assertTrue(result.body().contains("\"sessions\":2"),result.body());assertTrue(result.body().contains("\"seconds\":180.0"),result.body());
    }

    @Test void dashboardIdentifiesClientOnlyWhenProjectHasOneClient() throws Exception {
        db.update("INSERT INTO sessions(id,client,project,activity,start_at,focus_seconds,status) VALUES('color-1','ACME','Portal','A','2026-09-23T10:00:00Z',60,'Concluída'),('color-2','Outro','Portal','B','2026-09-23T11:00:00Z',60,'Concluída'),('color-3','ACME','Aplicativo','C','2026-09-23T12:00:00Z',60,'Concluída')");
        HttpResponse<String> result=send("GET","/api/dashboard?group=project",null,true);
        assertEquals(200,result.statusCode(),result.body());
        Matcher shared=Pattern.compile("\\{\\\"name\\\":\\\"Portal\\\"[^}]*}").matcher(result.body());
        assertTrue(shared.find(),result.body());
        assertFalse(shared.group().contains("\"client\""),result.body());
        assertTrue(result.body().contains("\"name\":\"Aplicativo\",\"client\":\"ACME\""),result.body());
    }

    private HttpResponse<String> send(String method,String path,String body,boolean auth) throws Exception {
        HttpRequest.Builder request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(5));
        if(auth)request.header("X-Foco-Token",AUTH);
        if(body==null)request.method(method,HttpRequest.BodyPublishers.noBody());else request.header("Content-Type","application/json").method(method,HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    private static String id(String json){Matcher match=Pattern.compile("\\\"id\\\":\\\"([^\\\"]+)\\\"").matcher(json);if(!match.find())throw new AssertionError("API sem id: "+json);return match.group(1);}
}
