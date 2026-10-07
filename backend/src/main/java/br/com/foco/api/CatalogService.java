package br.com.foco.api;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.event.EventListener;
import java.text.Normalizer;
import java.util.*;

enum CatalogType {
    CLIENT("clients", "client", "catalog_clients", "Cliente"),
    PROJECT("projects", "project", "catalog_projects", "Projeto"),
    ACTIVITY("activities", "activity", "catalog_activities", "Atividade");
    final String route, column, table, label;
    CatalogType(String route, String column, String table, String label) {
        this.route=route; this.column=column; this.table=table; this.label=label;
    }
    static CatalogType parse(String value) {
        return Arrays.stream(values()).filter(t->t.route.equalsIgnoreCase(value)).findFirst()
                .orElseThrow(()->new IllegalArgumentException("Tipo de cadastro invÃ¡lido."));
    }
}

record CatalogDuplicate(String type, String first, String second, double similarity) {}
record CatalogSnapshot(Map<String,List<String>> items, List<CatalogDuplicate> possibleDuplicates,List<String> archivedProjects,Map<String,Integer> projectColorSeeds) {}

@Service
class CatalogService {
    private final JdbcTemplate db;
    CatalogService(JdbcTemplate db) { this.db=db; }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    void initialize() {
        boolean hasSeed=db.queryForList("PRAGMA table_info(catalog_projects)").stream().anyMatch(row->"color_seed".equals(row.get("name")));
        if(!hasSeed)db.execute("ALTER TABLE catalog_projects ADD COLUMN color_seed INTEGER");
        reconcileLegacyValues();
    }

    @Transactional
    void reconcileLegacyValues() {
        for (CatalogType type : CatalogType.values()) {
            LinkedHashSet<String> values=new LinkedHashSet<>();
            values.addAll(db.queryForList("SELECT "+type.column+" FROM sessions UNION SELECT "+type.column+" FROM tasks",String.class));
            if(type==CatalogType.CLIENT) values.addAll(db.queryForList("SELECT client_name FROM client_colors",String.class));
            for(String value:values) reconcileValue(type,value);
        }
    }

    private void reconcileValue(CatalogType type,String raw) {
        if(raw==null||raw.isBlank())return;
        String value=clean(raw), key=key(value);
        String canonical=db.query("SELECT name FROM "+type.table+" WHERE name_key=?",r->r.next()?r.getString(1):null,key);
        if(canonical==null) {
            db.update("INSERT INTO "+type.table+"(name_key,name) VALUES(?,?)",key,value);
            if(!raw.equals(value))updateHistorical(type,raw,value);
        }
        else if(!canonical.equals(value)) updateHistorical(type,raw,canonical);
        if(type==CatalogType.CLIENT) canonicalizeColor(raw,canonical==null?value:canonical);
    }

    @Transactional(readOnly=true)
    CatalogSnapshot snapshot() {
        Map<String,List<String>> items=new LinkedHashMap<>();
        for(CatalogType type:CatalogType.values())items.put(type.route,list(type));
        Map<String,Integer> seeds=db.query("SELECT name,color_seed FROM catalog_projects WHERE color_seed IS NOT NULL",r->{Map<String,Integer> m=new LinkedHashMap<>();while(r.next())m.put(r.getString(1),r.getInt(2));return m;});
        return new CatalogSnapshot(items,suggestions(items),db.queryForList("SELECT p.name FROM catalog_projects p JOIN project_archive a ON a.name_key=p.name_key ORDER BY p.name",String.class),seeds);
    }

    @Transactional(readOnly=true)
    List<String> list(CatalogType type) {
        return db.queryForList("SELECT name FROM "+type.table+" ORDER BY name COLLATE NOCASE",String.class);
    }

    @Transactional
    String create(CatalogType type,String raw) {
        String name=validate(raw,type.label), key=key(name);
        if(find(type,key)!=null)throw new IllegalArgumentException(type.label+" jÃ¡ cadastrado.");
        db.update("INSERT INTO "+type.table+"(name_key,name) VALUES(?,?)",key,name);
        if(type==CatalogType.PROJECT)db.update("UPDATE catalog_projects SET color_seed=? WHERE name_key=?",java.util.concurrent.ThreadLocalRandom.current().nextInt(1,Integer.MAX_VALUE),key);
        return name;
    }

    @Transactional
    String rename(CatalogType type,String rawSource,String rawTarget) {
        String source=existing(type,rawSource), target=validate(rawTarget,type.label);
        String targetKey=key(target), conflict=find(type,targetKey);
        if(conflict!=null&&!key(source).equals(targetKey))
            throw new IllegalArgumentException("Este nome jÃ¡ existe. Use Unificar para combinar os cadastros.");
        if(key(source).equals(targetKey)) {
            db.update("UPDATE "+type.table+" SET name=? WHERE name_key=?",target,key(source));
            updateHistorical(type,source,target);
            if(type==CatalogType.CLIENT)canonicalizeColor(source,target);
            return target;
        }
        updateHistorical(type,source,target);
        if(type==CatalogType.CLIENT)canonicalizeColor(source,target);
        db.update("UPDATE "+type.table+" SET name_key=?,name=? WHERE name_key=?",targetKey,target,key(source));
        return target;
    }

    @Transactional
    String merge(CatalogType type,String rawSource,String rawTarget) {
        String source=existing(type,rawSource), target=existing(type,rawTarget);
        if(key(source).equals(key(target)))throw new IllegalArgumentException("Escolha dois cadastros diferentes.");
        if(type==CatalogType.PROJECT){
            boolean archived=db.queryForObject("SELECT count(*) FROM project_archive WHERE name_key IN (?,?)",Integer.class,key(source),key(target))>0;
            if(archived){
                int active=db.queryForObject("SELECT count(*) FROM sessions WHERE status IN ('Em andamento','Pausada') AND (project IN (?,?) OR task_id IN (SELECT id FROM tasks WHERE project IN (?,?)))",Integer.class,source,target,source,target);
                if(active>0)throw new IllegalArgumentException("Encerre os apontamentos ativos antes de unificar com um projeto arquivado.");
                db.update("UPDATE task_plans SET priority=0 WHERE task_id IN (SELECT id FROM tasks WHERE project IN (?,?))",source,target);
            }
            db.update("INSERT OR IGNORE INTO project_archive(name_key,archived_at) SELECT ?,archived_at FROM project_archive WHERE name_key=?",key(target),key(source));
        }
        updateHistorical(type,source,target);
        if(type==CatalogType.CLIENT)mergeColor(source,target);
        db.update("DELETE FROM "+type.table+" WHERE name_key=?",key(source));
        return target;
    }

    @Transactional
    void delete(CatalogType type,String raw) {
        String name=existing(type,raw);
        int used=db.queryForObject("SELECT (SELECT count(*) FROM sessions WHERE "+type.column+"=?)+(SELECT count(*) FROM tasks WHERE "+type.column+"=?)",Integer.class,name,name);
        if(used>0)throw new IllegalArgumentException("Este cadastro jÃ¡ tem histÃ³rico. Renomeie ou unifique para preservÃ¡-lo.");
        if(type==CatalogType.CLIENT)db.update("DELETE FROM client_colors WHERE client_key=?",key(name));
        db.update("DELETE FROM "+type.table+" WHERE name_key=?",key(name));
    }

    String canonical(CatalogType type,String raw,boolean required) {
        if(raw==null||raw.isBlank()) {
            if(required)throw new IllegalArgumentException("Cadastre e selecione uma "+type.label.toLowerCase(Locale.ROOT)+".");
            return "";
        }
        String name=find(type,key(raw));
        if(name==null)throw new IllegalArgumentException("Cadastre "+type.label.toLowerCase(Locale.ROOT)+" em Cadastros antes de usÃ¡-lo.");
        return name;
    }

    private String existing(CatalogType type,String raw) {
        String name=raw==null?null:find(type,key(raw));
        if(name==null)throw new IllegalArgumentException(type.label+" nÃ£o encontrado no catÃ¡logo.");
        return name;
    }
    private String find(CatalogType type,String key) {
        return db.query("SELECT name FROM "+type.table+" WHERE name_key=?",r->r.next()?r.getString(1):null,key);
    }
    private void updateHistorical(CatalogType type,String oldName,String newName) {
        db.update("UPDATE sessions SET "+type.column+"=? WHERE "+type.column+"=?",newName,oldName);
        db.update("UPDATE tasks SET "+type.column+"=? WHERE "+type.column+"=?",newName,oldName);
    }
    private void canonicalizeColor(String oldName,String newName) {
        if(key(oldName).equals(key(newName))) {
            db.update("UPDATE client_colors SET client_key=?,client_name=? WHERE client_key=?",key(newName),newName,key(oldName));
            return;
        }
        Integer target=db.queryForObject("SELECT count(*) FROM client_colors WHERE client_key=?",Integer.class,key(newName));
        if(target!=null&&target>0) db.update("DELETE FROM client_colors WHERE client_key=?",key(oldName));
        else db.update("UPDATE client_colors SET client_key=?,client_name=? WHERE client_key=?",key(newName),newName,key(oldName));
    }
    private void mergeColor(String source,String target) {
        canonicalizeColor(source,target);
    }
    private static String validate(String raw,String label) {
        String name=clean(raw);
        if(name.isBlank()||name.length()>200)throw new IllegalArgumentException("Informe "+label.toLowerCase(Locale.ROOT)+" com atÃ© 200 caracteres.");
        return name;
    }
    private static String clean(String value) { return value.trim().replaceAll("\\s+"," "); }
    static String key(String value) { return clean(value).toLowerCase(Locale.ROOT); }

    private static List<CatalogDuplicate> suggestions(Map<String,List<String>> items) {
        List<CatalogDuplicate> result=new ArrayList<>();
        for(var group:items.entrySet()) {
            List<String> names=group.getValue();
            if(names.size()>1500)continue;
            for(int i=0;i<names.size();i++)for(int j=i+1;j<names.size();j++) {
                double score=similarity(names.get(i),names.get(j));
                if(score>=0.70)result.add(new CatalogDuplicate(group.getKey(),names.get(i),names.get(j),Math.round(score*100)/100.0));
            }
        }
        result.sort(Comparator.comparingDouble(CatalogDuplicate::similarity).reversed());
        return result.stream().limit(30).toList();
    }
    private static double similarity(String left,String right) {
        String a=fold(left),b=fold(right);int longest=Math.max(a.length(),b.length());
        if(longest==0)return 1;
        int[] previous=new int[b.length()+1],current=new int[b.length()+1];
        for(int j=0;j<=b.length();j++)previous[j]=j;
        for(int i=1;i<=a.length();i++) {
            current[0]=i;
            for(int j=1;j<=b.length();j++)current[j]=Math.min(Math.min(current[j-1]+1,previous[j]+1),previous[j-1]+(a.charAt(i-1)==b.charAt(j-1)?0:1));
            int[] swap=previous;previous=current;current=swap;
        }
        return 1.0-(double)previous[b.length()]/longest;
    }
    private static String fold(String value) {
        return Normalizer.normalize(clean(value),Normalizer.Form.NFD).replaceAll("\\p{M}+","").toLowerCase(Locale.ROOT);
    }
}
