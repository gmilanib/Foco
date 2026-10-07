package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/settings")
class SettingsController {
    private final JdbcTemplate db;
    private final CatalogService catalogs;
    SettingsController(JdbcTemplate db,CatalogService catalogs){this.db=db;this.catalogs=catalogs;}
    @GetMapping Map<String,String> all(){return db.query("SELECT key,value FROM settings",r->{Map<String,String> m=new TreeMap<>();while(r.next())m.put(r.getString(1),r.getString(2));return m;});}
    @PutMapping @Transactional Map<String,String> save(@RequestBody Map<String,String> values){
        WorkflowPreferences.validate(values);
        if(values.containsKey("planning.priorityLimit")){
            try{int limit=Integer.parseInt(values.get("planning.priorityLimit"));if(limit<1||limit>100)throw new NumberFormatException();}
            catch(RuntimeException e){throw new IllegalArgumentException("Informe um limite inteiro entre 1 e 100 prioridades.");}
        }
        if(values.containsKey("planning.capacityMinutes")){
            try{int minutes=Integer.parseInt(values.get("planning.capacityMinutes"));if(minutes<0||minutes>1440)throw new NumberFormatException();}
            catch(RuntimeException e){throw new IllegalArgumentException("Informe capacidade inteira entre 0 e 1440 minutos.");}
        }
        if(values.containsKey("tasks.defaultDueDate")&&!("empty".equals(values.get("tasks.defaultDueDate"))||"today".equals(values.get("tasks.defaultDueDate"))))throw new IllegalArgumentException("Prazo padrão inválido.");
        if(values.size()>100)throw new IllegalArgumentException("Muitas preferências em uma única atualização.");
        if(values.containsKey("backup.intervalMinutes"))LocalBackup.validateInterval(values.get("backup.intervalMinutes"));
        values.forEach((key,value)->{
            if(key==null||!key.matches("[A-Za-z0-9._-]{1,100}")||value==null||value.length()>10000)throw new IllegalArgumentException("Preferência inválida.");
            db.update("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",key,value);
        });return all();
    }
    @GetMapping("/colors") List<Map<String,String>> colors(){return db.query("SELECT client_name,hex FROM client_colors ORDER BY client_name",(r,n)->Map.of("client",r.getString(1),"hex",r.getString(2)));}
    @PutMapping("/colors") Map<String,String> color(@RequestBody ColorInput input){
        if(input.client()==null||input.client().isBlank()||input.client().length()>200||input.hex()==null||!input.hex().matches("#[0-9a-fA-F]{6}"))throw new IllegalArgumentException("Informe cliente e cor no formato #RRGGBB.");
        String name=catalogs.canonical(CatalogType.CLIENT,input.client(),true),key=CatalogService.key(name);
        db.update("INSERT INTO client_colors(client_key,client_name,hex) VALUES(?,?,?) ON CONFLICT(client_key) DO UPDATE SET client_name=excluded.client_name,hex=excluded.hex",key,name,input.hex().toUpperCase(Locale.ROOT));return Map.of("client",name,"hex",input.hex().toUpperCase(Locale.ROOT));
    }
    @DeleteMapping("/colors/{client}") void removeColor(@PathVariable String client){db.update("DELETE FROM client_colors WHERE client_key=?",client.trim().toLowerCase(Locale.ROOT));}
}
record ColorInput(String client,String hex) {}
