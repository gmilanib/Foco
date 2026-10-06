import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { ReportPage } from './pages/ReportPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionDialog } from './components/SessionDialog';
import { isoDay } from './format';
import { localDateTimeInput } from './sessionEditing';
import type { Catalogs,Session } from './types';

const today=isoDay(new Date());
const time=(clock:string)=>`${today}T${clock}:00`;
const row=(id:string,start:string,end:string):Session=>({id,activity:id,client:'ACME',project:'P1',consultant:'',details:'',cardReference:'',taskId:null,startAt:time(start),endAt:time(end),focusSeconds:3600,plannedSeconds:0,hourlyRate:null,status:'Concluída',category:'Normal'});
const a=row('A','09:00','10:00'),b=row('B','09:30','10:30'),c=row('C','11:30','12:30');
const catalogs:Catalogs={items:{clients:['ACME'],projects:['P1'],activities:['A','B','C']},possibleDuplicates:[]};
const api=vi.mocked(window.foco.request);
const gaps={days:[],undefinedPeriods:[{day:today,startAt:time('10:30'),endAt:time('11:30'),seconds:3600}]};
const reportProps={items:[a,c],colors:[],showValues:false,onRefresh:vi.fn(),onEdit:vi.fn(),onDelete:vi.fn(),onBatch:vi.fn(),onExport:vi.fn()};
const data={sessions:2,seconds:7200,value:0,unpriced:2,groups:[{name:'ACME',parent:null,seconds:7200,value:0,sessions:2,unpriced:2}],projects:[]};
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();api.mockResolvedValue(gaps);});
afterEach(cleanup);

describe('revisão interativa de horários',()=>{
 it('encontra conflito com atividade fora do filtro e abre a edição',()=>{
  const edit=vi.fn();
  render(<ReportPage {...reportProps} items={[a,c]} history={[a,b,c]} onEdit={edit}/>);
  fireEvent.click(screen.getByLabelText('Somente horários conflitantes'));
  expect(screen.getByLabelText('Selecionar A')).toBeInTheDocument();
  expect(screen.queryByLabelText('Selecionar C')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/Revisar B/}));
  expect(edit).toHaveBeenCalledWith(b);
 });
 it('exige confirmação para manter o conflito e preserva o foco original',async()=>{
  const save=vi.fn().mockResolvedValue(undefined);
  render(<SessionDialog session={a} history={[a,b]} catalogs={catalogs} showValues={false} onClose={vi.fn()} onSave={save}/>);
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confirme a manutenção');
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Confirmo manter a sobreposição destes horários'));
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({focusSeconds:3600,startAt:a.startAt,endAt:a.endAt})));
 });
 it('invalida a confirmação quando o horário muda e remove o aviso ao corrigir',()=>{
  render(<SessionDialog session={a} history={[a,b]} catalogs={catalogs} showValues={false} onClose={vi.fn()} onSave={vi.fn()}/>);
  fireEvent.click(screen.getByLabelText('Confirmo manter a sobreposição destes horários'));
  fireEvent.change(screen.getByLabelText('Início'),{target:{value:localDateTimeInput(time('08:30'))}});
  expect(screen.getByLabelText('Confirmo manter a sobreposição destes horários')).not.toBeChecked();
  fireEvent.change(screen.getByLabelText('Término'),{target:{value:localDateTimeInput(time('09:30'))}});
  expect(screen.queryByLabelText('Confirmo manter a sobreposição destes horários')).toBeNull();
 });
});

describe('visibilidade independente de A definir',()=>{
 it('inclui a lacuna no total e CSV, protege de alterações e lembra a escolha',async()=>{
  const exported=vi.fn();
  const view=render(<ReportPage {...reportProps} onExport={exported}/>);
  fireEvent.click(screen.getByLabelText('Incluir tempo A definir'));
  await screen.findByLabelText('Selecionar A definir');
  expect(screen.getByText(/3h 00min/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));
  expect(exported.mock.calls[0][0]).toHaveLength(3);
  fireEvent.click(screen.getByLabelText('Selecionar A definir'));
  expect(screen.getByRole('button',{name:'Editar selecionada'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Excluir selecionada'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Aplicar em lote'})).toBeDisabled();
  view.unmount();render(<ReportPage {...reportProps}/>);
  expect(screen.getByLabelText('Incluir tempo A definir')).toBeChecked();
  await screen.findByLabelText('Selecionar A definir');
  fireEvent.click(screen.getByLabelText('Incluir tempo A definir'));
  expect(screen.queryByLabelText('Selecionar A definir')).toBeNull();
  expect(screen.getByText(/2h 00min/)).toBeInTheDocument();
 });
 it('inclui horas nos gráficos e PDF sem afetar valores ou preferência dos relatórios',async()=>{
  localStorage.setItem('foco.reports.includeUndefined','true');
  const pdf=vi.fn();render(<DashboardPage data={data} colors={[]} showValues onRefresh={vi.fn()} onExportPdf={pdf}/>);
  expect(screen.getByLabelText('Incluir tempo A definir')).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('Incluir tempo A definir'));
  await screen.findAllByText('A definir (jornada)');
  expect(screen.getAllByText('3h 00min').length).toBeGreaterThan(0);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar PDF'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Exportar PDF'}));expect(pdf).toHaveBeenCalledWith(false);
  fireEvent.click(screen.getByLabelText('Incluir tempo A definir'));
  expect(screen.queryByText('A definir (jornada)')).toBeNull();
  expect(localStorage.getItem('foco.reports.includeUndefined')).toBe('true');
 });
 it('bloqueia exportação enquanto carrega e comunica falha sem exportar dados incompletos',async()=>{
  let reject!:(e:Error)=>void;api.mockReturnValue(new Promise((_resolve,no)=>{reject=no;}));
  render(<ReportPage {...reportProps}/>);
  fireEvent.click(screen.getByLabelText('Incluir tempo A definir'));
  expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeDisabled();
  reject(new Error('Falha ao consultar jornada'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao consultar jornada');
  expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeDisabled();
 });
});
