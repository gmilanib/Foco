package br.com.foco.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-foco-data"})
class V35ImporterTest {
    @Autowired V35Importer importer;
    @Autowired JdbcTemplate db;
    @TempDir Path source;

    @BeforeEach void clean(){db.update("DELETE FROM sessions");db.update("DELETE FROM tasks");db.update("DELETE FROM settings");}

    @Test void importsReadOnlyXmlOnceAndConvertsAnActiveTimerToInterrupted() throws Exception {
        db.update("DELETE FROM sessions");db.update("DELETE FROM tasks");db.update("DELETE FROM settings");
        Files.writeString(source.resolve("tasks.xml"),"<ArrayOfTask><Task><Id>task-1</Id><Activity>Entrega</Activity><Client>ACME</Client><HourlyRate>120</HourlyRate></Task></ArrayOfTask>");
        Files.writeString(source.resolve("sessions.xml"),"<ArrayOfSession><Session><TaskId>task-1</TaskId><Activity>Execução</Activity><Client>ACME</Client><Project>P1</Project><StartIso>2026-09-23T10:00:00-03:00</StartIso><EndIso>0001-01-01T00:00:00+00:00</EndIso><FocusSeconds>90</FocusSeconds><Status>Em andamento</Status></Session></ArrayOfSession>");
        Files.writeString(source.resolve("appearance.xml"),"<Appearance><Dark>true</Dark><Accent>1</Accent><AccentHex>#112233</AccentHex><FollowWindows>false</FollowWindows></Appearance>");
        Files.writeString(source.resolve("pricing.xml"),"<Pricing><HourlyRate>120.5</HourlyRate></Pricing>");
        Files.writeString(source.resolve("quick.xml"),"<QuickPreferences><Limit>10</Limit><Favorites><string>4:ACMEP1</string></Favorites><Presets><int>15</int><int>40</int></Presets></QuickPreferences>");
        Files.writeString(source.resolve("overlay.xml"),"<OverlayPreferences><Remember>true</Remember><NoActivate>true</NoActivate><Opacity>0.7</Opacity><Monitor>DISPLAY1</Monitor><Left>12</Left><Top>34</Top></OverlayPreferences>");
        Files.writeString(source.resolve("client-colors.xml"),"<ArrayOfClientColor><ClientColor><Client>ACME</Client><Hex>#123456</Hex></ClientColor></ArrayOfClientColor>");
        var result=importer.importDirectory(source);
        assertEquals(1,result.tasks());assertEquals(1,result.sessions());assertEquals(1,result.colors());assertEquals("Interrompida",db.queryForObject("SELECT status FROM sessions",String.class));
        assertEquals("dark",setting("theme"));assertEquals("#112233",setting("accent"));assertEquals("120.5",setting("pricing.defaultHourlyRate"));assertEquals("15,40",setting("quick.presets"));assertEquals("0.7",setting("overlay.opacity"));
        assertTrue(importer.importDirectory(source).alreadyImported());
        Path other=Files.createDirectory(source.resolve("other"));Files.writeString(other.resolve("sessions.xml"),"<ArrayOfSession/>");
        assertThrows(IllegalArgumentException.class,()->importer.importDirectory(other));
        assertTrue(Files.exists(source.resolve("sessions.xml")));
    }

    @Test void rejectsXmlExternalEntitiesWithoutWritingPartialRows() throws Exception {
        Files.writeString(source.resolve("sessions.xml"),"<!DOCTYPE x [<!ENTITY e SYSTEM 'file:///Windows/win.ini'>]><ArrayOfSession>&e;</ArrayOfSession>");
        assertThrows(IllegalArgumentException.class,()->importer.importDirectory(source));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM sessions",Integer.class));
    }
    private String setting(String key){return db.queryForObject("SELECT value FROM settings WHERE key=?",String.class,key);}
}
