package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

record ArchiveInput(boolean archived) {}

@Service
class OrganizationService {
    private final JdbcTemplate db;
    private final ChangeHistoryService history;
    OrganizationService(JdbcTemplate db,ChangeHistoryService history){this.db=db;this.history=history;}
    boolean projectArchived(String project){
        return project!=null&&!project.isBlank()&&db.queryForObject("SELECT count(*) FROM project_archive WHERE name_key=?",Integer.class,CatalogService.key(project))>0;
    }
    boolean taskArchived(String id){
        return Boolean.TRUE.equals(db.query("SELECT project,EXISTS(SELECT 1 FROM task_archive WHERE task_id=t.id) archived FROM tasks t WHERE id=?",
                r->r.next()&&(r.getBoolean("archived")||projectArchived(r.getString("project"))),id));
    }
    void requireAvailable(String id){
        if(db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,id)!=1)throw new IllegalArgumentException("Tarefa não encontrada.");
        if(taskArchived(id))throw new IllegalArgumentException("Restaure a tarefa e seu projeto antes de usá-la.");
    }
    void requireProject(String name){if(projectArchived(name))throw new IllegalArgumentException("Restaure o projeto antes de criar novos registros.");}
    @Transactional
    public void archiveTask(String id,boolean archived){
        if(db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,id)!=1)throw new IllegalArgumentException("Tarefa não encontrada.");
        boolean before=db.queryForObject("SELECT count(*) FROM task_archive WHERE task_id=?",Integer.class,id)>0;
        if(before==archived)return;
        if(archived&&db.queryForObject("SELECT count(*) FROM sessions WHERE task_id=? AND status IN ('Em andamento','Pausada')",Integer.class,id)>0)
            throw new IllegalArgumentException("Encerre o apontamento ativo antes de arquivar a tarefa.");
        if(archived)db.update("INSERT INTO task_archive(task_id,archived_at) VALUES(?,?)",id,OffsetDateTime.now().toString());
        else db.update("DELETE FROM task_archive WHERE task_id=?",id);
        // Keep dates and notes; restored tasks do not reclaim an old priority slot.
        db.update("UPDATE task_plans SET priority=0 WHERE task_id=?",id);
        history.record("task",id,Map.of("archived",before),Map.of("archived",archived));
    }
    @Transactional
    public void archiveProject(String name,boolean archived){
        String key=CatalogService.key(name);
        if(db.queryForObject("SELECT count(*) FROM catalog_projects WHERE name_key=?",Integer.class,key)!=1)throw new IllegalArgumentException("Projeto não encontrado.");
        boolean before=projectArchived(name);if(before==archived)return;
        if(archived&&db.queryForObject("SELECT count(*) FROM sessions WHERE (project=(SELECT name FROM catalog_projects WHERE name_key=?) OR task_id IN (SELECT id FROM tasks WHERE project=(SELECT name FROM catalog_projects WHERE name_key=?))) AND status IN ('Em andamento','Pausada')",Integer.class,key,key)>0)
            throw new IllegalArgumentException("Encerre os apontamentos ativos do projeto antes de arquivá-lo.");
        if(archived)db.update("INSERT INTO project_archive(name_key,archived_at) VALUES(?,?)",key,OffsetDateTime.now().toString());
        else db.update("DELETE FROM project_archive WHERE name_key=?",key);
        db.update("UPDATE task_plans SET priority=0 WHERE task_id IN (SELECT id FROM tasks WHERE project=(SELECT name FROM catalog_projects WHERE name_key=?))",key);
        history.record("project",key,Map.of("archived",before),Map.of("archived",archived));
    }
}

@RestController
class OrganizationController {
    private final OrganizationService organization;
    OrganizationController(OrganizationService organization){this.organization=organization;}
    @PutMapping("/api/tasks/{id}/archive") void task(@PathVariable String id,@RequestBody ArchiveInput input){organization.archiveTask(id,input.archived());}
    @PutMapping("/api/catalogs/projects/{name}/archive") void project(@PathVariable String name,@RequestBody ArchiveInput input){organization.archiveProject(name,input.archived());}
}
