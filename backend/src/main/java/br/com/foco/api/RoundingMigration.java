package br.com.foco.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.nio.file.Path;
import java.sql.Connection;

@Component
class RoundingMigration {
    private final DataSource source;
    private final LocalBackup backup;
    private final DatabaseMaintenance maintenance;
    private final Path data;
    RoundingMigration(DataSource source,LocalBackup backup,DatabaseMaintenance maintenance,@Value("${FOCO_DATA_DIR:${user.home}/AppData/Local/FocoJava}") String directory) {
        this.source=source;this.backup=backup;this.maintenance=maintenance;this.data=Path.of(directory).toAbsolutePath().normalize();
    }
    void run() {
        var lock=maintenance.write();lock.lock();
        try {
            try(var connection=source.getConnection()){if(!FocusRounding.pending(connection))return;}
            var safety=backup.create(data.getParent().resolve("rounding-safety").toString(),true);
            try(var connection=source.getConnection()) {
                connection.setAutoCommit(false);
                try {
                    int count=FocusRounding.migrate(connection);
                    save(connection,"rounding.migratedSessions",String.valueOf(count));
                    save(connection,"rounding.safetyBackup",safety.path());
                    connection.commit();
                }catch(Exception error){connection.rollback();throw error;}
            }
        }catch(Exception error){throw new IllegalStateException("Não foi possível converter o histórico para 2 minutos; os tempos anteriores foram preservados.",error);}
        finally{lock.unlock();}
    }
    private static void save(Connection connection,String key,String value)throws java.sql.SQLException {
        try(var statement=connection.prepareStatement("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")){statement.setString(1,key);statement.setString(2,value);statement.executeUpdate();}
    }
}
