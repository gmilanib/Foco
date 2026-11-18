package br.com.foco.api;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

record CatalogName(String name,String client) {}
record CatalogMerge(String source,String target) {}

@RestController
@RequestMapping("/api/catalogs")
class CatalogController {
    private final CatalogService catalogs;
    CatalogController(CatalogService catalogs) { this.catalogs=catalogs; }

    @GetMapping CatalogSnapshot list() { return catalogs.snapshot(); }

    @PostMapping("/{type}") Map<String,String> create(@PathVariable String type,@RequestBody CatalogName input) {
        return Map.of("name",catalogs.createForClient(CatalogType.parse(type),input.name(),input.client()));
    }

    @PutMapping("/projects/{name}/client") void link(@PathVariable String name,@RequestBody CatalogName input){catalogs.linkProject(name,input.client());}

    @PutMapping("/{type}/{name}") Map<String,String> rename(@PathVariable String type,@PathVariable String name,@RequestBody CatalogName input) {
        return Map.of("name",catalogs.rename(CatalogType.parse(type),name,input.name()));
    }

    @PostMapping("/{type}/merge") Map<String,String> merge(@PathVariable String type,@RequestBody CatalogMerge input) {
        return Map.of("name",catalogs.merge(CatalogType.parse(type),input.source(),input.target()));
    }

    @DeleteMapping("/{type}/{name}") void delete(@PathVariable String type,@PathVariable String name) {
        catalogs.delete(CatalogType.parse(type),name);
    }
}
