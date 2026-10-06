import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { localDate } from './format';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { RetroactiveDialog } from './components/RetroactiveDialog';
import { localDateTimeInput } from './sessionEditing';
import type { Draft } from './pages/FocusPage';
import type { Catalogs,Session,Task } from './types';

const initial:Draft={client:'',project:'',activity:'',details:'',consultant:'',cardReference:'',hourlyRate:'',category:'Normal',mode:'Cronômetro',minutes:25};
const task:Task={id:'task-1',client:'ACME',project:'P1',activity:'Implantação',details:'Offline',consultant:'Ana',cardReference:'CARD-1',hourlyRate:120,dueDate:null,completed:true,state:'Concluída',entries:1,focusSeconds:600};
const existing:Session={id:'old-1',taskId:null,client:'ACME',project:'P1',activity:'Revisão',details:'',consultant:'Ana',cardReference:'',startAt:'2026-09-22T09:00:00-03:00',endAt:'2026-09-22T10:00:00-03:00',plannedSeconds:0,focusSeconds:3600,hourlyRate:null,status:'Concluída',category:'Normal'};
const catalogs:Catalogs={items:{clients:['ACME'],projects:['P1'],activities:['Revisão','Implantação']},possibleDuplicates:[]};
const local=(hour:string)=>localDateTimeInput(`2026-09-22T${hour}:00-03:00`);

describe('formulário de lançamento retroativo',()=>{
 afterEach(cleanup);
 it('identifica somente os conflitos e atualiza a lista ao alterar o período',()=>{
  const other={...existing,id:'other',activity:'Outro lançamento',startAt:'2026-09-22T11:00:00-03:00',endAt:'2026-09-22T12:00:00-03:00'};
  render(<RetroactiveDialog initial={initial} history={[existing,other]} tasks={[]} catalogs={catalogs} defaultRate="" showValues={false} onClose={()=>{}} onSave={async()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Início *'),{target:{value:local('09:30')}});
  fireEvent.change(screen.getByLabelText('Término *'),{target:{value:local('10:30')}});
  const conflicts=within(screen.getByRole('table',{name:'Lançamentos conflitantes'}));
  expect(conflicts.getByText('Revisão')).toBeInTheDocument();
  expect(conflicts.getByText('ACME')).toBeInTheDocument();
  expect(conflicts.getByText('P1')).toBeInTheDocument();
  expect(conflicts.getByText(localDate(existing.startAt))).toBeInTheDocument();
  expect(conflicts.getByText(localDate(existing.endAt))).toBeInTheDocument();
  expect(conflicts.queryByText('Outro lançamento')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Início *'),{target:{value:local('10:00')}});
  expect(screen.queryByRole('table',{name:'Lançamentos conflitantes'})).not.toBeInTheDocument();
 });
 it('sugere pelo texto digitado sem completar os demais campos',()=>{
  render(<RetroactiveDialog initial={initial} history={[existing]} tasks={[task]} catalogs={catalogs} defaultRate="" showValues onClose={()=>{}} onSave={async()=>{}}/>);
  expect(screen.getByLabelText('Projeto')).toContainHTML('<option value="P1">P1</option>');
  fireEvent.change(screen.getByLabelText('Projeto'),{target:{value:'P1'}});
  expect(screen.getByLabelText('Cliente')).toHaveValue('');
  expect(screen.getByLabelText('Atividade *')).toHaveValue('');
 });
 it('vincula tarefa concluída, avisa sobreposição e salva duração efetiva menor',async()=>{
  const onSave=vi.fn().mockResolvedValue(undefined);
  render(<RetroactiveDialog initial={initial} history={[existing]} tasks={[task]} catalogs={catalogs} defaultRate="" showValues onClose={()=>{}} onSave={onSave}/>);
  fireEvent.change(screen.getByLabelText('Tarefa (opcional)'),{target:{value:task.id}});
  expect((screen.getByLabelText('Atividade *') as HTMLInputElement).value).toBe('Implantação');
  fireEvent.change(screen.getByLabelText('Início *'),{target:{value:local('09:30')}});
  fireEvent.change(screen.getByLabelText('Término *'),{target:{value:local('10:30')}});
  expect((screen.getByLabelText('Horas de foco') as HTMLInputElement).value).toBe('1');
  expect(screen.getByText(/O período coincide com 1 apontamento/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Horas de foco'),{target:{value:'0'}});
  fireEvent.change(screen.getByLabelText('Minutos de foco'),{target:{value:'30'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confirme a sobreposição');
  fireEvent.click(screen.getByRole('checkbox',{name:/Confirmo o lançamento/}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledOnce());
  expect(onSave.mock.calls[0][0]).toMatchObject({taskId:'task-1',focusMinutes:30,status:'Concluída',hourlyRate:120});
 });
 it('rejeita duração efetiva maior que o intervalo',async()=>{
  const onSave=vi.fn().mockResolvedValue(undefined);
  render(<RetroactiveDialog initial={{...initial,activity:'Revisão'}} history={[]} tasks={[]} catalogs={catalogs} defaultRate="" showValues={false} onClose={()=>{}} onSave={onSave}/>);
  fireEvent.change(screen.getByLabelText('Início *'),{target:{value:local('09:00')}});
  fireEvent.change(screen.getByLabelText('Término *'),{target:{value:local('10:00')}});
  fireEvent.change(screen.getByLabelText('Horas de foco'),{target:{value:'2'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('não pode exceder');
  expect(onSave).not.toHaveBeenCalled();
 });
 it('abre preenchido quando a origem é uma lacuna da jornada',()=>{
  render(<RetroactiveDialog initial={initial} history={[]} tasks={[]} catalogs={catalogs} defaultRate="" showValues={false} preset={{startAt:'2026-09-22T10:00:00-03:00',endAt:'2026-09-22T11:00:00-03:00',focusMinutes:45}} onClose={()=>{}} onSave={async()=>{}}/>);
  expect(screen.getByLabelText('Início *')).toHaveValue(local('10:00'));
  expect(screen.getByLabelText('Término *')).toHaveValue(local('11:00'));
  expect(screen.getByLabelText('Minutos de foco')).toHaveValue(45);
 });
});
