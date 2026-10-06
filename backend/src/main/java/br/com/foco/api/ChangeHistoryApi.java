package br.com.foco.api;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

record ChangeEntry(String id,String entityType,String entityId,OffsetDateTime changedAt,
        String oldValue,String newValue) {}

@RestController
@RequestMapping("/api/history")
class ChangeHistoryController {
    private final JdbcTemplate db;
    ChangeHistoryController(JdbcTemplate db){this.db=db;}

    @GetMapping List<ChangeEntry> list(@RequestParam String entityType,@RequestParam String entityId){
        if(!Set.of("task","session","project").contains(entityType)||entityId.isBlank())
            throw new IllegalArgumentException("Informe um tipo e um registro válidos.");
        return db.query("SELECT * FROM change_history WHERE entity_type=? AND entity_id=? ORDER BY changed_at DESC,id DESC",
                (r,n)->new ChangeEntry(r.getString("id"),r.getString("entity_type"),r.getString("entity_id"),
                        OffsetDateTime.parse(r.getString("changed_at")),r.getString("old_value"),r.getString("new_value")),entityType,entityId);
    }
}

@org.springframework.stereotype.Component
class ChangeHistoryService {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    ChangeHistoryService(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}

    void record(String type,String id,Object before,Object after){
        String oldValue=encode(before),newValue=encode(after);
        if(Objects.equals(oldValue,newValue))return;
        db.update("INSERT INTO change_history(id,entity_type,entity_id,changed_at,old_value,new_value) VALUES(?,?,?,?,?,?)",
                UUID.randomUUID().toString(),type,id,OffsetDateTime.now().toString(),oldValue,newValue);
    }
    private String encode(Object value){
        if(value==null)return null;
        try{return json.writeValueAsString(value);}
        catch(JacksonException e){throw new IllegalStateException("Não foi possível registrar a alteração.",e);}
    }
}
