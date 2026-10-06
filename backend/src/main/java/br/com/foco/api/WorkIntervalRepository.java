package br.com.foco.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;

record WorkInterval(String sessionId, OffsetDateTime startAt, OffsetDateTime endAt,
        OffsetDateTime lastTickAt, String precision) {}

@Repository
class WorkIntervalRepository {
    private final JdbcTemplate db;
    WorkIntervalRepository(JdbcTemplate db) { this.db = db; }

    void initialize() {
        db.execute("CREATE TABLE IF NOT EXISTS session_work_intervals (" +
                "session_id TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT,last_tick_at TEXT NOT NULL," +
                "precision TEXT NOT NULL DEFAULT 'Precisa',PRIMARY KEY(session_id,start_at))");
        db.execute("CREATE INDEX IF NOT EXISTS idx_work_intervals_session ON session_work_intervals(session_id)");
        db.update("DELETE FROM session_work_intervals WHERE precision='Estimado' AND session_id IN " +
                "(SELECT id FROM sessions WHERE end_at IS NOT NULL)");
        db.update("INSERT INTO session_work_intervals(session_id,start_at,end_at,last_tick_at,precision) " +
                "SELECT s.id,s.start_at,s.end_at,COALESCE(s.end_at,s.start_at),'Estimado' FROM sessions s " +
                "WHERE s.end_at IS NOT NULL AND NOT EXISTS " +
                "(SELECT 1 FROM session_work_intervals w WHERE w.session_id=s.id)");
        closeOrphaned();
    }

    void closeOrphaned() {
        db.update("UPDATE session_work_intervals SET end_at=last_tick_at WHERE end_at IS NULL " +
                "AND session_id IN (SELECT id FROM sessions WHERE status<>'Em andamento')");
    }

    void closeActiveAtLastTick() {
        db.update("UPDATE session_work_intervals SET end_at=last_tick_at WHERE end_at IS NULL " +
                "AND session_id IN (SELECT id FROM sessions WHERE status='Em andamento')");
    }

    void open(String sessionId, OffsetDateTime at, String precision) {
        close(sessionId, at);
        String time = at.toString();
        db.update("INSERT INTO session_work_intervals(session_id,start_at,end_at,last_tick_at,precision) VALUES(?,?,NULL,?,?)",
                sessionId, time, time, precision);
    }

    void tick(String sessionId, OffsetDateTime at) {
        db.update("UPDATE session_work_intervals SET last_tick_at=? WHERE session_id=? AND end_at IS NULL", at.toString(), sessionId);
    }

    void close(String sessionId, OffsetDateTime at) {
        db.update("UPDATE session_work_intervals SET end_at=?,last_tick_at=? WHERE session_id=? AND end_at IS NULL",
                at.toString(), at.toString(), sessionId);
    }

    void replaceEstimate(String sessionId, OffsetDateTime start, OffsetDateTime end) {
        db.update("DELETE FROM session_work_intervals WHERE session_id=?", sessionId);
        if (end != null && end.isAfter(start)) {
            db.update("INSERT INTO session_work_intervals(session_id,start_at,end_at,last_tick_at,precision) VALUES(?,?,?,?, 'Estimado')",
                    sessionId, start.toString(), end.toString(), end.toString());
        }
    }

    List<WorkInterval> findAll() {
        return db.query("SELECT session_id,start_at,end_at,last_tick_at,precision FROM session_work_intervals ORDER BY start_at",
                (r,n)->new WorkInterval(r.getString(1),OffsetDateTime.parse(r.getString(2)),
                        parse(r.getString(3)),OffsetDateTime.parse(r.getString(4)),r.getString(5)));
    }

    private static OffsetDateTime parse(String value) { return value == null ? null : OffsetDateTime.parse(value); }
}
