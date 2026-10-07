package br.com.foco.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;
import javax.sql.DataSource;
import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import java.util.zip.*;
import tools.jackson.databind.ObjectMapper;

record RestoreRequest(String path, String sha256, boolean confirmed) {}
record BackupSelection(String path) {}
record RestorePreview(String path, String sha256, Map<String,Long> counts, long activeSessions, String warning) {}
record RestoreResult(String safetyBackup, String restoredAt) {}
record RestoreColumn(String name, boolean required, String defaultValue) {}

@RestController
@RequestMapping("/api/backup")
class RestoreController {
    private final LocalRestore restore;
    RestoreController(LocalRestore restore) { this.restore=restore; }
    @PostMapping("/preview") RestorePreview preview(@RequestBody BackupSelection request) { return restore.preview(request.path()); }
    @PostMapping("/restore") RestoreResult restore(@RequestBody RestoreRequest request) { return restore.restore(request); }
}

@Service
class LocalRestore {
    private static final long MAX_DATABASE=256L*1024*1024;
    private final JdbcTemplate db;
    private final DataSource dataSource;
    private final LocalBackup backup;
    private final DatabaseMaintenance maintenance;
    private final Path data;
    LocalRestore(JdbcTemplate db,DataSource dataSource,LocalBackup backup,DatabaseMaintenance maintenance,@Value("${FOCO_DATA_DIR:${user.home}/AppData/Local/FocoJava}") String directory) {
        this.db=db;this.dataSource=dataSource;this.backup=backup;this.maintenance=maintenance;this.data=Path.of(directory).toAbsolutePath().normalize();
    }
    private static String quoted(String name) { return "\""+name.replace("\"","\"\"")+"\""; }
    private static List<String> tables(Connection connection) throws SQLException {
        var result=new ArrayList<String>();
        try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")) { while(rows.next())result.add(rows.getString(1)); }
        return result;
    }
    private static List<RestoreColumn> columns(Connection connection,String table) throws SQLException {
        var result=new ArrayList<RestoreColumn>();
        try(var statement=connection.createStatement();var rows=statement.executeQuery("PRAGMA table_info("+quoted(table)+")")) { while(rows.next())result.add(new RestoreColumn(rows.getString("name"),rows.getInt("notnull")!=0||rows.getInt("pk")!=0,rows.getString("dflt_value"))); }
        return result;
    }
    private static void check(Connection connection) throws SQLException {
        try(var statement=connection.createStatement();var rows=statement.executeQuery("PRAGMA integrity_check")) { if(!rows.next()||!"ok".equals(rows.getString(1))||rows.next())throw new IllegalArgumentException("O banco do backup não passou na verificação de integridade."); }
        try(var statement=connection.createStatement();var rows=statement.executeQuery("PRAGMA foreign_key_check")) { if(rows.next())throw new IllegalArgumentException("O backup contém vínculos inválidos."); }
    }
    private final class Staged implements AutoCloseable {
        final Path zip,temp; final String hash; final Connection connection; final List<String> sourceTables;
        Staged(String file) throws Exception {
            if(file==null||file.isBlank())throw new IllegalArgumentException("Escolha um ZIP de backup do Foco.");
            zip=Path.of(file).toRealPath();
            if(!Files.isRegularFile(zip)||!zip.toString().toLowerCase(Locale.ROOT).endsWith(".zip")||Files.size(zip)>512L*1024*1024)throw new IllegalArgumentException("Escolha um ZIP local de até 512 MiB.");
            temp=Files.createTempFile(data,"restore-preview-",".db");
            Path archiveCopy=Files.createTempFile(data,"restore-preview-",".zip");
            Connection opened=null;
            try {
                var digest=MessageDigest.getInstance("SHA-256");
                try(var input=new DigestInputStream(Files.newInputStream(zip),digest);var output=Files.newOutputStream(archiveCopy)) {
                    byte[] buffer=new byte[65536];long total=0;int count;
                    while((count=input.read(buffer))!=-1){total+=count;if(total>512L*1024*1024)throw new IllegalArgumentException("ZIP maior que 512 MiB.");output.write(buffer,0,count);}
                }
                hash=HexFormat.of().formatHex(digest.digest());
                try(var archive=new ZipFile(archiveCopy.toFile())) {
                    var entry=archive.getEntry("foco.db");var manifest=archive.getEntry("manifest.txt");
                    if(entry==null||manifest==null||entry.isDirectory()||entry.getSize()<1||entry.getSize()>MAX_DATABASE)throw new IllegalArgumentException("ZIP sem banco/manifesto válido do Foco ou banco maior que 256 MiB.");
                    try(var input=archive.getInputStream(manifest)){String text=new String(input.readNBytes(4096),java.nio.charset.StandardCharsets.UTF_8);if(!text.startsWith("FOCO BACKUP 1\n"))throw new IllegalArgumentException("Formato de backup não reconhecido.");}
                    try(var input=archive.getInputStream(entry);var output=Files.newOutputStream(temp)) {
                        byte[] buffer=new byte[65536];long total=0;int count;
                        while((count=input.read(buffer))!=-1){total+=count;if(total>MAX_DATABASE)throw new IllegalArgumentException("Banco do backup maior que 256 MiB.");output.write(buffer,0,count);}
                    }
                }
                opened=DriverManager.getConnection("jdbc:sqlite:"+temp);
                try(var statement=opened.createStatement()){statement.execute("PRAGMA query_only=ON");}
                check(opened);sourceTables=tables(opened);
                try(var current=dataSource.getConnection()) {
                    var currentTables=tables(current);
                    if(!sourceTables.containsAll(List.of("tasks","sessions","settings"))||!currentTables.containsAll(sourceTables))throw new IllegalArgumentException("Esquema incompatível. Use um backup do Foco compatível com esta versão.");
                    for(String table:sourceTables) {
                        var existing=columns(current,table);var incoming=columns(opened,table).stream().map(RestoreColumn::name).toList();
                        if(!existing.stream().map(RestoreColumn::name).toList().containsAll(incoming))throw new IllegalArgumentException("Backup de versão incompatível: "+table);
                        for(var column:existing){
                            if(!incoming.contains(column.name())&&column.required()&&column.defaultValue()==null)throw new IllegalArgumentException("Backup sem coluna obrigatória: "+table+"."+column.name());
                            if(incoming.contains(column.name())&&column.required())try(var statement=opened.createStatement();var rows=statement.executeQuery("SELECT count(*) FROM "+quoted(table)+" WHERE "+quoted(column.name())+" IS NULL")){rows.next();if(rows.getLong(1)>0)throw new IllegalArgumentException("Backup com valor obrigatório ausente: "+table+"."+column.name());}
                        }
                    }
                }
                validateSettings(opened);
                validateCompatibility(opened,sourceTables);
                connection=opened;
            } catch(Exception error) { if(opened!=null)opened.close();Files.deleteIfExists(temp);throw error; }
            finally { Files.deleteIfExists(archiveCopy); }
        }
        RestorePreview preview() throws SQLException {
            Map<String,Long> counts=new LinkedHashMap<>();
            for(String table:sourceTables)try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT count(*) FROM "+quoted(table))){rows.next();counts.put(table,rows.getLong(1));}
            long active;
            try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT count(*) FROM sessions WHERE status IN ('Em andamento','Pausada')")){rows.next();active=rows.getLong(1);}
            return new RestorePreview(zip.toString(),hash,counts,active,"Substitui todos os dados SQLite e preferências pelo backup. Sessões abertas no backup voltarão pausadas. Visões e rascunhos do perfil local não fazem parte do ZIP.");
        }
        public void close() throws Exception { try{connection.close();}finally{Files.deleteIfExists(temp);} }
    }
    private static void copyTables(Connection source,Connection target,List<String> sourceTables) throws SQLException {
        for(String table:sourceTables) {
            var names=columns(source,table).stream().map(RestoreColumn::name).toList();String selected=names.stream().map(LocalRestore::quoted).collect(java.util.stream.Collectors.joining(","));
            String placeholders=String.join(",",Collections.nCopies(names.size(),"?"));
            try(var query=source.createStatement();var rows=query.executeQuery("SELECT "+selected+" FROM "+quoted(table));var insert=target.prepareStatement("INSERT INTO "+quoted(table)+" ("+selected+") VALUES ("+placeholders+")")) {
                int pending=0;while(rows.next()){for(int i=0;i<names.size();i++)insert.setObject(i+1,rows.getObject(i+1));insert.addBatch();if(++pending==250){insert.executeBatch();pending=0;}}if(pending>0)insert.executeBatch();
            }
        }
    }
    private void validateCompatibility(Connection source,List<String> sourceTables) throws Exception {
        Path trial=Files.createTempFile(data,"restore-schema-",".db");
        try(var current=dataSource.getConnection();var isolated=DriverManager.getConnection("jdbc:sqlite:"+trial)) {
            try(var query=current.createStatement();var rows=query.executeQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");var create=isolated.createStatement()) { while(rows.next())create.execute(rows.getString(1)); }
            isolated.setAutoCommit(false);copyTables(source,isolated,sourceTables);check(isolated);isolated.rollback();
        }finally{Files.deleteIfExists(trial);Files.deleteIfExists(Path.of(trial+"-journal"));}
    }
    private static void validateSettings(Connection connection) throws SQLException {
        Map<String,String> values=new HashMap<>();
        try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT key,value FROM settings")){while(rows.next())values.put(rows.getString(1),rows.getString(2));}
        WorkflowPreferences.validate(values);
        if(values.containsKey("backup.intervalMinutes"))LocalBackup.validateInterval(values.get("backup.intervalMinutes"));
        var mapper=new ObjectMapper();
        try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT start_at,end_at FROM sessions")){while(rows.next()){java.time.OffsetDateTime.parse(rows.getString(1));if(rows.getString(2)!=null)java.time.OffsetDateTime.parse(rows.getString(2));}}
        for(String table:tables(connection)) {
            if(table.equals("work_schedule_rules"))try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT effective_from,week_json FROM work_schedule_rules")){while(rows.next()){java.time.LocalDate.parse(rows.getString(1));var week=mapper.readValue(rows.getString(2),ScheduleWeek.class).week();if(week==null||week.size()!=7)throw new IllegalArgumentException("Jornada inválida no backup.");week.forEach(ScheduleRepository::validate);}}
            if(table.equals("work_schedule_exceptions"))try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT day,windows_json FROM work_schedule_exceptions")){while(rows.next()){java.time.LocalDate.parse(rows.getString(1));ScheduleRepository.validate(mapper.readValue(rows.getString(2),ScheduleWindows.class).windows());}}
        }
    }
    RestorePreview preview(String file) {
        try(var staged=new Staged(file)){return staged.preview();}catch(IllegalArgumentException error){throw error;}catch(Exception error){throw new IllegalArgumentException("Não foi possível validar o backup: "+error.getMessage());}
    }
    RestoreResult restore(RestoreRequest request) {
        if(!request.confirmed()||request.sha256()==null)throw new IllegalArgumentException("Confira a prévia e confirme a substituição dos dados.");
        var lock=maintenance.write();lock.lock();
        try(var staged=new Staged(request.path())) {
            if(!staged.hash.equals(request.sha256()))throw new IllegalArgumentException("O arquivo mudou desde a prévia. Selecione-o novamente.");
            if(db.queryForObject("SELECT count(*) FROM sessions WHERE status IN ('Em andamento','Pausada')",Integer.class)>0)throw new IllegalArgumentException("Encerre o apontamento em andamento ou pausado antes de restaurar.");
            var safety=backup.create(data.getParent().resolve("restore-safety").toString(),true);
            String restoredAt=Instant.now().toString();
            try(var target=dataSource.getConnection()) {
                try(var statement=target.createStatement()){statement.execute("PRAGMA foreign_keys=OFF");}
                target.setAutoCommit(false);
                try {
                    List<String> targetTables=tables(target);
                    for(String table:targetTables)try(var statement=target.createStatement()){statement.executeUpdate("DELETE FROM "+quoted(table));}
                    copyTables(staged.connection,target,staged.sourceTables);
                    try(var statement=target.createStatement()) {
                        statement.executeUpdate("UPDATE session_work_intervals SET end_at=last_tick_at WHERE end_at IS NULL");
                        statement.executeUpdate("UPDATE sessions SET status='Pausada',end_at=NULL WHERE status='Em andamento'");
                        statement.executeUpdate("INSERT INTO session_work_intervals(session_id,start_at,end_at,last_tick_at,precision) SELECT s.id,s.start_at,s.end_at,s.end_at,'Estimado' FROM sessions s WHERE s.end_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM session_work_intervals w WHERE w.session_id=s.id)");
                    }
                    try(var insert=target.prepareStatement("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")) {
                        for(var value:Map.of("restore.lastAt",restoredAt,"restore.safetyBackup",safety.path()).entrySet()){insert.setString(1,value.getKey());insert.setString(2,value.getValue());insert.executeUpdate();}
                    }
                    int converted=FocusRounding.migrate(target);
                    if(converted>0)try(var insert=target.prepareStatement("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")) {
                        for(var value:Map.of("rounding.migratedSessions",String.valueOf(converted),"rounding.safetyBackup",safety.path()).entrySet()){insert.setString(1,value.getKey());insert.setString(2,value.getValue());insert.executeUpdate();}
                    }
                    check(target);target.commit();
                }catch(Exception error){target.rollback();throw error;}
            }
            return new RestoreResult(safety.path(),restoredAt);
        }catch(IllegalArgumentException error){throw error;}catch(Exception error){throw new IllegalArgumentException("Restauração não concluída; os dados foram preservados: "+error.getMessage());}finally{lock.unlock();}
    }
}
