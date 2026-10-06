package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.regex.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-foco-data"})
class RetroactiveApiTest {
    @Value("${local.server.port}") int port;
    @jakarta.annotation.Resource JdbcTemplate db;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private static final String BODY="{\"client\":\"ACME\",\"project\":\"P1\",\"activity\":\"Revisão\",\"details\":\"Trabalho offline\",\"consultant\":\"Ana\",\"cardReference\":\"CARD-1\",\"startAt\":\"2026-09-22T09:00:00-03:00\",\"endAt\":\"2026-09-22T11:00:00-03:00\",\"focusMinutes\":75,\"hourlyRate\":120,\"status\":\"Concluída\"}";

    @BeforeEach void clean(){db.update("DELETE FROM sessions");db.update("DELETE FROM tasks");for(String name:new String[]{"ACME"})db.update("INSERT OR IGNORE INTO catalog_clients(name_key,name) VALUES(?,?)",name.toLowerCase(),name);for(String name:new String[]{"P1"})db.update("INSERT OR IGNORE INTO catalog_projects(name_key,name) VALUES(?,?)",name.toLowerCase(),name);for(String name:new String[]{"Revisão"})db.update("INSERT OR IGNORE INTO catalog_activities(name_key,name) VALUES(?,?)",name.toLowerCase(),name);}

    @Test void createsFinishedEntryWithEffectiveFocusAndAllowsOverlap() throws Exception {
        assertEquals(401,send("POST","/api/sessions/retroactive",BODY,false).statusCode());
        HttpResponse<String> first=send("POST","/api/sessions/retroactive",BODY,true);
        assertEquals(200,first.statusCode(),first.body());
        assertTrue(first.body().contains("\"focusSeconds\":4500.0"));
        assertTrue(first.body().contains("\"status\":\"Concluída\""));
        String metadataEdit=BODY.replace("Trabalho offline","Descrição corrigida").replace("\"focusMinutes\":75","\"plannedSeconds\":0");
        HttpResponse<String> edited=send("PUT","/api/sessions/"+id(first.body()),metadataEdit,true);
        assertEquals(200,edited.statusCode(),edited.body());
        assertTrue(edited.body().contains("\"focusSeconds\":4500.0"));
        assertEquals(200,send("POST","/api/sessions/retroactive",BODY,true).statusCode());
        assertEquals(2,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
        assertTrue(send("GET","/api/dashboard?group=client",null,true).body().contains("\"seconds\":9000.0"));
    }

    @Test void linksRetroactiveEntryToCompletedTask() throws Exception {
        String task="{\"client\":\"ACME\",\"project\":\"P1\",\"activity\":\"Revisão\"}";
        String taskId=id(send("POST","/api/tasks",task,true).body());
        assertEquals(200,send("POST","/api/tasks/"+taskId+"/complete","{\"completed\":true}",true).statusCode());
        String linked=BODY.replace("{\"client\"","{\"taskId\":\""+taskId+"\",\"client\"");
        HttpResponse<String> created=send("POST","/api/sessions/retroactive",linked,true);
        assertEquals(200,created.statusCode(),created.body());
        assertEquals(taskId,db.queryForObject("SELECT task_id FROM sessions WHERE id=?",String.class,id(created.body())));
        HttpResponse<String> taskTotals=send("GET","/api/tasks/"+taskId,null,true);
        assertTrue(taskTotals.body().contains("\"entries\":1"));
        assertTrue(taskTotals.body().contains("\"focusSeconds\":4500.0"));
    }

    @Test void rejectsInvalidDurationFutureTimeStatusAndMissingTask() throws Exception {
        assertEquals(400,send("POST","/api/sessions/retroactive",BODY.replace("\"focusMinutes\":75","\"focusMinutes\":121"),true).statusCode());
        assertEquals(400,send("POST","/api/sessions/retroactive",BODY.replace("\"status\":\"Concluída\"","\"status\":\"Em andamento\""),true).statusCode());
        assertEquals(400,send("POST","/api/sessions/retroactive",BODY.replace("2026-09-22T11:00:00-03:00","2026-09-22T09:00:00-03:00"),true).statusCode());
        String future=OffsetDateTime.now().plusDays(1).toString();
        assertEquals(400,send("POST","/api/sessions/retroactive",BODY.replace("2026-09-22T11:00:00-03:00",future),true).statusCode());
        String missing=BODY.replace("{\"client\"","{\"taskId\":\"missing\",\"client\"");
        assertEquals(400,send("POST","/api/sessions/retroactive",missing,true).statusCode());
        assertEquals(0,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
    }

    private HttpResponse<String> send(String method,String path,String body,boolean auth) throws Exception {
        HttpRequest.Builder request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(5));
        if(auth)request.header("X-Foco-Token","test-secret");
        if(body==null)request.method(method,HttpRequest.BodyPublishers.noBody());
        else request.header("Content-Type","application/json").method(method,HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    private static String id(String json){Matcher match=Pattern.compile("\\\"id\\\":\\\"([^\\\"]+)\\\"").matcher(json);if(!match.find())throw new AssertionError("API sem id: "+json);return match.group(1);}
}
