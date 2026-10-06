import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { TodayPage } from './pages/TodayPage';
import { InboxPanel } from './components/InboxPanel';
import { PlanDialog } from './components/PlanDialog';
import { DailyReviewPanel } from './components/DailyReviewPanel';
import { TaskTemplatesPanel } from './components/TaskTemplatesPanel';
import { isoDay } from './format';
import { plannedTasks,type Plan } from './planning';
import type { Task } from './types';

const api=window.foco.request as ReturnType<typeof vi.fn>;
const day=isoDay(new Date());
const task:Task={id:'t1',activity:'Revisão',details:'Testes Intelbras',client:'Intelbras',project:'Portal',consultant:'',cardReference:'',hourlyRate:null,dueDate:'2026-12-31',state:'Pendente',completed:false,entries:0,focusSeconds:0};
const catalogs={items:{clients:['Intelbras'],projects:['Portal'],activities:['Revisão']},possibleDuplicates:[]};
const plan:Plan={taskId:'t1',plannedDate:day,priority:1,nextAction:'Reproduzir cenário X',waitingFor:'',reviewDate:null};
const onChanged=vi.fn().mockResolvedValue(undefined);
beforeEach(()=>{
 vi.clearAllMocks();api.mockImplementation((path:string)=>{
  if(path==='/api/planning/plans')return Promise.resolve([plan]);
  if(path==='/api/planning/inbox'||path==='/api/planning/templates')return Promise.resolve([]);
  if(path.startsWith('/api/planning/reviews/'))return Promise.resolve({day,notes:'',reviewedAt:null});
  if(path.startsWith('/api/work-hours?'))return Promise.resolve({days:[],undefinedPeriods:[]});
  return Promise.resolve({});
 });
});
afterEach(cleanup);

describe('planejamento pessoal',()=>{
 it('ordena prioridades e mantém concluídas ao fim sem confundir prazo e planejamento',()=>{
  const second={...task,id:'t2',activity:'Outra'},done={...task,id:'t3',completed:true};
  expect(plannedTasks([done,task,second],[plan,{...plan,taskId:'t2',priority:2},{...plan,taskId:'t3',priority:1}],day).map(t=>t.id)).toEqual(['t1','t2','t3']);
  expect(plannedTasks([task],[{...plan,plannedDate:null}],task.dueDate!)).toEqual([]);
 });
 it('inicia pela prioridade e mostra próxima ação e contexto',async()=>{
  const start=vi.fn();render(<TodayPage tasks={[task]} sessions={[]} catalogs={catalogs} onChanged={onChanged} onStart={start} onJourney={vi.fn()}/>);
  expect(await screen.findByText('Reproduzir cenário X')).toBeInTheDocument();
  expect(screen.getByText('Testes Intelbras')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Iniciar'}));expect(start).toHaveBeenCalledWith(task);
 });
 it('informa erro de limite sem remover tarefa da tela',async()=>{
  api.mockImplementation((path:string,method:string)=>{
   if(method==='PUT')return Promise.reject(new Error('Escolha até três prioridades para esta data.'));
   return Promise.resolve(path.endsWith('/plans')?[]:[]);
  });
  render(<TodayPage tasks={[task]} sessions={[]} catalogs={catalogs} onChanged={onChanged} onStart={vi.fn()} onJourney={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Planejar tarefas'}));
  fireEvent.click(await screen.findByRole('button',{name:'Priorizar neste dia'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('até três prioridades');
  expect(screen.getByText('Testes Intelbras')).toBeInTheDocument();
 });
 it('salva captura com uma frase e impede cliques repetidos enquanto aguarda',async()=>{
  let resolve:()=>void=()=>{};api.mockReturnValue(new Promise<void>(r=>{resolve=r;}));
  render(<InboxPanel items={[]} catalogs={catalogs} onChanged={onChanged}/>);
  fireEvent.change(screen.getByLabelText('Captura rápida'),{target:{value:'  Revisar testes  '}});
  const button=screen.getByRole('button',{name:'Capturar'});fireEvent.click(button);fireEvent.click(button);
  expect(api).toHaveBeenCalledTimes(1);expect(api).toHaveBeenCalledWith('/api/planning/inbox','POST',{title:'Revisar testes'});
  expect(button).toBeDisabled();resolve();await waitFor(()=>expect(screen.getByLabelText('Captura rápida')).toHaveValue(''));
 });
 it('preserva texto da captura quando a conversão falha',async()=>{
  api.mockRejectedValue(new Error('Falha ao salvar'));
  render(<InboxPanel items={[{id:'i1',title:'Corrigir cenário X',createdAt:''}]} catalogs={catalogs} onChanged={onChanged}/>);
  fireEvent.click(screen.getByRole('button',{name:'Organizar'}));
  fireEvent.change(screen.getByLabelText('Atividade'),{target:{value:'Revisão'}});
  fireEvent.click(screen.getByRole('button',{name:'Criar tarefa'}));
  await waitFor(()=>expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Falha ao salvar'));
  expect(screen.getByLabelText('Detalhamento')).toHaveValue('Corrigir cenário X');
  expect(onChanged).not.toHaveBeenCalled();
 });
 it('desmarca prioridade ao aguardar e salva dependência sem alterar prazo',async()=>{
  render(<PlanDialog task={task} plan={plan} onClose={vi.fn()} onSaved={onChanged}/>);
  fireEvent.change(screen.getByLabelText('Estado da tarefa'),{target:{value:'Aguardando'}});
  expect(screen.getByRole('checkbox')).not.toBeChecked();expect(screen.getByRole('checkbox')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Aguardando quem ou o quê'),{target:{value:'Ana'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar planejamento'}));
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/planning/plans/t1','PUT',{plannedDate:day,priority:false,nextAction:'Reproduzir cenário X',waitingFor:'Ana',reviewDate:null,state:'Aguardando'}));
 });
 it('gera recorrências somente pelo botão e apresenta quantidade criada',async()=>{
  api.mockResolvedValue([task]);
  render(<TaskTemplatesPanel templates={[]} tasks={[task]} onChanged={onChanged}/>);
  expect(api).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Criar tarefas previstas'}));
  expect(await screen.findByText('1 tarefa(s) criada(s) para hoje.')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/planning/templates/generate','POST',undefined);
 });
 it('salva revisão e preserva rascunho quando os dados de tarefas são atualizados',async()=>{
  const props={day,tasks:[task],plans:[plan],sessions:[],onPlan:vi.fn(),onJourney:vi.fn()};
  const {rerender}=render(<DailyReviewPanel {...props}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Salvar revisão do dia'})).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Notas da revisão'),{target:{value:'Continuar testes amanhã'}});
  rerender(<DailyReviewPanel {...props} sessions={[]}/>);
  expect(screen.getByLabelText('Notas da revisão')).toHaveValue('Continuar testes amanhã');
  api.mockResolvedValue({day,notes:'Continuar testes amanhã',reviewedAt:new Date().toISOString()});
  fireEvent.click(screen.getByRole('button',{name:'Salvar revisão do dia'}));
  expect(await screen.findByText(/Revisão salva em/)).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith(`/api/planning/reviews/${day}`,'PUT',{notes:'Continuar testes amanhã'});
  expect(api.mock.calls.some(([path])=>String(path).endsWith('/complete'))).toBe(false);
 });
});
