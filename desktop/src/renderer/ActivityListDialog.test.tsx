import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ActivityListDialog } from './components/ActivityListDialog';
import { HoursPreference } from './HoursPreference';
import { isoDay } from './format';
import type { Session } from './types';

const today = () => isoDay(new Date());
const row = (day = today()): Session => ({ id: day, taskId: null, client: 'Cliente', project: 'Projeto', activity: 'Análise', details: 'Detalhe', consultant: 'Maria', cardReference: '', startAt: `${day}T09:00:00`, endAt: `${day}T10:00:00`, roundedEndAt: `${day}T10:01:00`, focusSeconds: 3660, plannedSeconds: 0, hourlyRate: null, status: 'Encerrada', category: 'Normal' });
const api = { request: vi.fn(), copyText: vi.fn(), saveText: vi.fn(), saveCsv: vi.fn() };
beforeEach(() => {
  api.request.mockReset().mockResolvedValue([row()]);
  api.copyText.mockReset().mockResolvedValue(undefined);
  api.saveText.mockReset().mockResolvedValue('atividades.txt');
  api.saveCsv.mockReset().mockResolvedValue('atividades.csv');
  Object.defineProperty(window, 'foco', { configurable: true, writable: true, value: api });
});
afterEach(cleanup);
const mount = () => render(<HoursPreference.Provider value="real"><ActivityListDialog onClose={vi.fn()}/></HoursPreference.Provider>);
const preview = () => (screen.getByLabelText('Prévia da lista') as HTMLTextAreaElement).value;
const copy = () => screen.getByRole('button', { name: 'Copiar lista' });
const changePeriod = (from: string, to: string) => {
  fireEvent.change(screen.getByLabelText('Data inicial da lista'), { target: { value: from } });
  fireEvent.change(screen.getByLabelText('Data final da lista'), { target: { value: to } });
};

it('abre no dia atual e copia ou exporta exatamente a prévia', async () => {
  mount();
  expect(copy()).toBeDisabled();
  expect(screen.getByLabelText('Data inicial da lista')).toHaveValue(today());
  expect(screen.getByLabelText('Data final da lista')).toHaveValue(today());
  await waitFor(() => expect(copy()).toBeEnabled());
  expect(screen.getByLabelText('Duração da lista')).toHaveValue('real');
  expect(preview()).toContain('09:00 - 01:00:00 - 10:00 - Cliente - Projeto - Detalhe - Maria');
  // Textarea normaliza CRLF para LF; a saída usa CRLF para arquivos locais.
  const text = preview().replaceAll('\n', '\r\n');
  fireEvent.click(copy());
  await screen.findByText('Lista copiada.');
  expect(api.copyText).toHaveBeenCalledWith(text);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar TXT' }));
  await screen.findByText('Lista exportada.');
  expect(api.saveText).toHaveBeenCalledWith(`atividades-${today()}.txt`, text);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV simples' }));
  await waitFor(() => expect(api.saveCsv).toHaveBeenCalledWith(`atividades-${today()}.csv`, expect.stringContaining('"09:00";"01:00:00";"10:00"')));
});

it('troca a base de duração sem alterar o horário real de fim', async () => {
  mount(); await waitFor(() => expect(copy()).toBeEnabled());
  fireEvent.click(copy()); await screen.findByText('Lista copiada.');
  fireEvent.change(screen.getByLabelText('Duração da lista'), { target: { value: 'rounded' } });
  expect(preview()).toContain('09:00 - 01:01:00 - 10:00');
  expect(screen.queryByText('Lista copiada.')).not.toBeInTheDocument();
});

it('invalida a lista ao mudar as datas e exporta somente o novo período', async () => {
  api.request.mockResolvedValue([row('2026-12-31'), row('2027-01-01'), row('2027-01-02')]);
  mount(); await screen.findByText('Nenhuma atividade encontrada no período.');
  changePeriod('2026-12-31', '2027-01-01');
  expect(copy()).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
  await waitFor(() => expect(copy()).toBeEnabled());
  expect(preview()).toContain('31/12/2026'); expect(preview()).toContain('01/01/2027'); expect(preview()).not.toContain('02/01/2027');
  fireEvent.click(screen.getByRole('button', { name: 'Exportar TXT' }));
  await waitFor(() => expect(api.saveText).toHaveBeenCalledWith('atividades-2026-12-31-a-2027-01-01.txt', expect.any(String)));
  await waitFor(() => expect(copy()).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
  expect(screen.getByLabelText('Data inicial da lista')).toHaveValue(today());
  expect(screen.queryByLabelText('Prévia da lista')).not.toBeInTheDocument();
  expect(copy()).toBeDisabled();
});

it('bloqueia período vazio ou invertido e não envia nova consulta', async () => {
  mount(); await waitFor(() => expect(copy()).toBeEnabled());
  changePeriod('2026-11-18', '2026-11-17');
  expect(screen.getByRole('alert')).toHaveTextContent('anterior ou igual');
  expect(screen.getByRole('button', { name: 'Atualizar lista' })).toBeDisabled();
  expect(copy()).toBeDisabled();
  changePeriod('', '2026-11-17');
  expect(screen.getByRole('button', { name: 'Atualizar lista' })).toBeDisabled();
  expect(api.request).toHaveBeenCalledTimes(1);
});

it('ignora uma resposta antiga que termina depois da consulta do novo período', async () => {
  let resolveOld!: (rows: Session[]) => void;
  api.request.mockImplementationOnce(() => new Promise<Session[]>(resolve => { resolveOld = resolve; }));
  mount();
  changePeriod('2027-01-01', '2027-01-01');
  api.request.mockResolvedValueOnce([row('2027-01-01')]);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
  await waitFor(() => expect(copy()).toBeEnabled());
  await act(async () => resolveOld([row()]));
  expect(preview()).toContain('01/01/2027');
  expect(copy()).toBeEnabled();
});

it('mostra falha de consulta e permite tentar novamente sem exportar dados antigos', async () => {
  mount(); await waitFor(() => expect(copy()).toBeEnabled());
  api.request.mockRejectedValueOnce(new Error('Sem conexão local.'));
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão local.');
  expect(copy()).toBeDisabled(); expect(screen.queryByLabelText('Prévia da lista')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
  await waitFor(() => expect(copy()).toBeEnabled());
});

it('distingue cancelamento de exportação e falha de cópia', async () => {
  mount(); await waitFor(() => expect(copy()).toBeEnabled());
  api.copyText.mockRejectedValueOnce(new Error('Área de transferência indisponível.'));
  fireEvent.click(copy()); expect(await screen.findByRole('alert')).toHaveTextContent('Área de transferência indisponível.');
  expect(screen.queryByText('Lista copiada.')).not.toBeInTheDocument();
  api.saveText.mockResolvedValueOnce(null);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar TXT' }));
  await screen.findByText('Exportação cancelada.');
  expect(screen.queryByText('Lista exportada.')).not.toBeInTheDocument();
  api.saveCsv.mockRejectedValueOnce(new Error('Disco sem espaço.'));
  fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV simples' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Disco sem espaço.');
  expect(copy()).toBeEnabled();
});

it('informa falta de precisão em registros antigos', async () => {
  api.request.mockResolvedValueOnce([{ ...row(), roundedEndAt: null }]);
  mount(); await screen.findByText('Registros antigos sem precisão disponível mantêm a duração salva.');
  expect(preview()).toContain('01:01:00');
});
