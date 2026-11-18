package br.com.foco.api;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.nio.file.Path;

@Component("dataPaths")
public class DataPaths {
    private final String directory;
    public DataPaths(Environment env) {
        directory = resolve(env.getProperty("os.name", ""), env.getProperty("user.home"),
                env.getProperty("FOCO_DATA_DIR"), env.getProperty("XDG_DATA_HOME"));
    }
    public String getDirectory() { return directory; }
    static String resolve(String os, String home, String override, String xdg) {
        if (override != null && !override.isBlank()) return override;
        if (os.toLowerCase(java.util.Locale.ROOT).startsWith("windows"))
            return Path.of(home, "AppData", "Local", "FocoJava").toString();
        String root = xdg != null && xdg.startsWith("/") ? xdg : Path.of(home, ".local", "share").toString();
        return Path.of(root, "foco-java", "data").toString();
    }
}
