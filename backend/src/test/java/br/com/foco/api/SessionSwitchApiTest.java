package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-switch-data"})
class SessionSwitchApiTest {
    @Value("${local.server.port}") int port;
    @jakarta.annotation.Resource JdbcTemplate db;
    @BeforeEach void clean(){
        db.update("DELETE FROM task_plans");db.update("DELETE FROM session_work_intervals");db.update("DELETE FROM sessions");db.update("DELETE FROM tasks");
        db.update("INSERT OR IGNORE INTO catalog_activities(name_key,name) VALUES('entrega','Entrega')");
        db.update("INSERT INTO tasks(id,activity,completed,created_at,updated_at) VALUES('next','Entrega',0,'2026-09-22T09:00:00Z','2026-09-22T09:00:00Z')");
        db.update("INSERT INTO sessions(id,activity,start_at,focus_seconds,status) VALUES('old','Entrega','2026-09-22T09:00:00Z',301,'Em andamento')");
    }
    private String body(String activity){return "{\"previousId\":\"old\",\"focusSeconds\":301,\"next\":{\"taskId\":\"next\",\"activity\":\""+activity+"\",\"startAt\":\"2026-09-22T10:00:00Z\",\"status\":\"Em andamento\",\"plannedSeconds\":0}}";}
    @Test void switchStopsRunningEntryAndStartsTaskAtTheSameBoundary() throws Exception {assertSwitch();}
    @Test void switchAlsoInterruptsPausedEntry() throws Exception {
        db.update("UPDATE sessions SET status='Pausada' WHERE id='old'");assertSwitch();
    }
    private void assertSwitch() throws Exception {
        HttpResponse<String> response=post("/api/sessions/switch",body("Entrega"));
        assertEquals(200,response.statusCode(),response.body());
        assertEquals("Interrompida",db.queryForObject("SELECT status FROM sessions WHERE id='old'",String.class));
        assertEquals(360,db.queryForObject("SELECT focus_seconds FROM sessions WHERE id='old'",Integer.class));
        assertEquals(2,db.queryForObject("SELECT rounding_version FROM sessions WHERE id='old'",Integer.class));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM sessions WHERE status='Em andamento' AND task_id='next'",Integer.class));
        assertEquals(db.queryForObject("SELECT end_at FROM sessions WHERE id='old'",String.class),db.queryForObject("SELECT start_at FROM sessions WHERE task_id='next'",String.class));
        assertEquals(0,db.queryForObject("SELECT completed FROM tasks WHERE id='next'",Integer.class));
        assertEquals(400,post("/api/sessions/switch",body("Entrega")).statusCode());
        post("/api/sessions/old/tick","{\"focusSeconds\":302}");
        assertEquals(360,db.queryForObject("SELECT focus_seconds FROM sessions WHERE id='old'",Integer.class));
    }
    @Test void invalidNewActivityRollsBackTheInterruption() throws Exception {
        assertEquals(400,post("/api/sessions/switch",body("Inexistente")).statusCode());
        assertEquals("Em andamento",db.queryForObject("SELECT status FROM sessions WHERE id='old'",String.class));
        assertNull(db.queryForObject("SELECT end_at FROM sessions WHERE id='old'",String.class));
        assertEquals(301,db.queryForObject("SELECT focus_seconds FROM sessions WHERE id='old'",Integer.class));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
    }
    private void linkPrevious(){
        db.update("UPDATE sessions SET task_id='next' WHERE id='old'");
        db.update("INSERT INTO task_plans(task_id,planned_date,priority,next_action,waiting_for,review_date) VALUES('next','2026-10-01',2,'Antes','Equipe','2026-10-02')");
    }
    @Test void finishSavesNextActionWithoutChangingPlanning() throws Exception {
        linkPrevious();
        assertEquals(200,post("/api/sessions/old/finish","{\"status\":\"Encerrada\",\"focusSeconds\":301,\"nextAction\":\"  Continuar testes  \"}").statusCode());
        assertEquals("Continuar testes",db.queryForObject("SELECT next_action FROM task_plans WHERE task_id='next'",String.class));
        assertEquals(2,db.queryForObject("SELECT priority FROM task_plans WHERE task_id='next'",Integer.class));
        assertEquals("Equipe",db.queryForObject("SELECT waiting_for FROM task_plans WHERE task_id='next'",String.class));
    }
    @Test void omittedActionPreservesExistingText() throws Exception {
        linkPrevious();assertEquals(200,post("/api/sessions/old/finish","{\"status\":\"Concluída\",\"focusSeconds\":301}").statusCode());
        assertEquals("Antes",db.queryForObject("SELECT next_action FROM task_plans WHERE task_id='next'",String.class));
    }
    @Test void emptyActionClearsTextDuringSwitch() throws Exception {
        linkPrevious();assertEquals(200,post("/api/sessions/switch",body("Entrega").replace("\"previousId\"","\"nextAction\":\"\",\"previousId\"")).statusCode());
        assertEquals("",db.queryForObject("SELECT next_action FROM task_plans WHERE task_id='next'",String.class));
    }
    @Test void invalidSwitchRollsBackNextActionToo() throws Exception {
        linkPrevious();assertEquals(400,post("/api/sessions/switch",body("Inexistente").replace("\"previousId\"","\"nextAction\":\"Depois\",\"previousId\"")).statusCode());
        assertEquals("Antes",db.queryForObject("SELECT next_action FROM task_plans WHERE task_id='next'",String.class));
        assertEquals("Em andamento",db.queryForObject("SELECT status FROM sessions WHERE id='old'",String.class));
    }
    @Test void oversizedActionDoesNotFinishSession() throws Exception {
        linkPrevious();assertEquals(400,post("/api/sessions/old/finish","{\"status\":\"Encerrada\",\"focusSeconds\":301,\"nextAction\":\""+"x".repeat(1001)+"\"}").statusCode());
        assertEquals("Em andamento",db.queryForObject("SELECT status FROM sessions WHERE id='old'",String.class));
    }
    @Test void nextActionCreatesAnUnscheduledPlan() throws Exception {
        db.update("UPDATE sessions SET task_id='next' WHERE id='old'");
        assertEquals(200,post("/api/sessions/old/finish","{\"status\":\"Encerrada\",\"focusSeconds\":301,\"nextAction\":\"Continuar\"}").statusCode());
        assertEquals("Continuar",db.queryForObject("SELECT next_action FROM task_plans WHERE task_id='next'",String.class));
        assertNull(db.queryForObject("SELECT planned_date FROM task_plans WHERE task_id='next'",String.class));
        assertEquals(0,db.queryForObject("SELECT priority FROM task_plans WHERE task_id='next'",Integer.class));
    }
    @Test void actionWithoutTaskDoesNotFinishSession() throws Exception {
        assertEquals(400,post("/api/sessions/old/finish","{\"status\":\"Encerrada\",\"focusSeconds\":301,\"nextAction\":\"Continuar\"}").statusCode());
        assertEquals("Em andamento",db.queryForObject("SELECT status FROM sessions WHERE id='old'",String.class));
    }
    private HttpResponse<String> post(String path,String body)throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path))
            .header("X-Foco-Token","test-secret").header("Content-Type","application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
}
