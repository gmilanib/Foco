package br.com.foco.api;

import java.time.Duration;
import java.util.Set;

final class HoursBasis {
    private HoursBasis() {}
    static String sql(String mode) {
        if(!Set.of("real","rounded").contains(mode))throw new IllegalArgumentException("Tipo de horas inválido.");
        return mode.equals("real")?
            "max(0,focus_seconds-coalesce(max(0,round((julianday(rounded_end_at)-julianday(end_at))*86400,3)),0))":"focus_seconds";
    }
    static double seconds(SessionRow row,String mode) {
        sql(mode);
        if(!mode.equals("real")||row.endAt()==null||row.roundedEndAt()==null)return row.focusSeconds();
        return Math.max(0,row.focusSeconds()-Math.max(0,Duration.between(row.endAt(),row.roundedEndAt()).toMillis()/1000.0));
    }
}
