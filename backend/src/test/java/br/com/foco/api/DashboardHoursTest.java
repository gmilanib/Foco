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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-dashboard-hours-data"})
class DashboardHoursTest {
    @Value("${local.server.port}") int port;
    @jakarta.annotation.Resource JdbcTemplate db;
    @BeforeEach void clean(){db.update("DELETE FROM session_work_intervals");db.update("DELETE FROM sessions");}
    void entry(String id,double focus,String end,String rounded,String rate){
        db.update("INSERT INTO sessions(id,client,project,activity,consultant,start_at,end_at,rounded_end_at,focus_seconds,hourly_rate,status) VALUES(?,'ACME','Portal','Revisão','Ana','2026-10-01T09:00:00-03:00',?,?,?,?,?)",id,end,rounded,focus,rate,end==null?"Pausada":"Encerrada");
    }
    HttpResponse<String> get(String query)throws Exception{
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/dashboard?"+query)).header("X-Foco-Token","test-secret").GET().build(),HttpResponse.BodyHandlers.ofString());
    }
    JsonNode summary(String query)throws Exception{
        var response=get(query);assertEquals(200,response.statusCode(),response.body());return new ObjectMapper().readTree(response.body());
    }
    @Test void realHoursRemoveOnlyRoundingAndUpdateCostsAndEveryGrouping()throws Exception{
        // Fifteen minutes elapsed, seven minutes focused: the rest were pauses.
        entry("rounded",600,"2026-10-01T09:15:00-03:00","2026-10-01T09:18:00-03:00","120");
        assertEquals(600,summary("").get("seconds").asDouble());
        assertEquals(20,summary("hoursMode=rounded").get("value").asDouble());
        for(String group:new String[]{"client","consultant","project","activity"}){
            var real=summary("hoursMode=real&group="+group);
            assertEquals(420,real.get("seconds").asDouble(),0.001);
            assertEquals(14,real.get("value").asDouble(),0.0001);
            assertEquals(420,real.get("groups").get(0).get("seconds").asDouble(),0.001);
            if(group.equals("client")||group.equals("consultant")){
                assertEquals(420,real.get("projects").get(0).get("seconds").asDouble(),0.001);
                assertEquals(14,real.get("projects").get(0).get("value").asDouble(),0.0001);
            }
        }
    }
    @Test void preservesLegacyRetroactiveAndPausedFocusWithoutInventingPrecision()throws Exception{
        entry("legacy",300,"2026-10-01T09:15:00-03:00",null,null);
        entry("retro",420,"2026-10-01T09:15:00-03:00","2026-10-01T09:15:00-03:00",null);
        entry("paused",121.5,null,null,null);
        assertEquals(841.5,summary("hoursMode=real").get("seconds").asDouble(),0.001);
        assertEquals(841.5,summary("hoursMode=rounded").get("seconds").asDouble(),0.001);
        assertEquals(3,summary("hoursMode=real").get("unpriced").asLong());
    }
    @Test void filtersUseSelectedHoursAndEmptyRealTotalsAreZero()throws Exception{
        entry("rounded",600,"2026-10-01T09:15:00-03:00","2026-10-01T09:18:00-03:00","120");
        assertEquals(1,summary("hoursMode=rounded&minHours=0.15").get("sessions").asLong());
        var empty=summary("hoursMode=real&minHours=0.15");
        assertEquals(0,empty.get("sessions").asLong());assertEquals(0,empty.get("seconds").asDouble());assertEquals(0,empty.get("value").asDouble());
        assertEquals(1,summary("hoursMode=real&maxHours=0.15").get("sessions").asLong());
        assertEquals(0,summary("hoursMode=rounded&maxHours=0.15").get("sessions").asLong());
        assertEquals(400,get("hoursMode=unknown").statusCode());
    }
    @Test void handlesFractionalFocusTimezoneOffsetsAndNeverReturnsNegativeFocus()throws Exception{
        entry("fraction",600,"2026-10-01T09:15:00.123-03:00","2026-10-01T12:17:59.623Z",null);
        assertEquals(420.5,summary("hoursMode=real").get("seconds").asDouble(),0.001);
        entry("inconsistent",60,"2026-10-01T09:15:00-03:00","2026-10-01T09:18:00-03:00",null);
        assertEquals(420.5,summary("hoursMode=real").get("seconds").asDouble(),0.001);
    }
}
