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
    LocalBackup(JdbcTemplate db,@Value("${FOCO_DATA_DIR:${user.home}/AppData/Local/FocoJava}")String directory){this.db=db;this.data=Paths.get(directory).toAbsolutePath().normalize();}
    @EventListener(ApplicationReadyEvent.class) void onOpen(){runDaily();}
    @Scheduled(fixedDelay=60000) void runDaily(){String folder=setting("backup.destination");if(!folder.isBlank())try{create(folder,false);}catch(RuntimeException ignored){/* Panel surfaces errors on the next explicit attempt. */}}
    synchronized BackupResult create(String folder,boolean manual){
        if(folder==null||folder.isBlank())throw new IllegalArgumentException("Escolha a pasta de backup nas Configurações.");
        Path destination=Paths.get(folder).toAbsolutePath().normalize();
        if(destination.startsWith(data))throw new IllegalArgumentException("A pasta de backup deve ficar fora dos dados do Foco.");
        String day=LocalDate.now().toString();
        if(!manual&&day.equals(setting("backup.lastSuccessDay")))return new BackupResult("",day,"Já existe um backup diário verificado.");
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
                if(!manual)save("backup.lastSuccessDay",day);
                return new BackupResult(target.toString(),day,"Backup criado e verificado.");
            } finally {Files.deleteIfExists(snapshot);Files.deleteIfExists(partial);}
        }catch(IOException e){throw new IllegalArgumentException("Backup não concluído: "+e.getMessage());}
    }
    private String setting(String key){return db.query("SELECT value FROM settings WHERE key=?",r->r.next()?r.getString(1):"",key);}
    private void save(String key,String value){db.update("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",key,value);}
}
