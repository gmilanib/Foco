import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { CapacityPanel,capacitySummary } from './components/CapacityPanel';
import { WeeklyReviewPanel } from './components/WeeklyReviewPanel';
import { LocalDiagnostics } from './components/LocalDiagnostics';
import { TodayPage } from './pages/TodayPage';
import { PlanDialog } from './components/PlanDialog';
import type { Task } from './types';
const api=window.foco.request as ReturnType<typeof vi.fn>;
const task:Task={id:'a',activity:'Revisar',client:'Cliente',project:'Projeto',details:'Cenário',consultant:'',cardReference:'',hourlyRate:null,dueDate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0};
const day='2026-10-02',plan={taskId:'a',plannedDate:day,priority:0,nextAction:'',waitingFor:'',reviewDate:null};
beforeEach(()=>{vi.clearAllMocks();api.mockImplementation((path:string)=>Promise.resolve(path==='/api/planning/estimates'?[{taskId:'a',minutes:120}]:{'planning.capacityMinutes':'60'}));});
afterEach(cleanup);
it('mantém Tab e Shift+Tab dentro do planejamento ao alcançar as extremidades',()=>{
 render(<PlanDialog task={task} plan={plan} onClose={vi.fn()} onSaved={vi.fn()}/>);
 const first=screen.getByRole('button',{name:'Fechar diálogo'}),last=screen.getByRole('button',{name:'Salvar planejamento'});
 last.focus();fireEvent.keyDown(last,{key:'Tab'});expect(first).toHaveFocus();
 fireEvent.keyDown(first,{key:'Tab',shiftKey:true});expect(last).toHaveFocus();
});
it('expõe revisão semanal na navegação de Hoje',async()=>{
 api.mockImplementation((path:string)=>Promise.resolve(path.startsWith('/api/planning/weekly-review')?{weekStart:'2026-09-28',weekEnd:'2026-10-04',oldCaptures:[],withoutNextAction:[],unexecuted:[],overdueDependencies:[]}:path==='/api/settings'?{}:[]));
 render(<TodayPage tasks={[task]} sessions={[]} catalogs={{items:{clients:[],projects:[],activities:[]},possibleDuplicates:[]}} onChanged={vi.fn()} onStart={vi.fn()} onJourney={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Revisão semanal'}));
 expect(await screen.findByText('Capturas antigas (0)')).toBeInTheDocument();
});
it('soma estimativas disponíveis e identifica total incompleto sem incluir concluídas ou aguardando',()=>{
 const tasks=[task,{...task,id:'b'},{...task,id:'c',completed:true},{...task,id:'d',state:'Aguardando'}];
 expect(capacitySummary(tasks,tasks.map(t=>({...plan,taskId:t.id})),tasks.filter(t=>t.id!=='b').map(t=>({taskId:t.id,minutes:120})),day)).toEqual({minutes:120,missing:1});
});
it('avisa sobrecarga, salva capacidade zero e remove estimativa explicitamente',async()=>{
 render(<CapacityPanel day={day} tasks={[task]} plans={[plan]}/>);
 expect(await screen.findByText(/Sobrecarga de 60 min/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Capacidade diária (minutos)'),{target:{value:'0'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar capacidade'}));
 expect(await screen.findByText('Capacidade salva.')).toBeInTheDocument();
 expect(api).toHaveBeenCalledWith('/api/settings','PUT',{'planning.capacityMinutes':'0'});
 fireEvent.change(screen.getByLabelText('Tarefa para estimar'),{target:{value:'a'}});
 expect(screen.getByLabelText('Estimativa da tarefa (minutos)')).toHaveValue(120);
 fireEvent.change(screen.getByLabelText('Estimativa da tarefa (minutos)'),{target:{value:''}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar estimativa'}));
 expect(await screen.findByText('Estimativa salva.')).toBeInTheDocument();
 expect(api).toHaveBeenCalledWith('/api/planning/estimates/a','PUT',{minutes:null});
 expect(screen.getByText(/1 tarefa\(s\) sem estimativa/)).toBeInTheDocument();
});
it('mantém estimativa e formulário após falha sem exibir falso sucesso',async()=>{
 render(<CapacityPanel day={day} tasks={[task]} plans={[plan]}/>);
 await screen.findByText(/120 min estimados/);
 fireEvent.change(screen.getByLabelText('Tarefa para estimar'),{target:{value:'a'}});
 fireEvent.change(screen.getByLabelText('Estimativa da tarefa (minutos)'),{target:{value:'90'}});
 api.mockRejectedValue(new Error('Falha ao gravar'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar estimativa'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao gravar');
 expect(screen.getByLabelText('Estimativa da tarefa (minutos)')).toHaveValue(90);
 expect(screen.getByText(/120 min estimados/)).toBeInTheDocument();
});
it('abre planejamento e caixa de entrada pela revisão semanal sem gravação automática',async()=>{
 api.mockResolvedValue({weekStart:'2026-09-28',weekEnd:'2026-10-04',oldCaptures:[{id:'i',title:'Demanda antiga',createdAt:''}],withoutNextAction:['a'],unexecuted:[],overdueDependencies:[]});
 const onPlan=vi.fn(),onInbox=vi.fn();render(<WeeklyReviewPanel day={day} tasks={[task]} onPlan={onPlan} onInbox={onInbox}/>);
 await screen.findByText('Demanda antiga');
 fireEvent.click(screen.getByRole('button',{name:'Revisar planejamento'}));expect(onPlan).toHaveBeenCalledWith(task);
 fireEvent.click(screen.getByRole('button',{name:'Organizar na caixa de entrada'}));expect(onInbox).toHaveBeenCalled();
 expect(api).toHaveBeenCalledTimes(1);expect(api).toHaveBeenCalledWith(`/api/planning/weekly-review?day=${day}`,'GET',undefined);
});
it('diagnóstico usa versão do aplicativo e distingue falha recente do último sucesso',async()=>{
 api.mockResolvedValue({'backup.lastAttemptAt':'2026-10-02T12:00:00Z','backup.lastResult':'Falha','backup.lastMessage':'Pasta indisponível','backup.lastSuccessAt':'2026-10-01T12:00:00Z'});
 render(<LocalDiagnostics/>);
 expect(await screen.findByText('New · 1.12.0')).toBeInTheDocument();
 expect(screen.getByText(/Resultado: Falha · Pasta indisponível/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Atualizar diagnóstico'}));
 await waitFor(()=>expect(window.foco.appInfo).toHaveBeenCalledTimes(2));
});
