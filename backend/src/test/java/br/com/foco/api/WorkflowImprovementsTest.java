package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"FOCO_API_TOKEN=test-secret"})
class WorkflowImprovementsTest {
    static final String DATA="target/test-workflow-"+UUID.randomUUID();
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("FOCO_DATA_DIR",()->DATA);}
    @jakarta.annotation.Resource JdbcTemplate db;
    @jakarta.annotation.Resource CatalogService catalogs;
    @jakarta.annotation.Resource TaskController tasks;
    @jakarta.annotation.Resource SessionController sessions;
    @jakarta.annotation.Resource RetroactiveController retroactive;
    @jakarta.annotation.Resource SessionTaskController links;
    @jakarta.annotation.Resource SettingsController settings;
    @jakarta.annotation.Resource LocalBackup backup;
    @jakarta.annotation.Resource LocalRestore restore;
    @org.junit.jupiter.api.io.TempDir java.nio.file.Path backupDirectory;

    @BeforeEach void setup(){
        for(String table:List.of("sessions","tasks","catalog_projects","catalog_clients","client_colors","catalog_activities","change_history","settings"))db.update("DELETE FROM "+table);
        catalogs.create(CatalogType.CLIENT,"Cliente A");catalogs.create(CatalogType.CLIENT,"Cliente B");
        catalogs.createForClient(CatalogType.PROJECT,"Projeto A","Cliente A");
        catalogs.create(CatalogType.ACTIVITY,"Desenvolvimento");
    }
    TaskInput task(Integer estimate){return new TaskInput("Cliente A","Projeto A","Desenvolvimento","Entrega","","",null,null,estimate);}
    SessionInput session(String taskId){return new SessionInput(taskId,"Cliente A","Projeto A","Desenvolvimento","Entrega","","",OffsetDateTime.now(),null,0,null,"Em andamento","Normal");}

    @Test void specialThemesPersistAndInvalidPresetsLeavePreferencesUnchanged(){
        for(String preset:List.of("christmas","aero")){
            settings.save(Map.of("theme.preset",preset,"theme","dark","accent","#123456"));
            assertEquals(preset,settings.all().get("theme.preset"));
            assertEquals("dark",settings.all().get("theme"));
            assertEquals("#123456",settings.all().get("accent"));
        }
        var saved=settings.all();
        assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("theme.preset","unknown","accent","#FFFFFF")));
        assertEquals(saved,settings.all());
    }

    @Test void reportsOrderByInstantAcrossOffsetsAndFractionalSeconds(){
        String[][] entries={{"a","2026-10-27T00:30:00Z"},{"b","2026-10-26T21:30:00-03:00"},{"c","2026-10-26T23:00:00-03:00"},{"d","2026-10-27T02:00:00.000001Z"}};
        for(String[] entry:entries)db.update("INSERT INTO sessions(id,activity,start_at,status) VALUES(?,?,?,'Concluída')",entry[0],entry[0],entry[1]);
        assertEquals(List.of("d","c","a","b"),sessions.list(Map.of()).stream().map(SessionRow::id).toList());
        assertEquals(List.of("a","b","c","d"),sessions.list(Map.of("sort","oldest")).stream().map(SessionRow::id).toList());
        String csv=sessions.csv("",false,"real","rounded");
        assertEquals(List.of("\"d\"","\"c\"","\"a\"","\"b\""),csv.lines().skip(1).map(line->line.split(";")[4]).toList());
    }
    @Test void projectsRequireAClientAndRejectWrongPairsWhileActivitiesAreShared(){
        assertThrows(IllegalArgumentException.class,()->catalogs.createForClient(CatalogType.PROJECT,"Sem dono",null));
        assertFalse(catalogs.list(CatalogType.PROJECT).contains("Sem dono"));
        assertEquals(List.of("Cliente A"),catalogs.snapshot().projectClients().get("Projeto A"));
        assertThrows(IllegalArgumentException.class,()->tasks.create(new TaskInput("Cliente B","Projeto A","Desenvolvimento","","","",null,null)));
        assertDoesNotThrow(()->tasks.create(new TaskInput("Cliente B","","Desenvolvimento","","","",null,null)));
        assertThrows(IllegalArgumentException.class,()->catalogs.delete(CatalogType.CLIENT,"Cliente A"));
    }
    @Test void renamesAndMergesPreserveProjectLinks(){
        catalogs.rename(CatalogType.CLIENT,"Cliente A","Novo cliente");
        catalogs.rename(CatalogType.PROJECT,"Projeto A","Novo projeto");
        assertEquals("Novo projeto",catalogs.projectForClient("Novo projeto","Novo cliente"));
        catalogs.merge(CatalogType.CLIENT,"Novo cliente","Cliente B");
        catalogs.createForClient(CatalogType.PROJECT,"Destino","Cliente B");
        catalogs.merge(CatalogType.PROJECT,"Novo projeto","Destino");
        assertEquals(List.of("Cliente B"),catalogs.snapshot().projectClients().get("Destino"));
    }
    @Test void legacyLinksAreRecoveredIdempotentlyWithoutChangingHistory(){
        db.update("INSERT INTO tasks(id,client,project,activity,created_at,updated_at) VALUES('legacy','Cliente B','Projeto A','Desenvolvimento','2026-01-01','2026-01-01')");
        catalogs.reconcileLegacyValues();catalogs.reconcileLegacyValues();
        assertEquals(2,catalogs.snapshot().projectClients().get("Projeto A").size());
        assertEquals("Cliente B",tasks.get("legacy").client());
    }
    @Test void optionalEstimateIsPersistedUpdatedAndClearedAtomically(){
        TaskRow task=tasks.create(task(45));assertEquals(45,task.estimateMinutes());
        assertEquals(90,tasks.update(task.id(),task(90)).estimateMinutes());
        assertNull(tasks.update(task.id(),task(null)).estimateMinutes());
        int count=tasks.list("","Todas").size();
        assertThrows(IllegalArgumentException.class,()->tasks.create(task(0)));
        assertEquals(count,tasks.list("","Todas").size());
    }
    @Test void aNewSessionCreatesOneTaskForTodayAndAnExplicitTaskIsReused(){
        SessionRow first=sessions.create(session(null));
        assertNotNull(first.taskId());assertEquals(LocalDate.now(),tasks.get(first.taskId()).dueDate());
        assertFalse(tasks.get(first.taskId()).completed());
        assertEquals(LocalDate.now().toString(),db.queryForObject("SELECT planned_date FROM task_plans WHERE task_id=?",String.class,first.taskId()));
        assertEquals(1,tasks.get(first.taskId()).entries());
        sessions.finish(first.id(),new FinishInput("Encerrada",420));
        SessionRow next=sessions.create(session(first.taskId()));
        assertEquals(first.taskId(),next.taskId());assertEquals(1,tasks.list("","Todas").size());
        assertEquals(2,tasks.get(first.taskId()).entries());
    }
    @Test void finishingAsCompletedClosesTheSameTaskForNewAndExistingTasks(){
        for(boolean existing:List.of(false,true)){
            String taskId=existing?tasks.create(task(null)).id():null;
            SessionRow active=sessions.create(session(taskId));
            int count=tasks.list("","Todas").size();
            db.update("UPDATE task_plans SET priority=1 WHERE task_id=?",active.taskId());
            sessions.finish(active.id(),new FinishInput("Concluída",301));
            TaskRow completed=tasks.get(active.taskId());
            assertTrue(completed.completed());assertEquals("Concluída",completed.state());
            assertEquals(1,completed.entries());assertEquals(count,tasks.list("","Todas").size());
            assertEquals(active.taskId(),sessions.get(active.id()).taskId());
            assertEquals(0,db.queryForObject("SELECT count(*) FROM task_plans WHERE task_id=? AND priority>0",Integer.class,active.taskId()));
        }
    }
    @Test void unfinishedOutcomesKeepTheTaskOpen(){
        for(String status:List.of("Encerrada","Interrompida")){
            SessionRow active=sessions.create(session(null));
            sessions.finish(active.id(),new FinishInput(status,120));
            assertFalse(tasks.get(active.taskId()).completed());
        }
    }
    @Test void failedTaskCompletionRollsBackSessionFinish(){
        SessionRow active=sessions.create(session(null));
        db.execute("CREATE TRIGGER reject_completion BEFORE UPDATE OF completed ON tasks BEGIN SELECT RAISE(ABORT,'test failure'); END");
        try{
            assertThrows(Exception.class,()->sessions.finish(active.id(),new FinishInput("Concluída",120)));
            assertEquals("Em andamento",sessions.get(active.id()).status());
            assertNull(sessions.get(active.id()).endAt());assertFalse(tasks.get(active.taskId()).completed());
        }finally{db.execute("DROP TRIGGER reject_completion");}
    }
    @Test void retroactiveCreatesTaskAndCannotBeUnlinked(){
        OffsetDateTime end=OffsetDateTime.now().minusHours(1);
        SessionRow row=retroactive.create(new RetroactiveInput(null,"Cliente A","Projeto A","Desenvolvimento","Retroativo","","",end.minusHours(1),end,30L,null,"Encerrada","Normal"));
        assertNotNull(row.taskId());assertEquals(LocalDate.now(),tasks.get(row.taskId()).dueDate());
        assertTrue(tasks.get(row.taskId()).completed());assertEquals("Concluída",tasks.get(row.taskId()).state());
        assertThrows(IllegalArgumentException.class,()->links.link(row.id(),new SessionTaskInput(null)));
        assertEquals(row.taskId(),sessions.get(row.id()).taskId());
    }
    @Test void failedSessionDoesNotLeaveAnOrphanTask(){
        db.execute("CREATE TRIGGER reject_new_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'test failure'); END");
        try{assertThrows(Exception.class,()->sessions.create(session(null)));assertTrue(tasks.list("","Todas").isEmpty());assertEquals(0,db.queryForObject("SELECT count(*) FROM task_plans",Integer.class));}
        finally{db.execute("DROP TRIGGER reject_new_session");}
    }
    @Test void retroactiveCompletesOnlyNewTasksForEveryFinalOutcome(){
        OffsetDateTime end=OffsetDateTime.now().minusHours(1);
        for(String status:List.of("Concluída","Encerrada","Interrompida")){
            SessionRow row=retroactive.create(new RetroactiveInput("","Cliente A","Projeto A","Desenvolvimento","Retroativo","","",end.minusHours(1),end,30L,null,status,"Normal"));
            TaskRow created=tasks.get(row.taskId());
            assertTrue(created.completed());assertEquals("Concluída",created.state());assertEquals(1,created.entries());
            assertEquals(LocalDate.now().toString(),db.queryForObject("SELECT planned_date FROM task_plans WHERE task_id=?",String.class,created.id()));
        }
        TaskRow existing=tasks.create(task(null));
        SessionRow active=sessions.create(session(existing.id()));
        SessionRow linked=retroactive.create(new RetroactiveInput(existing.id(),"Cliente A","Projeto A","Desenvolvimento","Retroativo","","",end.minusHours(1),end,30L,null,"Concluída","Normal"));
        assertEquals(existing.id(),linked.taskId());assertFalse(tasks.get(existing.id()).completed());
        assertEquals("Em andamento",sessions.get(active.id()).status());
    }
    @Test void failedRetroactiveRollsBackNewCompletedTaskAndHistory(){
        int historyCount=db.queryForObject("SELECT count(*) FROM change_history",Integer.class);
        OffsetDateTime end=OffsetDateTime.now().minusHours(1);
        db.execute("CREATE TRIGGER reject_retroactive BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'test failure'); END");
        try{
            assertThrows(Exception.class,()->retroactive.create(new RetroactiveInput(null,"Cliente A","Projeto A","Desenvolvimento","Retroativo","","",end.minusHours(1),end,30L,null,"Concluída","Normal")));
            assertTrue(tasks.list("","Todas").isEmpty());
            assertEquals(0,db.queryForObject("SELECT count(*) FROM task_plans",Integer.class));
            assertEquals(historyCount,db.queryForObject("SELECT count(*) FROM change_history",Integer.class));
        }finally{db.execute("DROP TRIGGER reject_retroactive");}
    }
    @Test void validatesAndPersistsHoursPreference(){
        settings.save(Map.of("display.hoursMode","real"));assertEquals("real",settings.all().get("display.hoursMode"));
        assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("display.hoursMode","other")));
        assertEquals("real",settings.all().get("display.hoursMode"));
    }
    @Test void backupAndRestorePreserveLinksEstimatesAndHoursPreference(){
        TaskRow task=tasks.create(task(45));settings.save(Map.of("display.hoursMode","real"));
        var copy=backup.create(backupDirectory.toString(),true);
        db.update("DELETE FROM project_clients");tasks.update(task.id(),task(null));
        settings.save(Map.of("display.hoursMode","rounded"));
        var preview=restore.preview(copy.path());
        restore.restore(new RestoreRequest(copy.path(),preview.sha256(),true));
        assertEquals(45,tasks.get(task.id()).estimateMinutes());
        assertEquals(List.of("Cliente A"),catalogs.snapshot().projectClients().get("Projeto A"));
        assertEquals("real",settings.all().get("display.hoursMode"));
    }
    @Test void automaticClientColorsArePersistedAndCustomColorsSurviveReconciliation(){
        String original=db.queryForObject("SELECT hex FROM client_colors WHERE client_key='cliente a'",String.class);
        assertTrue(original.matches("#[0-9A-F]{6}"));
        catalogs.ensureColors();assertEquals(original,db.queryForObject("SELECT hex FROM client_colors WHERE client_key='cliente a'",String.class));
        settings.color(new ColorInput("Cliente A","#123456"));catalogs.initialize();
        assertEquals("#123456",db.queryForObject("SELECT hex FROM client_colors WHERE client_key='cliente a'",String.class));
        catalogs.rename(CatalogType.CLIENT,"Cliente A","Renomeado");
        assertEquals("#123456",db.queryForObject("SELECT hex FROM client_colors WHERE client_key='renomeado'",String.class));
        settings.removeColor("Renomeado");
        assertTrue(db.queryForObject("SELECT hex FROM client_colors WHERE client_key='renomeado'",String.class).matches("#[0-9A-F]{6}"));
        assertEquals(2,settings.colors().size());
    }
    @Test void presetsAreValidatedAndIncludedInBackup(){
        settings.save(Map.of("theme.preset","forest","theme","dark","accent","#16836B"));
        assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("theme.preset","bad","accent","#FFFFFF")));
        assertEquals("#16836B",settings.all().get("accent"));
        var copy=backup.create(backupDirectory.toString(),true);settings.save(Map.of("theme.preset","slate"));
        var preview=restore.preview(copy.path());restore.restore(new RestoreRequest(copy.path(),preview.sha256(),true));
        assertEquals("forest",settings.all().get("theme.preset"));
    }
}
