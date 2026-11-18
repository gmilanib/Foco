import { csvCell, isoDay } from './format';
import { focusSeconds, type HoursMode } from './hoursBasis';
import type { Session } from './types';

export const activityListHeaders = ['Hora início', 'Duração', 'Hora fim', 'Cliente', 'Projeto', 'Detalhamento', 'Consultor solicitante'];
export type ActivityRange = { from: string; to: string };
export type ActivityLine = { day: string; cells: string[] };
const dateLabel = (day: string) => day.split('-').reverse().join('/');
const oneLine = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const timeLabel = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function validActivityRange({ from, to }: ActivityRange): boolean {
  const valid = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= '1900-01-01'
    && Number.isFinite(Date.parse(`${day}T12:00:00`)) && isoDay(new Date(`${day}T12:00:00`)) === day;
  return valid(from) && valid(to) && from <= to;
}

export function activityLines(sessions: Session[], range: ActivityRange, hoursMode: HoursMode): ActivityLine[] {
  if (!validActivityRange(range)) return [];
  return sessions.filter(session => {
    const day = isoDay(new Date(session.startAt));
    return !session.virtual && day >= range.from && day <= range.to;
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id))
    .map(session => {
      const start = new Date(session.startAt), day = isoDay(start);
      const end = session.endAt ? new Date(session.endAt) : null;
      const open = ['Em andamento', 'Pausada'].includes(session.status);
      const seconds = Math.max(0, Math.round(focusSeconds(session, hoursMode)));
      const elapsed = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      return { day, cells: [
        timeLabel(start), elapsed,
        open ? session.status : end ? `${timeLabel(end)}${isoDay(end) !== day ? ` (${dateLabel(isoDay(end))})` : ''}` : '—',
        oneLine(session.client) || '—', oneLine(session.project) || '—',
        oneLine(session.details) || oneLine(session.activity) || '—', oneLine(session.consultant) || '—',
      ] };
    });
}

export function activityListText(lines: ActivityLine[]): string {
  const result: string[] = [];
  let previousDay = '';
  for (const line of lines) {
    if (line.day !== previousDay) {
      if (result.length) result.push('');
      result.push(dateLabel(line.day), activityListHeaders.join(' - '));
      previousDay = line.day;
    }
    result.push(line.cells.join(' - '));
  }
  return result.join('\r\n');
}

export function activityListCsv(lines: ActivityLine[], range: ActivityRange): string {
  // Em períodos com mais de um dia, a data acompanha o horário sem criar outra coluna.
  const rows = lines.map(line => range.from === range.to ? line.cells
    : [`${dateLabel(line.day)} ${line.cells[0]}`, ...line.cells.slice(1)]);
  return '\uFEFF' + [activityListHeaders, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
}
