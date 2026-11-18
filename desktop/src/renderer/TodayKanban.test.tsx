import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { TodayPage } from './pages/TodayPage';
import type { Task } from './types';
import type { Plan } from './planning';

const api=window.foco.request as ReturnType<typeof vi.fn>,day='2026-10-14';
const task=(id:string,extra:Partial<Task>={}):Task=>({id,activity:id,client:'Cliente',project:'Projeto',details:'',consultant:'',cardReference:'',hourlyRate:null,dueDate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0,...extra});
const plan=(id:string,priority=0,plannedDate=day):Plan=>({taskId:id,plannedDate,priority,nextAction:'',waitingFor:'',reviewDate:null});
const props={initialDay:day,sessions:[],catalogs:{items:{clients:[],projects:[],activities:[]},possibleDuplicates:[]},onChanged:async()=>{},onStart:vi.fn(),onJourney:vi.fn()};
beforeEach(()=>{vi.clearAllMocks();api.mockResolvedValue([]);});
afterEach(cleanup);

it('distribui as tarefas do dia sem duplicar colunas e mantém feitas visíveis',async()=>{
 const tasks=[task('Aberta'),task('Prioridade'),task('Concluída',{completed:true,state:'Concluída'}),task('Prazo hoje',{dueDate:day}),task('Outro dia',{completed:true,state:'Concluída'}),task('Arquivada',{archived:true}),task('Replanejada',{dueDate:day})];
 api.mockResolvedValue([plan('Aberta'),plan('Prioridade',1),plan('Concluída'),plan('Outro dia',0,'2026-10-13'),plan('Arquivada'),plan('Replanejada',0,'2026-10-15')]);
 render(<TodayPage {...props} tasks={tasks}/>);await screen.findByRole('group',{name:'Kanban do dia'});
 const pending=within(screen.getByRole('region',{name:'Para hoje'})),priority=within(screen.getByRole('region',{name:'Priorizadas'})),done=within(screen.getByRole('region',{name:'Feitas'}));
 expect(pending.getByRole('heading',{name:'Para hoje (2)'})).toBeInTheDocument();expect(pending.getByRole('heading',{name:'Aberta'})).toBeInTheDocument();expect(pending.getByRole('heading',{name:'Prazo hoje'})).toBeInTheDocument();
 expect(priority.getByRole('heading',{name:'Prioridade'})).toBeInTheDocument();expect(done.getByRole('heading',{name:'Concluída'})).toBeInTheDocument();
 expect(pending.queryByRole('heading',{name:'Prioridade'})).not.toBeInTheDocument();
 const board=within(screen.getByRole('group',{name:'Kanban do dia'}));
 for(const name of ['Outro dia','Arquivada','Replanejada'])expect(board.queryByRole('heading',{name})).not.toBeInTheDocument();
});

it('acompanha o dia escolhido e preserva a ordem das prioridades',async()=>{
 api.mockResolvedValue([plan('Segunda',2),plan('Primeira',1),plan('Amanhã',0,'2026-10-15')]);
 render(<TodayPage {...props} tasks={[task('Segunda'),task('Primeira'),task('Amanhã')]}/>);
 await screen.findByRole('group',{name:'Kanban do dia'});
 const column=screen.getByRole('region',{name:'Priorizadas'});
 expect(within(column).getAllByRole('heading',{level:3}).map(h=>h.textContent)).toEqual(['Primeira','Segunda']);
 fireEvent.change(screen.getByLabelText('Dia de planejamento'),{target:{value:'2026-10-15'}});
 expect(within(screen.getByRole('region',{name:'Para hoje'})).getByRole('heading',{name:'Amanhã'})).toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'Priorizadas'})).getByRole('heading',{name:'Priorizadas (0/5)'})).toBeInTheDocument();
});

it('prioriza, conclui e reabre movendo o cartão após salvar',async()=>{
 let stored=task('Minha tarefa'),storedPlan=plan(stored.id);
 api.mockImplementation(async(path:string,method:string,body:Record<string,unknown>)=>{
  if(method==='PUT'){storedPlan={...storedPlan,priority:body.priority?1:0};return {};}
  if(method==='POST'){stored={...stored,completed:!!body.completed,state:body.completed?'Concluída':'Pendente'};if(body.completed)storedPlan={...storedPlan,priority:0};return {};}
  if(path==='/api/planning/plans')return [storedPlan];return [];
 });
 function Harness(){const [tasks,setTasks]=useState([stored]);return <TodayPage {...props} tasks={tasks} onChanged={async()=>setTasks([stored])}/>;}
 render(<Harness/>);await screen.findByRole('group',{name:'Kanban do dia'});
 fireEvent.click(within(screen.getByRole('region',{name:'Para hoje'})).getByRole('button',{name:'Priorizar neste dia'}));
 await screen.findByRole('heading',{name:'Priorizadas (1/5)'});
 fireEvent.click(within(screen.getByRole('region',{name:'Priorizadas'})).getByRole('button',{name:'Concluir tarefa'}));
 await screen.findByRole('heading',{name:'Feitas (1)'});
 fireEvent.click(within(screen.getByRole('region',{name:'Feitas'})).getByRole('button',{name:'Reabrir tarefa'}));
 await screen.findByRole('heading',{name:'Para hoje (1)'});expect(screen.getByRole('heading',{name:'Feitas (0)'})).toBeInTheDocument();
 expect(api).toHaveBeenCalledWith(`/api/tasks/${stored.id}/complete`,'POST',{completed:false});
});

it('mantém o cartão quando concluir falha',async()=>{
 api.mockResolvedValue([plan('Aberta')]);render(<TodayPage {...props} tasks={[task('Aberta')]}/>);
 await screen.findByRole('group',{name:'Kanban do dia'});api.mockRejectedValue(new Error('Encerre o apontamento ativo antes de concluir.'));
 fireEvent.click(screen.getByRole('button',{name:'Concluir tarefa'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Encerre o apontamento'));
 expect(screen.getByRole('heading',{name:'Para hoje (1)'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Feitas (0)'})).toBeInTheDocument();
});
