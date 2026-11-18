import { useEffect, useMemo, useRef, useState } from 'react';
import { request, safeMessage } from '../api';
import { activityLines, activityListCsv, activityListText, validActivityRange, type ActivityRange } from '../activityList';
import { isoDay } from '../format';
import { useHoursPreference } from '../HoursPreference';
import { hasUnknownPrecision, type HoursMode } from '../hoursBasis';
import type { Session } from '../types';
import { Dialog } from './Dialog';
import { Field } from './Field';

export function ActivityListDialog({ onClose }: { onClose: () => void }) {
  const preferredHours = useHoursPreference();
  const [range, setRange] = useState<ActivityRange>(() => { const today = isoDay(new Date()); return { from: today, to: today }; });
  const [hoursMode, setHoursMode] = useState<HoursMode>(preferredHours);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const version = useRef(0);
  const lines = useMemo(() => activityLines(sessions ?? [], range, hoursMode), [sessions, range, hoursMode]);
  const text = useMemo(() => activityListText(lines), [lines]);
  const valid = validActivityRange(range);
  const ready = sessions !== null && lines.length > 0 && valid && !loading && !busy;
  const legacy = (sessions ?? []).some(session => hasUnknownPrecision(session)
    && activityLines([session], range, hoursMode).length > 0);
  const load = async () => {
    const current = ++version.current;
    setSessions(null); setNotice(''); setError('');
    if (!valid) return;
    setLoading(true);
    try {
      // O filtro usa a data local do início. Registros UTC também ficam no dia correto.
      const rows = await request<Session[]>('/api/sessions');
      if (current === version.current) setSessions(rows);
    } catch (e) {
      if (current === version.current) setError(`Não foi possível carregar a lista. ${safeMessage(e)}`);
    } finally {
      if (current === version.current) setLoading(false);
    }
  };
  useEffect(() => { void load(); return () => { version.current++; }; }, []);
  const changeRange = (next: ActivityRange) => {
    version.current++;
    setRange(next); setSessions(null); setLoading(false); setError(''); setNotice('');
  };
  const output = async (format: 'copy' | 'txt' | 'csv') => {
    if (!ready) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const name = `atividades-${range.from}${range.from === range.to ? '' : `-a-${range.to}`}`;
      if (format === 'copy') {
        await window.foco.copyText(text);
        setNotice('Lista copiada.');
      } else {
        const saved = format === 'txt' ? await window.foco.saveText(`${name}.txt`, text)
          : await window.foco.saveCsv(`${name}.csv`, activityListCsv(lines, range));
        setNotice(saved ? 'Lista exportada.' : 'Exportação cancelada.');
      }
    } catch (e) { setError(safeMessage(e)); }
    finally { setBusy(false); }
  };
  return <Dialog title="Lista de atividades" onClose={() => { if (!busy) onClose(); }}>
    <div className="dialog-form">
      <p>Uma linha por apontamento, em ordem de início. O período considera a data de início de cada atividade.</p>
      <div className="form-grid form-grid--two">
        <Field label="Data inicial da lista"><input type="date" min="1900-01-01" max="9999-12-31" value={range.from} disabled={busy} onChange={e => changeRange({ ...range, from: e.target.value })}/></Field>
        <Field label="Data final da lista"><input type="date" min="1900-01-01" max="9999-12-31" value={range.to} disabled={busy} onChange={e => changeRange({ ...range, to: e.target.value })}/></Field>
      </div>
      <div className="actions">
        <button className="button" disabled={busy} onClick={() => { const today = isoDay(new Date()); changeRange({ from: today, to: today }); }}>Hoje</button>
        <button className="button" disabled={!valid || loading || busy} onClick={() => void load()}>Atualizar lista</button>
        <Field label="Duração da lista"><select value={hoursMode} disabled={busy} onChange={e => { setHoursMode(e.target.value as HoursMode); setNotice(''); setError(''); }}><option value="real">Horas reais</option><option value="rounded">Horas arredondadas</option></select></Field>
      </div>
      {!valid && <p role="alert">Informe as duas datas. A data inicial deve ser anterior ou igual à data final.</p>}
      {loading && <p role="status">Carregando atividades…</p>}
      {!loading && valid && sessions === null && !error && <p role="status">Selecione Atualizar lista para carregar o período.</p>}
      {error && <p role="alert">{error}</p>}
      {sessions !== null && !loading && (lines.length ? <>
        <p className="muted">{lines.length} apontamento(s). Duração em horas, minutos e segundos, sem pausas. Hora fim real. Atividades abertas mostram o tempo registrado na última atualização.</p>
        {legacy && <p className="muted">Registros antigos sem precisão disponível mantêm a duração salva.</p>}
        <Field label="Prévia da lista"><textarea readOnly value={text} rows={12} spellCheck={false}/></Field>
      </> : <p role="status">Nenhuma atividade encontrada no período.</p>)}
      {notice && <p role="status">{notice}</p>}
      <div className="dialog__footer">
        <button className="button" disabled={busy} onClick={onClose}>Fechar</button>
        <button className="button" disabled={!ready} onClick={() => void output('txt')}>Exportar TXT</button>
        <button className="button" disabled={!ready} onClick={() => void output('csv')}>Exportar CSV simples</button>
        <button className="button button--primary" disabled={!ready} onClick={() => void output('copy')}>Copiar lista</button>
      </div>
    </div>
  </Dialog>;
}
