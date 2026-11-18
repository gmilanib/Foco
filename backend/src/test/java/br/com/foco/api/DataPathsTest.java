package br.com.foco.api;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class DataPathsTest {
    @Test void preservesWindowsStandalonePath() {
        assertEquals(Path.of("home", "AppData", "Local", "FocoJava").toString(),
                DataPaths.resolve("Windows 11", "home", null, null));
    }
    @Test void usesLinuxDataHome() {
        assertEquals(Path.of("/home/ana", ".local", "share", "foco-java", "data").toString(),
                DataPaths.resolve("Linux", "/home/ana", null, "relative"));
        assertEquals(Path.of("/dados pessoais", "foco-java", "data").toString(),
                DataPaths.resolve("Linux", "/home/ana", null, "/dados pessoais"));
    }
    @Test void explicitDirectoryWinsInSpringEnvironment() {
        var env = new MockEnvironment().withProperty("os.name", "Linux")
                .withProperty("user.home", "/home/ana").withProperty("FOCO_DATA_DIR", "/dados/foco");
        assertEquals("/dados/foco", new DataPaths(env).getDirectory());
    }
}
