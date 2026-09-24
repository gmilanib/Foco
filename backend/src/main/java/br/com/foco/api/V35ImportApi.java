package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.w3c.dom.*;
import org.xml.sax.InputSource;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;

record ImportRequest(String directory) {}
record ImportResult(int sessions,int tasks,int settings,int colors,String sourceHash,boolean alreadyImported) {}

@RestController
@RequestMapping("/api/import/v35")
class V35ImportController {
    private final V35Importer importer;
    V35ImportController(V35Importer importer){this.importer=importer;}
    @PostMapping ImportResult run(@RequestBody ImportRequest request){
        if(request.directory()==null||request.directory().isBlank())throw new IllegalArgumentException("Selecione uma pasta de dados da V35.");
        try{return importer.importDirectory(Path.of(request.directory()));}
        catch(IOException|ReflectiveOperationException e){throw new IllegalArgumentException("Importação cancelada; nenhum arquivo de origem foi alterado. "+e.getMessage());}
    }
}

@org.springframework.stereotype.Service
class V35Importer {
    private final JdbcTemplate db;
    V35Importer(JdbcTemplate db){this.db=db;}
    @Transactional(rollbackFor=Exception.class)
    ImportResult importDirectory(Path input) throws IOException,ReflectiveOperationException {
        Path folder=input.toRealPath();
        Path sessionFile=folder.resolve("sessions.xml");
        if(!Files.isRegularFile(sessionFile,LinkOption.NOFOLLOW_LINKS))throw new IllegalArgumentException("A pasta selecionada não contém sessions.xml.");
        String hash=hashFolder(folder);
        String imported=db.query("SELECT value FROM settings WHERE key='v35.import.hash'",r->r.next()?r.getString(1):null);
        if(imported!=null){if(imported.equals(hash))return new ImportResult(0,0,0,0,imported,true);throw new IllegalArgumentException("Este banco já recebeu outra origem V35. A nova origem não foi importada.");}
        List<Element> taskNodes=readOptional(folder.resolve("tasks.xml"));
        List<Element> sessionNodes=readOptional(sessionFile);
        if(sessionNodes.size()>250000||taskNodes.size()>100000)throw new IllegalArgumentException("A pasta excede o limite seguro de registros para a importação inicial.");
        for(Element node:taskNodes)insertTask(node);
        for(Element node:sessionNodes)insertSession(node);
        int config=0;
        config+=importAppearance(folder.resolve("appearance.xml"));
        config+=importPricing(folder.resolve("pricing.xml"));
        config+=importQuick(folder.resolve("quick.xml"));
        config+=importOverlay(folder.resolve("overlay.xml"));
        Path backupFile=folder.resolve("backup.xml");
        if(Files.exists(backupFile)) {
            Element settings=readRoot(backupFile);
            String destination=value(settings,"Destination"),day=value(settings,"LastSuccessDay");
            if(!destination.isBlank())saveSetting("backup.destination",destination); if(!day.isBlank())saveSetting("backup.lastSuccessDay",day);config++;
        }
        int colors=importColors(folder.resolve("client-colors.xml"));
        saveSetting("v35.import.hash",hash); saveSetting("v35.import.date",OffsetDateTime.now().toString());
        return new ImportResult(sessionNodes.size(),taskNodes.size(),config,colors,hash,false);
    }
    private int importAppearance(Path path)throws IOException{
        if(!Files.exists(path))return 0;Element e=readRoot(path);
        String follow=value(e,"FollowWindows"),dark=value(e,"Dark"),accentHex=value(e,"AccentHex");
        int accentIndex=integer(e,"Accent");String[] palette={"#5566D9","#0070F2","#147553","#945B08","#B6326A","#8047C6","#007C83","#B64430","#627024"};
        if(!accentHex.matches("#[0-9a-fA-F]{6}"))accentHex=palette[Math.max(0,Math.min(palette.length-1,accentIndex))];
        saveSetting("theme",Boolean.parseBoolean(follow)?"system":Boolean.parseBoolean(dark)?"dark":"light");saveSetting("accent",accentHex.toUpperCase(Locale.ROOT));
        saveSetting("accent.secondary",value(e,"Accent2Hex"));return 1;
    }
    private int importPricing(Path path)throws IOException{
        if(!Files.exists(path))return 0;Element e=readRoot(path);String rate=value(e,"HourlyRate");
        if(!rate.isBlank())saveSetting("pricing.defaultHourlyRate",nullableDecimal(rate));return 1;
    }
    private int importQuick(Path path)throws IOException{
        if(!Files.exists(path))return 0;Element e=readRoot(path);
        int limit=integer(e,"Limit");if(!Set.of(0,5,10,20).contains(limit))limit=5;saveSetting("quick.limit",Integer.toString(limit));
        List<String> presets=new ArrayList<>();NodeList presetNodes=e.getElementsByTagName("int");if(presetNodes.getLength()>8)throw new IllegalArgumentException("A V35 permite no máximo oito durações rápidas.");
        for(int i=0;i<presetNodes.getLength();i++){String v=presetNodes.item(i).getTextContent().trim();try{int n=Integer.parseInt(v);if(n<1||n>999)throw new NumberFormatException();if(!presets.contains(v))presets.add(v);}catch(NumberFormatException ex){throw new IllegalArgumentException("Duração rápida inválida no XML V35.");}}
        saveSetting("quick.presets",String.join(",",presets));NodeList favorites=e.getElementsByTagName("string");List<String> keys=new ArrayList<>();for(int i=0;i<favorites.getLength();i++){String v=favorites.item(i).getTextContent().trim();if(v.length()<=500&&!keys.contains(v))keys.add(v);}
        saveSetting("quick.favorites",String.join("\n",keys));return 1;
    }
    private int importOverlay(Path path)throws IOException{
        if(!Files.exists(path))return 0;Element e=readRoot(path);
        double opacity;try{opacity=Double.parseDouble(value(e,"Opacity"));}catch(NumberFormatException ex){opacity=1;}
        if(!Double.isFinite(opacity)||opacity<0.4||opacity>1)throw new IllegalArgumentException("Opacidade da sobreposição inválida na V35.");
        saveSetting("overlay.opacity",Double.toString(opacity));saveSetting("overlay.remember",value(e,"Remember"));saveSetting("overlay.noActivate",value(e,"NoActivate"));
        saveSetting("overlay.monitor",value(e,"Monitor"));saveSetting("overlay.left",value(e,"Left"));saveSetting("overlay.top",value(e,"Top"));return 1;
    }
    private List<Element> readOptional(Path path) throws IOException {
        if(!Files.exists(path,LinkOption.NOFOLLOW_LINKS))return List.of();
        Element root=readRoot(path);List<Element> rows=new ArrayList<>();
        for(Node child=root.getFirstChild();child!=null;child=child.getNextSibling())if(child instanceof Element element)rows.add(element);
        return rows;
    }
    private Element readRoot(Path path)throws IOException{
        if(!Files.exists(path,LinkOption.NOFOLLOW_LINKS))throw new IllegalArgumentException("Arquivo XML ausente: "+path.getFileName());
        if(Files.isSymbolicLink(path)||!Files.isRegularFile(path,LinkOption.NOFOLLOW_LINKS)||Files.size(path)>128L*1024*1024)throw new IllegalArgumentException("Arquivo ausente, vinculado ou maior que 128 MB: "+path.getFileName());
        try {
            var factory=DocumentBuilderFactory.newInstance(); factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING,true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
            factory.setXIncludeAware(false); factory.setExpandEntityReferences(false);
            Document document=factory.newDocumentBuilder().parse(new InputSource(Files.newInputStream(path)));
            return document.getDocumentElement();
        } catch(Exception e){throw new IllegalArgumentException("XML inválido ou inseguro em "+path.getFileName()+".",e);}
    }
    private void insertTask(Element e){
        String id=value(e,"Id"); if(id.isBlank())id=UUID.nameUUIDFromBytes((value(e,"Client")+"|"+value(e,"Project")+"|"+value(e,"Activity")).getBytes(StandardCharsets.UTF_8)).toString();
        String activity=value(e,"Activity"); if(activity.isBlank()||activity.length()>200)throw new IllegalArgumentException("Tarefa sem atividade válida.");
        var count=db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,id); if(count!=null&&count>0)return;
        String now=OffsetDateTime.now().toString();
        db.update("INSERT INTO tasks(id,client,project,activity,details,consultant,card_reference,hourly_rate,completed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",id,value(e,"Client"),value(e,"Project"),activity,value(e,"Details"),value(e,"Consultant"),value(e,"Card"),nullableDecimal(value(e,"HourlyRate")),Boolean.parseBoolean(value(e,"Completed"))?1:0,now,now);
    }
    private void insertSession(Element e){
        String activity=value(e,"Activity"); if(activity.isBlank()||activity.length()>200)throw new IllegalArgumentException("Lançamento sem atividade válida.");
        OffsetDateTime start=OffsetDateTime.parse(value(e,"StartIso")); String endText=value(e,"EndIso");
        OffsetDateTime end=null; if(!endText.isBlank())try{OffsetDateTime parsed=OffsetDateTime.parse(endText);if(parsed.getYear()>1)end=parsed;}catch(RuntimeException ignored){}
        String status=value(e,"Status"); if(status.equals("Em andamento")||status.equals("Pausada")){status="Interrompida";end=null;}
        String taskId=value(e,"TaskId"); if(taskId.isBlank()||db.queryForObject("SELECT count(*) FROM tasks WHERE id=?",Integer.class,taskId)==0)taskId=null;
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO sessions(id,task_id,client,project,activity,details,consultant,card_reference,start_at,end_at,planned_seconds,focus_seconds,hourly_rate,status,imported_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            id,taskId,value(e,"Client"),value(e,"Project"),activity,value(e,"Details"),value(e,"RequestingConsultant"),value(e,"CardReference"),start.toString(),end==null?null:end.toString(),integer(e,"PlannedSeconds"),number(e,"FocusSeconds"),nullableDecimal(value(e,"HourlyRate")),status,OffsetDateTime.now().toString());
    }
    private int importColors(Path path) throws IOException {
        if(!Files.exists(path))return 0; int count=0;
        for(Element e:readOptional(path)) {String client=value(e,"Client"),hex=value(e,"Hex");if(client.isBlank()||!hex.matches("#[0-9a-fA-F]{6}"))continue;
            db.update("INSERT INTO client_colors(client_key,client_name,hex) VALUES(?,?,?) ON CONFLICT(client_key) DO UPDATE SET client_name=excluded.client_name,hex=excluded.hex",client.trim().toLowerCase(Locale.ROOT),client.trim(),hex.toUpperCase(Locale.ROOT));count++;}
        return count;
    }
    private void saveSetting(String key,String value){db.update("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",key,value);}
    private static String value(Element parent,String tag){NodeList nodes=parent.getElementsByTagName(tag);return nodes.getLength()==0||nodes.item(0).getTextContent()==null?"":nodes.item(0).getTextContent().trim();}
    private static int integer(Element e,String tag){try{return Math.max(0,Integer.parseInt(value(e,tag)));}catch(NumberFormatException x){return 0;}}
    private static double number(Element e,String tag){try{double n=Double.parseDouble(value(e,tag));return Double.isFinite(n)&&n>=0?n:0;}catch(NumberFormatException x){return 0;}}
    private static String nullableDecimal(String value){if(value.isBlank())return null;try{BigDecimal d=new BigDecimal(value);if(d.signum()<0||d.compareTo(new BigDecimal("1000000"))>0)throw new IllegalArgumentException("Valor/hora importado fora do limite.");return d.toPlainString();}catch(NumberFormatException e){throw new IllegalArgumentException("Valor/hora inválido no XML V35.");}}
    private static void validateSize(String text){if(text.length()>1_000_000)throw new IllegalArgumentException("Arquivo de configuração maior que 1 MB.");}
    private String hashFolder(Path folder) throws IOException {
        try {MessageDigest digest=MessageDigest.getInstance("SHA-256");
            for(String name:List.of("sessions.xml","tasks.xml","appearance.xml","pricing.xml","quick.xml","overlay.xml","client-colors.xml","backup.xml")){
                Path file=folder.resolve(name);if(!Files.exists(file))continue;if(Files.isSymbolicLink(file))throw new IllegalArgumentException("Arquivo vinculado não pode ser importado: "+name);
                digest.update(name.getBytes(StandardCharsets.UTF_8));try(var input=Files.newInputStream(file)){input.transferTo(new java.security.DigestOutputStream(OutputStream.nullOutputStream(),digest));}}
            return HexFormat.of().formatHex(digest.digest());
        }catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
