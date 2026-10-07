import { act,cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { SavedViews } from './components/SavedViews';
import { readSavedViews,viewFields,viewText,viewDate,viewDates } from './savedViews';
import { QuickCaptureDialog } from './components/QuickCaptureDialog';
import { WeekPlanningPanel } from './components/WeekPlanningPanel';
import { compareSessions,HoursComparison } from './components/HoursComparison';
import { WorkflowSettings } from './components/WorkflowSettings';
import { ReminderCenter } from './components/ReminderCenter';
import { dashboardWithUndefined } from './undefinedTime';
import { App } from './App';
import type { Session,Task,WorkflowStatus } from './types';
const api=window.foco.request as ReturnType<typeof vi.fn>;
const filters={client:'ACME',from:'2026-10-01',to:'2026-10-02',sort:'client'};
const valid=viewFields<typeof filters>({client:viewText,from:viewDate,to:viewDate,sort:viewText});
const task:Task={id:'a',client:'ACME',project:'Portal',activity:'Revisar',details:'Passo',consultant:'',cardReference:'',hourlyRate:null,dueDate:'2026-12-01',completed:false,state:'Pendente',entries:0,focusSeconds:0};
const plan={taskId:'a',plannedDate:'2026-10-06',priority:1,nextAction:'Conferir',waitingFor:'',reviewDate:null};
beforeEach(()=>{vi.clearAllMocks();api.mockImplementation((path:string)=>Promise.resolve(path==='/api/settings'?{}:[]));});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('salva, reabre e aplica visão com semana dinâmica; renomeia, atualiza e exclui sem alterar registros',()=>{
 const onApply=vi.fn();const mount=()=>render(<SavedViews scope="test" criteria={filters} validate={valid} onApply={onApply}/>);
 const first=mount();fireEvent.change(screen.getByLabelText('Nome da visão'),{target:{value:'Cliente'}});fireEvent.change(screen.getByLabelText('Período ao aplicar visão'),{target:{value:'week'}});fireEvent.click(screen.getByRole('button',{name:'Salvar nova visão'}));
 first.unmount();mount();fireEvent.change(screen.getByLabelText('Visão salva'),{target:{value:readSavedViews('test',valid)[0].id}});fireEvent.click(screen.getByRole('button',{name:'Aplicar visão'}));
 expect(onApply).toHaveBeenCalledWith(viewDates({...filters,from:'',to:''},'week','from','to'));
 fireEvent.change(screen.getByLabelText('Nome da visão'),{target:{value:'Cliente atualizado'}});fireEvent.click(screen.getByRole('button',{name:'Renomear visão'}));expect(readSavedViews('test',valid)[0].name).toBe('Cliente atualizado');
 fireEvent.change(screen.getByLabelText('Período ao aplicar visão'),{target:{value:'fixed'}});fireEvent.click(screen.getByRole('button',{name:'Atualizar filtros da visão'}));expect(readSavedViews('test',valid)[0].criteria.from).toBe('2026-10-01');
 fireEvent.click(screen.getByRole('button',{name:'Excluir visão'}));expect(readSavedViews('test',valid)).toHaveLength(1);fireEvent.click(screen.getByRole('button',{name:'Confirmar exclusão da visão'}));expect(readSavedViews('test',valid)).toEqual([]);expect(api).not.toHaveBeenCalled();
});
it('descarta visões inválidas e informa falha de armazenamento preservando o formulário',()=>{
 localStorage.setItem('foco.saved-views.v1.test',JSON.stringify([{id:'x',name:'Quebrada',period:'today',criteria:{...filters,from:'2026-02-30'}}]));expect(readSavedViews('test',valid)).toEqual([]);
 render(<SavedViews scope="test" criteria={filters} validate={valid} onApply={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Nome da visão'),{target:{value:'Cliente'}});
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});fireEvent.click(screen.getByRole('button',{name:'Salvar nova visão'}));expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar');expect(screen.getByLabelText('Nome da visão')).toHaveValue('Cliente');expect(screen.queryByText('Visão salva.')).not.toBeInTheDocument();
});
it('recalcula hoje e semana em datas locais, mantendo fixas somente por escolha explícita',()=>{
 expect(viewDates(filters,'today','from','to','2027-01-01')).toEqual({...filters,from:'2027-01-01',to:'2027-01-01'});
 expect(viewDates(filters,'week','from','to','2027-01-01')).toEqual({...filters,from:'2026-12-28',to:'2027-01-03'});expect(viewDates(filters,'fixed','from','to')).toEqual(filters);
});
it('captura uma vez e preserva texto após falha da API',async()=>{
 api.mockRejectedValueOnce(new Error('Não gravou'));const close=vi.fn();render(<QuickCaptureDialog onClose={close} onSaved={vi.fn().mockResolvedValue(undefined)}/>);
 expect(screen.getByLabelText('Demanda para lembrar')).toHaveFocus();
 fireEvent.change(screen.getByLabelText('Demanda para lembrar'),{target:{value:' Conferir hoje '}});fireEvent.click(screen.getByRole('button',{name:'Salvar captura'}));expect(await screen.findByRole('alert')).toHaveTextContent('Não gravou');expect(close).not.toHaveBeenCalled();
 api.mockResolvedValue({});fireEvent.click(screen.getByRole('button',{name:'Salvar captura'}));await waitFor(()=>expect(close).toHaveBeenCalledTimes(1));expect(api).toHaveBeenLastCalledWith('/api/planning/inbox','POST',{title:'Conferir hoje'});
});
it('move planejamento pelo teclado sem enviar prazo, estado ou próxima ação',async()=>{
 const moved=vi.fn().mockResolvedValue(undefined);render(<WeekPlanningPanel day="2026-10-06" onDay={vi.fn()} tasks={[task]} plans={[plan]} onMoved={moved}/>);
 fireEvent.click(screen.getByRole('button',{name:/Mover planejamento de Revisar/}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('Nova data de planejamento'),{target:{value:'2026-10-08'}});fireEvent.click(within(dialog).getByLabelText(/Preservar prioridade/));fireEvent.click(screen.getByRole('button',{name:'Confirmar nova data'}));
 await waitFor(()=>expect(moved).toHaveBeenCalled());expect(api).toHaveBeenCalledWith('/api/planning/plans/a/date','PUT',{plannedDate:'2026-10-08',keepPriority:true});expect(await screen.findByRole('status')).toHaveTextContent('Prazo e próxima ação preservados');
});
it('arraste abre confirmação e falha de limite conserva tarefa e destino',async()=>{
 render(<WeekPlanningPanel day="2026-10-06" onDay={vi.fn()} tasks={[task]} plans={[plan]} onMoved={vi.fn()}/>);
 fireEvent.drop(screen.getByRole('region',{name:'Planejamento de 2026-10-08'}),{dataTransfer:{getData:()=>task.id}});
 expect(screen.getByLabelText('Nova data de planejamento')).toHaveValue('2026-10-08');api.mockRejectedValue(new Error('Escolha até três prioridades'));fireEvent.click(screen.getByRole('button',{name:'Confirmar nova data'}));await waitFor(()=>expect(screen.getAllByRole('alert')[0]).toHaveTextContent('três prioridades'));expect(screen.getByRole('dialog')).toBeInTheDocument();
});
it('compara somente foco, identifica legados e mantém lacunas iguais nas duas bases',()=>{
 const session:Session={id:'s',taskId:null,client:'',project:'',activity:'Teste',details:'',consultant:'',cardReference:'',startAt:'2026-10-06T09:00:00Z',endAt:'2026-10-06T09:15:00Z',roundedEndAt:'2026-10-06T09:18:00Z',plannedSeconds:0,focusSeconds:600,hourlyRate:null,status:'Encerrada',category:'Normal'};
 const comparison=compareSessions([session,{...session,id:'legacy',roundedEndAt:null,focusSeconds:300},{...session,id:'active',status:'Pausada',endAt:null,roundedEndAt:null,focusSeconds:60},{...session,id:'gap',virtual:true,roundedEndAt:null,focusSeconds:120}]);expect(comparison).toEqual({realSeconds:900,roundedSeconds:1080,differenceSeconds:180,unknownPrecision:1,ongoingSessions:1});
 render(<HoursComparison value={comparison}/>);expect(screen.getByText(/1 registro\(s\) histórico/)).toBeInTheDocument();
 const result=dashboardWithUndefined({sessions:1,seconds:600,value:0,unpriced:0,groups:[],projects:[],comparison:compareSessions([session])},[{...session,virtual:true,focusSeconds:120}]);expect(result?.comparison?.realSeconds).toBe(540);expect(result?.comparison?.roundedSeconds).toBe(720);expect(result?.comparison?.differenceSeconds).toBe(180);
});
it('salva preferências e exibe conflito do atalho; painel permite adiar lembrete',async()=>{
 const status:WorkflowStatus={shortcut:{registered:false,accelerator:'',error:'Atalho indisponível'},notificationsSupported:true,pending:[{kind:'planning',day:'2026-10-06'}],silencedToday:false};
 window.foco.workflowStatus=vi.fn().mockResolvedValue(status);window.foco.onWorkflowStatus=vi.fn().mockReturnValue(()=>{});window.foco.workflowAction=vi.fn().mockResolvedValue({...status,pending:[]});
 const settings=render(<WorkflowSettings onSaved={vi.fn().mockResolvedValue(undefined)}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Salvar captura e lembretes'})).toBeEnabled());fireEvent.click(screen.getByLabelText('Ativar atalho global de captura'));fireEvent.click(screen.getByRole('button',{name:'Salvar captura e lembretes'}));expect(await screen.findByText('Preferências de captura e lembretes salvas.')).toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('Atalho indisponível');expect(api).toHaveBeenCalledWith('/api/settings','PUT',expect.objectContaining({'capture.enabled':'true'}));settings.unmount();
 render(<ReminderCenter/>);fireEvent.click(await screen.findByRole('button',{name:'Adiar 15 minutos'}));await waitFor(()=>expect(window.foco.workflowAction).toHaveBeenCalledWith('planning','snooze'));
});
it('captura global preserva formulário aberto e atualiza a caixa de entrada depois de salvar',async()=>{
 window.foco.workflowStatus=vi.fn().mockResolvedValue(null);window.foco.takeNavigation=vi.fn().mockResolvedValue(null);
 let navigate:(value:import('./types').TodayNavigation)=>void=()=>{};
 window.foco.onNavigateToday=vi.fn().mockImplementation(callback=>{navigate=callback;return()=>{};});
 let inbox:unknown[]=[];
 api.mockImplementation((path:string,method:string,body:unknown)=>{
  if(path==='/api/planning/inbox'){if(method==='POST'){inbox=[{id:'capture',title:(body as {title:string}).title,createdAt:'2026-10-06'}];return Promise.resolve(inbox[0]);}return Promise.resolve(inbox);}
  if(path==='/api/catalogs')return Promise.resolve({items:{clients:[],projects:[],activities:['Revisar']},possibleDuplicates:[]});
  if(path==='/api/settings')return Promise.resolve({});if(path.startsWith('/api/work-hours?'))return Promise.resolve({days:[],undefinedPeriods:[]});return Promise.resolve([]);
 });
 render(<App/>);fireEvent.keyDown(window,{key:'t',altKey:true});fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
 const original=screen.getByRole('dialog',{name:'Nova tarefa'});fireEvent.change(within(original).getByLabelText('Detalhamento'),{target:{value:'Texto que deve permanecer'}});
 act(()=>navigate({tab:'inbox',day:'2026-10-06'}));expect(screen.getByRole('dialog',{name:'Capturar uma demanda'})).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Demanda para lembrar'),{target:{value:'Nova demanda'}});fireEvent.click(screen.getByRole('button',{name:'Salvar captura'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Capturar uma demanda'})).not.toBeInTheDocument());
 expect(within(original).getByLabelText('Detalhamento')).toHaveValue('Texto que deve permanecer');fireEvent.click(within(original).getByRole('button',{name:'Cancelar'}));fireEvent.keyDown(window,{key:'h',altKey:true});fireEvent.click(await screen.findByRole('button',{name:/Caixa de entrada/}));expect(await screen.findByText('Nova demanda')).toBeInTheDocument();
});
it('captura já gravada não pode ser repetida quando a atualização da tela falha',async()=>{
 api.mockResolvedValue({});render(<QuickCaptureDialog onClose={vi.fn()} onSaved={vi.fn().mockRejectedValue(new Error('Atualização falhou'))}/>);fireEvent.change(screen.getByLabelText('Demanda para lembrar'),{target:{value:'Guardar'}});fireEvent.click(screen.getByRole('button',{name:'Salvar captura'}));expect(await screen.findByRole('alert')).toHaveTextContent('Captura salva');expect(screen.getByRole('button',{name:'Salvar captura'})).toBeDisabled();expect(api).toHaveBeenCalledTimes(1);
});
