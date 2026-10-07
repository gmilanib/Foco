package br.com.foco.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.zip.*;

record BackupRequest(String directory,boolean manual) {}
record BackupResult(String path,String day,String status) {}

@RestController
@RequestMapping("/api/backup")
class BackupController {
    private final LocalBackup backup;
    BackupController(LocalBackup backup){this.backup=backup;}
    @PostMapping BackupResult run(@RequestBody BackupRequest request){return backup.create(request.directory(),request.manual());}
}

@Service
class LocalBackup {
    private final JdbcTemplate db; private final Path data;
    private final DatabaseMaintenance maintenance;
    LocalBackup(JdbcTemplate db,String directory){this(db,directory,new DatabaseMaintenance());}
    @org.springframework.beans.factory.annotation.Autowired
    LocalBackup(JdbcTemplate db,@Value("${FOCO_DATA_DIR:${user.home}/AppData/Local/FocoJava}")String directory,DatabaseMaintenance maintenance){this.db=db;this.data=Paths.get(directory).toAbsolutePath().normalize();this.maintenance=maintenance;}
    @EventListener(ApplicationReadyEvent.class) void onOpen(){runDaily();}
    @Scheduled(fixedDelay=60000) void runDaily(){var lock=maintenance.read();lock.lock();try{String folder=setting("backup.destination");if(!folder.isBlank())try{create(folder,false);}catch(RuntimeException ignored){/* Panel surfaces errors on the next explicit attempt. */}}finally{lock.unlock();}}
    BackupResult create(String folder,boolean manual){
        var lock=maintenance.read();lock.lock();try{synchronized(this){return createLocked(folder,manual);}}finally{lock.unlock();}
    }
    private BackupResult createLocked(String folder,boolean manual){
        try{
            BackupResult result=perform(folder,manual);
            if(!result.path().isBlank())recordAttempt("Sucesso",result.status());
            return result;
        }catch(RuntimeException e){recordAttempt("Falha",e.getMessage()==null?"Backup não concluído.":e.getMessage());throw e;}
    }
    private void recordAttempt(String result,String message){
        save("backup.lastAttemptAt",Instant.now().toString());
        save("backup.lastResult",result);save("backup.lastMessage",message);
    }
    private BackupResult perform(String folder,boolean manual){
        if(folder==null||folder.isBlank())throw new IllegalArgumentException("Escolha a pasta de backup nas Configurações.");
        Path destination=Paths.get(folder).toAbsolutePath().normalize();
        if(destination.startsWith(data))throw new IllegalArgumentException("A pasta de backup deve ficar fora dos dados do Foco.");
        String day=LocalDate.now().toString();
        if(!manual&&!due(destination,Instant.now()))return new BackupResult("",day,"O intervalo do próximo backup ainda não terminou.");
        try {
            Files.createDirectories(destination);
            if(!Files.isDirectory(destination)||!Files.isWritable(destination))throw new IOException("Pasta sem permissão de gravação.");
            String suffix=day+"-"+LocalTime.now().toString().replace(':','-')+"-"+UUID.randomUUID().toString().substring(0,8);
            Path snapshot=data.resolve("snapshot-"+suffix+".db"), partial=destination.resolve(".foco-"+suffix+".tmp"), target=destination.resolve("Foco-backup-"+suffix+".zip");
            try {
                String escaped=snapshot.toString().replace("'","''");
                db.execute("VACUUM INTO '"+escaped+"'");
                try(var out=new ZipOutputStream(Files.newOutputStream(partial));var in=Files.newInputStream(snapshot)){
                    out.putNextEntry(new ZipEntry("foco.db"));in.transferTo(out);out.closeEntry();
                    out.putNextEntry(new ZipEntry("manifest.txt"));out.write(("FOCO BACKUP 1\nDia: "+day+"\nOrigem: SQLite local\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));out.closeEntry();
                }
                try(var archive=new ZipFile(partial.toFile())){
                    if(archive.getEntry("foco.db")==null||archive.getEntry("manifest.txt")==null)throw new IOException("ZIP incompleto.");
                    try(var in=archive.getInputStream(archive.getEntry("foco.db"))){in.transferTo(OutputStream.nullOutputStream());}
                }
                Files.move(partial,target,StandardCopyOption.ATOMIC_MOVE);
                save("backup.lastSuccessDay",day);
                save("backup.lastSuccessAt",Instant.now().toString());
                save("backup.lastDestination",destination.toString());
                return new BackupResult(target.toString(),day,"Backup criado e verificado.");
            } finally {Files.deleteIfExists(snapshot);Files.deleteIfExists(partial);}
        }catch(IOException e){throw new IllegalArgumentException("Backup não concluído: "+e.getMessage());}
    }
    boolean due(Path destination,Instant now){
        String interval=setting("backup.intervalMinutes");
        long minutes=interval.isBlank()?1440:validateInterval(interval);
        String last=setting("backup.lastSuccessAt");
        if(last.isBlank()||!destination.toString().equals(setting("backup.lastDestination")))return true;
        try{return !now.isBefore(Instant.parse(last).plusSeconds(minutes*60));}
        catch(java.time.format.DateTimeParseException e){return true;}
    }
    static long validateInterval(String value){
        try{long minutes=Long.parseLong(value);if(minutes>=1&&minutes<=525600)return minutes;}
        catch(NumberFormatException ignored){}
        throw new IllegalArgumentException("Informe um intervalo inteiro entre 1 e 525600 minutos.");
    }
    private String setting(String key){return db.query("SELECT value FROM settings WHERE key=?",r->r.next()?r.getString(1):"",key);}
    private void save(String key,String value){db.update("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",key,value);}
}
