package br.com.foco.api;

import java.sql.*;
import java.time.*;
import java.util.*;
import tools.jackson.databind.ObjectMapper;

final class FocusRounding {
    static final int BLOCK_SECONDS=120;
    private static final String CANDIDATES="rounding_version=0 AND status NOT IN ('Em andamento','Pausada') AND end_at IS NOT NULL AND rounded_end_at IS NOT NULL AND julianday(rounded_end_at)>julianday(end_at)";
    private FocusRounding() {}
    static double round(double seconds) {
        if(!Double.isFinite(seconds)||seconds<0)throw new IllegalArgumentException("Tempo de foco inválido.");
        return Math.ceil(seconds/BLOCK_SECONDS)*BLOCK_SECONDS;
    }
    static boolean pending(Connection connection)throws SQLException {
        try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT count(*) FROM sessions WHERE "+CANDIDATES)){return rows.next()&&rows.getLong(1)>0;}
    }
    /* Caller owns the transaction. Equal ends represent unrounded entries and stay intact. */
    static int migrate(Connection connection)throws SQLException {
        var entries=new ArrayList<Map<String,Object>>();
        try(var query=connection.createStatement();var rows=query.executeQuery("SELECT * FROM sessions WHERE "+CANDIDATES+" ORDER BY id")) {
            var metadata=rows.getMetaData();
            while(rows.next()) {var row=new LinkedHashMap<String,Object>();for(int i=1;i<=metadata.getColumnCount();i++)row.put(metadata.getColumnName(i),rows.getObject(i));entries.add(row);}
        }
        var json=new ObjectMapper();
        try(var update=connection.prepareStatement("UPDATE sessions SET focus_seconds=?,rounded_end_at=?,rounding_version=2 WHERE id=?");
            var history=connection.prepareStatement("INSERT INTO change_history(id,entity_type,entity_id,changed_at,old_value,new_value) VALUES(?,'session',?,?,?,?)")) {
            for(var before:entries) {
                var end=OffsetDateTime.parse(before.get("end_at").toString());
                var previousEnd=OffsetDateTime.parse(before.get("rounded_end_at").toString());
                double saved=((Number)before.get("focus_seconds")).doubleValue();
                double adjustment=Duration.between(end,previousEnd).toNanos()/1_000_000_000.0;
                if(!Double.isFinite(saved)||saved<0||adjustment<0||adjustment>saved)throw new IllegalArgumentException("Arredondamento histórico inconsistente: "+before.get("id"));
                double real=Math.round((saved-adjustment)*1_000_000_000.0)/1_000_000_000.0;
                double rounded=round(real);
                String roundedEnd=end.plusNanos(Math.round((rounded-real)*1_000_000_000.0)).toString();
                var after=new LinkedHashMap<>(before);after.put("focus_seconds",rounded);after.put("rounded_end_at",roundedEnd);after.put("rounding_version",2);
                update.setDouble(1,rounded);update.setString(2,roundedEnd);update.setString(3,before.get("id").toString());update.executeUpdate();
                history.setString(1,UUID.randomUUID().toString());history.setString(2,before.get("id").toString());history.setString(3,OffsetDateTime.now().toString());
                history.setString(4,json.writeValueAsString(before));history.setString(5,json.writeValueAsString(after));history.executeUpdate();
            }
        }
        return entries.size();
    }
}
