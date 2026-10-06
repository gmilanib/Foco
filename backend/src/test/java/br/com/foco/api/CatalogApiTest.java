package br.com.foco.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"FOCO_API_TOKEN=test-secret","FOCO_DATA_DIR=target/test-foco-data"})
class CatalogApiTest {
    @jakarta.annotation.Resource JdbcTemplate db;
    @jakarta.annotation.Resource CatalogService catalogs;

    @BeforeEach void clean(){
        db.update("DELETE FROM sessions");db.update("DELETE FROM tasks");
        db.update("DELETE FROM catalog_clients");db.update("DELETE FROM catalog_projects");db.update("DELETE FROM catalog_activities");
    }

    @Test void createsNormalizedIndependentCatalogsAndRejectsDuplicates(){
        assertEquals("Projeto Atlas",catalogs.create(CatalogType.PROJECT,"  Projeto   Atlas  "));
        assertEquals("Revisão",catalogs.create(CatalogType.ACTIVITY,"Revisão"));
        assertThrows(IllegalArgumentException.class,()->catalogs.create(CatalogType.PROJECT,"projeto atlas"));
        assertEquals(java.util.List.of("Projeto Atlas"),catalogs.list(CatalogType.PROJECT));
        assertTrue(catalogs.list(CatalogType.CLIENT).isEmpty());
    }

    @Test void selectionsMustExistButClientAndProjectStayOptional(){
        catalogs.create(CatalogType.ACTIVITY,"Análise");
        assertEquals("",catalogs.canonical(CatalogType.CLIENT,"",false));
        assertEquals("",catalogs.canonical(CatalogType.PROJECT,"",false));
        assertEquals("Análise",catalogs.canonical(CatalogType.ACTIVITY," análise ",true));
        assertThrows(IllegalArgumentException.class,()->catalogs.canonical(CatalogType.PROJECT,"Novo projeto",false));
        assertThrows(IllegalArgumentException.class,()->catalogs.canonical(CatalogType.ACTIVITY,"",true));
    }

    @Test void importsAndNormalizesLegacyNamesWithoutMergingDifferentSpellings(){
        db.update("INSERT INTO tasks(id,project,activity,created_at,updated_at) VALUES('legacy','  Projeto   Atlas  ','Análise','2026-01-01','2026-01-01')");
        catalogs.reconcileLegacyValues();
        assertEquals("Projeto Atlas",db.queryForObject("SELECT project FROM tasks WHERE id='legacy'",String.class));
        assertEquals("Projeto Atlas",catalogs.canonical(CatalogType.PROJECT," projeto atlas ",false));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM catalog_projects",Integer.class));
    }

    @Test void suggestedMergeUpdatesHistoryOnlyAfterExplicitChoice(){
        catalogs.create(CatalogType.PROJECT,"Projeto Orion");
        catalogs.create(CatalogType.PROJECT,"Projeto Orien");
        catalogs.create(CatalogType.ACTIVITY,"Entrega");
        db.update("INSERT INTO tasks(id,project,activity,created_at,updated_at) VALUES('task-1','Projeto Orien','Entrega','2026-01-01','2026-01-01')");
        db.update("INSERT INTO sessions(id,project,activity,start_at) VALUES('session-1','Projeto Orien','Entrega','2026-01-01T09:00:00Z')");
        var suggestion=catalogs.snapshot().possibleDuplicates().stream()
                .filter(item->item.type().equals("projects")).findFirst().orElseThrow();
        assertTrue(java.util.Set.of(suggestion.first(),suggestion.second()).containsAll(java.util.Set.of("Projeto Orion","Projeto Orien")));
        assertEquals("Projeto Orien",db.queryForObject("SELECT project FROM tasks WHERE id='task-1'",String.class));
        catalogs.merge(CatalogType.PROJECT,"Projeto Orien","Projeto Orion");
        assertEquals("Projeto Orion",db.queryForObject("SELECT project FROM tasks WHERE id='task-1'",String.class));
        assertEquals("Projeto Orion",db.queryForObject("SELECT project FROM sessions WHERE id='session-1'",String.class));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM catalog_projects",Integer.class));
    }
}
