package br.com.foco.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import javax.sql.DataSource;
import java.nio.file.*;
import java.util.Properties;

@Configuration
class BackendConfig {
    @Bean DataSource focoDataSource(@Value("${spring.datasource.url:}") String url,
            @Value("#{dataPaths.directory}") String folder) throws Exception {
        Files.createDirectories(Paths.get(folder));
        var source=new DriverManagerDataSource();
        source.setDriverClassName("org.sqlite.JDBC"); source.setUrl(url.isBlank()?"jdbc:sqlite:"+Paths.get(folder,"foco.db"):url);
        Properties sqlite=new Properties();sqlite.setProperty("foreign_keys","true");source.setConnectionProperties(sqlite);
        return source;
    }
}
