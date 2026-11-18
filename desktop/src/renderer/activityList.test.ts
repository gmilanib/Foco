import { describe, expect, it } from 'vitest';
import { activityLines, activityListCsv, activityListHeaders, activityListText, validActivityRange } from './activityList';
import type { Session } from './types';

const range = { from: '2026-11-17', to: '2026-11-17' };
const make = (overrides: Partial<Session> = {}): Session => ({
  id: 'one', taskId: null, client: 'Cliente', project: 'Projeto', activity: 'Análise', details: 'Ajustar integração',
  consultant: 'Maria', cardReference: '', startAt: '2026-11-17T09:00:00', endAt: '2026-11-17T11:00:00',
  roundedEndAt: '2026-11-17T11:01:00', plannedSeconds: 0, focusSeconds: 3660, hourlyRate: null, status: 'Encerrada', category: 'Normal', ...overrides,
});

describe('lista simples de atividades', () => {
  it('mantém sete campos na ordem pedida e usa foco sem incluir a pausa entre início e fim', () => {
    const real = activityLines([make()], range, 'real');
    expect(real[0].cells).toEqual(['09:00', '01:00:00', '11:00', 'Cliente', 'Projeto', 'Ajustar integração', 'Maria']);
    expect(activityLines([make()], range, 'rounded')[0].cells).toEqual(['09:00', '01:01:00', '11:00', 'Cliente', 'Projeto', 'Ajustar integração', 'Maria']);
    expect(activityListText(real)).toBe('17/11/2026\r\nHora início - Duração - Hora fim - Cliente - Projeto - Detalhamento - Consultor solicitante\r\n09:00 - 01:00:00 - 11:00 - Cliente - Projeto - Ajustar integração - Maria');
  });

  it('seleciona os dias locais inclusive nos limites e ordena instantes UTC', () => {
    const instant = (time: string) => new Date(`2026-11-17T${time}`).toISOString();
    const rows = [make({ id: 'b', startAt: instant('23:59:59') }), make({ id: 'a', startAt: instant('00:00:00') }),
      make({ id: 'before', startAt: '2026-11-16T23:59:59' }), make({ id: 'after', startAt: '2026-11-18T00:00:00' }),
      make({ id: 'gap', virtual: true })];
    expect(activityLines(rows, range, 'real').map(line => line.cells[0])).toEqual(['00:00', '23:59']);
    expect(rows[0].id).toBe('b');
  });

  it('separa dias e identifica fim em outro dia sem dividir ou duplicar o apontamento', () => {
    const period = { from: '2026-12-31', to: '2027-01-01' };
    const lines = activityLines([
      make({ startAt: '2027-01-01T09:00:00', endAt: '2027-01-01T10:00:00' }),
      make({ id: 'night', startAt: '2026-12-31T23:00:00', endAt: '2027-01-01T01:00:00' }),
    ], period, 'rounded');
    expect(lines.map(line => line.day)).toEqual(['2026-12-31', '2027-01-01']);
    expect(lines[0].cells[2]).toBe('01:00 (01/01/2027)');
    expect(activityListText(lines)).toContain('\r\n\r\n01/01/2027\r\n');
    const csv = activityListCsv(lines, period).split('\r\n');
    expect(csv[1]).toContain('"31/12/2026 23:00"');
    expect(csv[2]).toContain('"01/01/2027 09:00"');
    expect(csv[0].split(';')).toHaveLength(7);
  });

  it.each(['Em andamento', 'Pausada'] as const)('mostra %s sem criar um horário de fim', status => {
    const line = activityLines([make({ status, endAt: null, roundedEndAt: null, focusSeconds: 61.2 })], range, 'real')[0];
    expect(line.cells.slice(0, 3)).toEqual(['09:00', '00:01:01', status]);
  });

  it('mantém o tempo legado e usa a atividade se o detalhamento estiver vazio', () => {
    const line = activityLines([make({ roundedEndAt: null, details: ' \n ', client: '', project: '', consultant: '' })], range, 'real')[0];
    expect(line.cells).toEqual(['09:00', '01:01:00', '11:00', '—', '—', 'Análise', '—']);
  });

  it('preserva acentos e separadores, junta quebras de linha e protege as células CSV', () => {
    const lines = activityLines([make({ client: '=1+1', details: 'Correção; "teste"\r\n  Etapa\t2', consultant: '@Maria' })], range, 'rounded');
    expect(lines[0].cells[5]).toBe('Correção; "teste" Etapa 2');
    const csv = activityListCsv(lines, range);
    expect(csv).toBe('\uFEFF' + activityListHeaders.map(header => `"${header}"`).join(';') + '\r\n'
      + '"09:00";"01:01:00";"11:00";"\'=1+1";"Projeto";"Correção; ""teste"" Etapa 2";"\'@Maria"');
    expect(activityListText(lines).split('\r\n')).toHaveLength(3);
  });

  it.each([
    { from: '', to: '2026-11-17' }, { from: '2026-11-17', to: '' },
    { from: '2026-11-18', to: '2026-11-17' }, { from: '2026-02-30', to: '2026-03-01' },
  ])('rejeita período inválido: %j', period => {
    expect(validActivityRange(period)).toBe(false);
    expect(activityLines([make()], period, 'real')).toEqual([]);
  });

  it('aceita ano bissexto, períodos entre meses e uma lista vazia', () => {
    expect(validActivityRange({ from: '2028-02-29', to: '2028-03-01' })).toBe(true);
    expect(activityListText(activityLines([], range, 'real'))).toBe('');
  });
});
