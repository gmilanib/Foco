package br.com.foco.api;

import java.time.*;

record WorkSpan(OffsetDateTime startAt, OffsetDateTime endAt) {
    double seconds() { return Duration.between(startAt.toInstant(), endAt.toInstant()).toMillis()/1000.0; }
}

final class WorkSchedule {
    static final ZoneId ZONE = ZoneId.systemDefault();
    private WorkSchedule() {}
}
