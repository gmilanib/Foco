package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-second-wave-data"})
class SecondWaveTest {
    @Value("${local.server.port}") int port;
    @jakarta.annotation.Resource JdbcTemplate db;
    @BeforeEach void clean(){
        db.update("INSERT OR IGNORE INTO catalog_activities(name_key,name) VALUES('revisão','Revisão')");
        db.execute("DROP TRIGGER IF EXISTS reject_history");
        db.update("DELETE FROM session_work_intervals");db.update("DELETE FROM sessions");
        db.update("DELETE FROM tasks");db.update("DELETE FROM change_history");
        for(String id:new String[]{"a","b"})db.update("INSERT INTO tasks(id,activity,created_at,updated_at,completed) VALUES(?,'Teste','2026-10-01','2026-10-01',?)",id,id.equals("b")?1:0);
        db.update("INSERT INTO sessions(id,task_id,activity,start_at,end_at,rounded_end_at,focus_seconds,hourly_rate,status) VALUES('s','a','Teste','2026-10-01T09:00:00-03:00','2026-10-01T09:15:00-03:00','2026-10-01T09:18:00-03:00',600,'120','Encerrada')");
    }
    HttpResponse<String> call(String method,String path,String body,boolean token)throws Exception{
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
        if(token)builder.header("X-Foco-Token","test-secret");
        return HttpClient.newHttpClient().send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
    JsonNode get(String path)throws Exception{var r=call("GET",path,null,true);assertEquals(200,r.statusCode(),r.body());return new ObjectMapper().readTree(r.body());}
    int link(String task)throws Exception{return call("PUT","/api/sessions/s/task","{\"taskId\":"+(task==null?"null":"\""+task+"\"")+"}",true).statusCode();}
    @Test void reportsFiltersTasksAndCsvUseSameHoursWithoutChangingSavedFocus()throws Exception{
        assertEquals(1,get("/api/sessions?hoursMode=rounded&minHours=0.15").size());
        assertEquals(0,get("/api/sessions?hoursMode=real&minHours=0.15").size());
        assertEquals(0,get("/api/sessions?hoursMode=real&minValue=15").size());
        assertEquals(1,get("/api/sessions?hoursMode=real&maxValue=15").size());
        var task=get("/api/tasks/a");assertEquals(600,task.get("focusSeconds").asDouble());assertEquals(420,task.get("realFocusSeconds").asDouble(),0.001);
        var csv=call("GET","/api/sessions/export.csv?hoursMode=real&endMode=rounded&showValues=true",null,true);
        assertEquals(200,csv.statusCode());assertTrue(csv.body().contains(";420.0;"));assertTrue(csv.body().contains(";14.00"));assertTrue(csv.body().contains("09:18"));
        assertEquals(600,get("/api/sessions/s").get("focusSeconds").asDouble());
        assertEquals(400,call("GET","/api/sessions?hoursMode=wrong",null,true).statusCode());
        assertEquals(400,call("GET","/api/sessions/export.csv?hoursMode=wrong",null,true).statusCode());
    }
    @Test void linksCompletedTaskUnlinksAndRecordsBothTaskTotalsWithoutChangingSessionData()throws Exception{
        var before=get("/api/sessions/s");assertEquals(200,link("b"));
        var after=get("/api/sessions/s");
        for(String key:new String[]{"startAt","endAt","roundedEndAt","focusSeconds","hourlyRate","activity","status"})assertEquals(before.get(key),after.get(key));
        assertEquals(0,get("/api/tasks/a").get("entries").asInt());assertEquals(1,get("/api/tasks/b").get("entries").asInt());
        assertEquals(3,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
        assertEquals(200,link("b"));assertEquals(3,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
        assertEquals(200,link(null));assertNull(db.queryForObject("SELECT task_id FROM sessions WHERE id='s'",String.class));
        assertEquals(0,get("/api/tasks/b").get("entries").asInt());
    }
    @Test void rejectsUnknownTasksActiveSessionsAndUnauthenticatedWrites()throws Exception{
        assertEquals(400,link("missing"));assertEquals("a",get("/api/sessions/s").get("taskId").asString());
        assertEquals(401,call("PUT","/api/sessions/s/task","{\"taskId\":\"b\"}",false).statusCode());
        for(String status:new String[]{"Em andamento","Pausada"}){db.update("UPDATE sessions SET status=? WHERE id='s'",status);assertEquals(400,link("b"));}
        assertEquals(0,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
    }
    @Test void rollsBackLinkWhenHistoryCannotBeWritten()throws Exception{
        db.execute("CREATE TRIGGER reject_history BEFORE INSERT ON change_history BEGIN SELECT RAISE(ABORT,'test history failure'); END");
        try{assertTrue(link("b")>=400);assertEquals("a",get("/api/sessions/s").get("taskId").asString());}
        finally{db.execute("DROP TRIGGER reject_history");}
    }
    @Test void gapBookingRechecksAvailabilityAndRejectsDuplicate()throws Exception{
        db.update("INSERT INTO sessions(id,activity,start_at,end_at,focus_seconds,status) VALUES('later','Teste','2026-10-01T11:00:00-03:00','2026-10-01T12:00:00-03:00',3600,'Encerrada')");
        String body="""
            {"activity":"Revisão","startAt":"2026-10-01T10:00:00-03:00","endAt":"2026-10-01T11:00:00-03:00","focusMinutes":60,"status":"Encerrada","category":"Normal"}
            """;
        var first=call("POST","/api/sessions/retroactive/gap",body,true);assertEquals(200,first.statusCode(),first.body());
        assertEquals(400,call("POST","/api/sessions/retroactive/gap",body,true).statusCode());
        assertEquals(3,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
    }
}
