package br.com.foco.api;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<Map<String,String>> missing(Exception error) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Registro não encontrado."));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String,String>> invalid(Exception error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }
}

@RestController
@RequestMapping("/api/health")
class HealthController {
    @GetMapping Map<String,String> health() { return Map.of("status", "ok", "version", "1.0.0"); }
}
