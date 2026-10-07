package br.com.foco.api;

import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDate;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-eighth-wave-data"})
class EighthWaveTest {
 @jakarta.annotation.Resource JdbcTemplate db;
 @jakarta.annotation.Resource PlanningController planning;
 @jakarta.annotation.Resource SettingsController settings;
 @jakarta.annotation.Resource CatalogService catalogs;
 @BeforeEach void clean(){
  for(String table:new String[]{"session_work_intervals","sessions","task_plans","task_archive","tasks","change_history","settings","project_archive","catalog_projects"})db.update("DELETE FROM "+table);
  for(int i=1;i<=7;i++)db.update("INSERT INTO tasks(id,activity,created_at,updated_at) VALUES(?,'Entrega','2026-01-01','2026-01-01')","t"+i);
 }
 PlanInput priority(){return new PlanInput(LocalDate.now(),true,"Retomar","",null,"Pendente");}
 @Test void defaultsToFiveAndSupportsConfigurableLimit(){
  for(int i=1;i<=5;i++)planning.plan("t"+i,priority());
  assertThrows(IllegalArgumentException.class,()->planning.plan("t6",priority()));
  settings.save(Map.of("planning.priorityLimit","7"));
  planning.plan("t6",priority());planning.plan("t7",priority());assertEquals(7,planning.plans().size());
 }
 @Test void reducingLimitPreservesPlansAndAllowsEditingExistingPriority(){
  for(int i=1;i<=5;i++)planning.plan("t"+i,priority());
  settings.save(Map.of("planning.priorityLimit","2"));
  planning.plan("t1",new PlanInput(LocalDate.now(),true,"Novo passo","",null,"Pendente"));
  assertEquals(5,planning.plans().stream().filter(p->p.priority()>0).count());
  assertThrows(IllegalArgumentException.class,()->planning.plan("t6",priority()));
  planning.move("t2",new MoveInput(-1));
  assertEquals(1,planning.plans().stream().filter(p->p.taskId().equals("t2")).findFirst().orElseThrow().priority());
 }
 @Test void invalidLimitDoesNotWriteOtherSettings(){
  for(String invalid:new String[]{"0","101","1.5","abc",""}){
   assertThrows(IllegalArgumentException.class,()->settings.save(Map.of("planning.priorityLimit",invalid,"theme","dark")));
   assertFalse(settings.all().containsKey("theme"));
  }
 }
 @Test void projectSeedSurvivesRenameAndMergeUsesTargetColor(){
  catalogs.create(CatalogType.PROJECT,"Projeto novo");catalogs.create(CatalogType.PROJECT,"Destino");
  var initial=catalogs.snapshot().projectColorSeeds();assertTrue(initial.get("Projeto novo")>0);
  catalogs.rename(CatalogType.PROJECT,"Projeto novo","Renomeado");
  assertEquals(initial.get("Projeto novo"),catalogs.snapshot().projectColorSeeds().get("Renomeado"));
  catalogs.merge(CatalogType.PROJECT,"Renomeado","Destino");
  assertEquals(initial.get("Destino"),catalogs.snapshot().projectColorSeeds().get("Destino"));
  assertFalse(catalogs.snapshot().projectColorSeeds().containsKey("Renomeado"));
  catalogs.delete(CatalogType.PROJECT,"Destino");assertTrue(catalogs.snapshot().projectColorSeeds().isEmpty());
 }
 @Test void legacyProjectsKeepTheirAppearance(){
  db.update("INSERT INTO catalog_projects(name_key,name) VALUES('legado','Legado')");
  catalogs.initialize();assertFalse(catalogs.snapshot().projectColorSeeds().containsKey("Legado"));
 }
}
