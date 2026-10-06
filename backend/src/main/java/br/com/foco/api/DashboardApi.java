package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

record GroupTotal(String parent,String name,String client,long sessions,double seconds,BigDecimal value,long unpriced) {}
record DashboardSummary(long sessions,double seconds,BigDecimal value,long unpriced,List<GroupTotal> groups,List<GroupTotal> projects) {}
@RestController
@RequestMapping("/api/dashboard")
class DashboardController {
    private final JdbcTemplate db;
    DashboardController(JdbcTemplate db){this.db=db;}
    @GetMapping DashboardSummary summary(@RequestParam(defaultValue="client") String group,
            @RequestParam(required=false) String from,@RequestParam(required=false) String to,
            @RequestParam(defaultValue="") String client,@RequestParam(defaultValue="") String project,
            @RequestParam(defaultValue="") String consultant,@RequestParam(defaultValue="") String activity,
            @RequestParam(defaultValue="") String status,@RequestParam(defaultValue="") String query,
            @RequestParam(defaultValue="") String minHours,@RequestParam(defaultValue="") String maxHours,
            @RequestParam(defaultValue="rounded") String hoursMode){
        String seconds=HoursBasis.sql(hoursMode);
        String source="(SELECT *,"+seconds+" AS selected_seconds FROM sessions)";
        String column=switch(group){case "project"->"project";case "activity"->"activity";case "consultant"->"consultant";default->"client";};
        StringBuilder where=new StringBuilder(" WHERE (? IS NULL OR julianday(start_at)>=julianday(?)) AND (? IS NULL OR julianday(start_at)<julianday(?)) AND (?='' OR client=?) AND (?='' OR project=?) AND (?='' OR consultant=?) AND (?='' OR activity=?) AND (?='' OR status=?) AND (?='' OR lower(client||' '||project||' '||activity||' '||details) LIKE '%'||lower(?)||'%')");
        List<Object> params=new ArrayList<>(Arrays.asList(from,from,to,to,client,client,project,project,consultant,consultant,activity,activity,status,status,query,query));
        if(!minHours.isBlank()){where.append(" AND selected_seconds>=?");params.add(hours(minHours));}
        if(!maxHours.isBlank()){where.append(" AND selected_seconds<=?");params.add(hours(maxHours));}
        Object[] args=params.toArray();
        String base="SELECT count(*) n,coalesce(sum(selected_seconds),0) seconds,coalesce(sum(CASE WHEN hourly_rate IS NOT NULL THEN CAST(hourly_rate AS REAL)*selected_seconds/3600 ELSE 0 END),0) value,coalesce(sum(CASE WHEN hourly_rate IS NULL THEN 1 ELSE 0 END),0) unpriced FROM "+source+where;
        Map<String,Object> totals=db.queryForMap(base,args);
        String grouped="SELECT "+column+" name,CASE WHEN count(distinct lower(trim(client)))=1 THEN min(client) END client,count(*) n,sum(selected_seconds) seconds,sum(CASE WHEN hourly_rate IS NOT NULL THEN CAST(hourly_rate AS REAL)*selected_seconds/3600 ELSE 0 END) value,sum(CASE WHEN hourly_rate IS NULL THEN 1 ELSE 0 END) unpriced FROM "+source+where+" GROUP BY lower(trim("+column+")) ORDER BY seconds DESC,name";
        List<GroupTotal> groups=db.query(grouped,(r,n)->total(null,r.getString("name"),r.getString("client"),r.getLong("n"),r.getDouble("seconds"),r.getBigDecimal("value"),r.getLong("unpriced")),args);
        List<GroupTotal> projects=group.equals("client")||group.equals("consultant")?db.query("SELECT "+column+" parent,project name,CASE WHEN count(distinct lower(trim(client)))=1 THEN min(client) END client,count(*) n,sum(selected_seconds) seconds,sum(CASE WHEN hourly_rate IS NOT NULL THEN CAST(hourly_rate AS REAL)*selected_seconds/3600 ELSE 0 END) value,sum(CASE WHEN hourly_rate IS NULL THEN 1 ELSE 0 END) unpriced FROM "+source+where+" GROUP BY lower(trim("+column+")),lower(trim(project)) ORDER BY parent,seconds DESC,name",(r,n)->total(r.getString("parent"),r.getString("name"),r.getString("client"),r.getLong("n"),r.getDouble("seconds"),r.getBigDecimal("value"),r.getLong("unpriced")),args):List.of();
        return new DashboardSummary(((Number)totals.get("n")).longValue(),((Number)totals.get("seconds")).doubleValue(),decimal(totals.get("value")),((Number)totals.get("unpriced")).longValue(),groups,projects);
    }
    private static BigDecimal decimal(Object value){return value==null?BigDecimal.ZERO:value instanceof BigDecimal decimal?decimal:new BigDecimal(value.toString());}
    private static double hours(String raw){try{double value=Double.parseDouble(raw);if(!Double.isFinite(value)||value<0)throw new NumberFormatException();return value*3600;}catch(NumberFormatException e){throw new IllegalArgumentException("Filtro de horas inválido.");}}
    private static GroupTotal total(String parent,String name,String client,long count,double seconds,BigDecimal value,long unpriced){return new GroupTotal(parent,name==null||name.isBlank()?"Sem projeto":name,client,count,seconds,value==null?BigDecimal.ZERO:value,unpriced);}
}
