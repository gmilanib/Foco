import { TaskTemplatesPanel } from '../components/TaskTemplatesPanel';
import { InboxPanel } from '../components/InboxPanel';
import { CapacityPanel } from '../components/CapacityPanel';
import { isArchived } from '../organization';
import { ClientMarker,ProjectMarker } from '../components/ClientMarker';
import { ChecklistDialog } from '../components/ChecklistDialog';
import { WeekPlanningPanel } from '../components/WeekPlanningPanel';
import { WeeklyReviewPanel } from '../components/WeeklyReviewPanel';
import { useCallback,useEffect,useRef,useState,type ReactNode } from 'react';
import { request,safeMessage } from '../api';
import { isoDay } from '../format';
import { plannedTasks,planInput,type Plan,type InboxItem,type TaskTemplate } from '../planning';
import type { Catalogs,Session,Task } from '../types';
import { Card,Empty,Field,Status } from '../components/Field';
import { PlanDialog } from '../components/PlanDialog';
import { DailyReviewPanel } from '../components/DailyReviewPanel';
import '../planning.css';

type Props={taskList?:(onPlan:(task:Task)=>void,onTasksChanged:()=>Promise<void>)=>ReactNode;priorityLimit?:number;initialTab?:string;initialDay?:string;captureVersion?:number;tasks:Task[];sessions:Session[];catalogs:Catalogs;onChanged:()=>Promise<void>;onStart:(task:Task)=>void;onJourney:(day:string)=>void};
export function TodayPage({taskList,priorityLimit=5,tasks,sessions,catalogs,onChanged,onStart,onJourney,initialTab='today',initialDay,captureVersion=0}:Props){
 const [day,setDay]=useState(()=>initialDay||isoDay(new Date())),[tab,setTab]=useState(initialTab),[plans,setPlans]=useState<Plan[]>([]),[editing,setEditing]=useState<Task|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[query,setQuery]=useState('');
 const [inbox,setInbox]=useState<InboxItem[]>([]),[templates,setTemplates]=useState<TaskTemplate[]>([]);
 const [checklistTask,setChecklistTask]=useState<Task|null>(null);
 const mounted=useRef(true),lock=useRef(false);
 const load=useCallback(async()=>{
  const [p,i,t]=await Promise.all([request<Plan[]>('/api/planning/plans'),request<InboxItem[]>('/api/planning/inbox'),request<TaskTemplate[]>('/api/planning/templates')]);
  if(mounted.current){setPlans(p);setInbox(i);setTemplates(t);setLoaded(true);}
 },[]);
 useEffect(()=>{mounted.current=true;void load().catch(e=>{if(mounted.current)setError(safeMessage(e));});return()=>{mounted.current=false;};},[load,captureVersion]);
 const refresh=async()=>{await onChanged();await load();};
 const act=async(work:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();await refresh();}catch(e){setError(safeMessage(e));}finally{lock.current=false;setBusy(false);}};
 const byId=new Map(plans.map(p=>[p.taskId,p]));
 const forDay=tasks.filter(t=>!isArchived(t)&&(byId.get(t.id)?.plannedDate||t.dueDate)===day);
 const planned=plannedTasks(forDay,plans,day);
 const dayTasks=[...planned,...forDay.filter(t=>!planned.includes(t)).sort((a,b)=>a.activity.localeCompare(b.activity,'pt-BR'))];
 const done=dayTasks.filter(t=>t.completed||t.state==='Concluída');
 const priorities=dayTasks.filter(t=>!done.includes(t)&&t.state!=='Aguardando'&&(byId.get(t.id)?.priority||0)>0);
 const pending=dayTasks.filter(t=>!done.includes(t)&&!priorities.includes(t));
 const overdue=tasks.filter(t=>!t.completed&&t.state!=='Aguardando'&&!!byId.get(t.id)?.plannedDate&&byId.get(t.id)!.plannedDate!<day);
 const waiting=tasks.filter(t=>!t.completed&&t.state==='Aguardando');
 const taskCard=(t:Task,compact=false)=>{const completed=t.completed||t.state==='Concluída';const plan=byId.get(t.id),rank=priorities.findIndex(p=>p.id===t.id);return <article key={t.id} className={`planning-task ${compact?'kanban-task':''} ${completed?'kanban-task--done':''} ${rank>=0?'planning-task--priority':''}`}>
  <div><div className="actions">{rank>=0&&<span className="planning-rank">{rank+1}</span>}<h3>{t.activity}</h3><Status value={t.state}/></div>
   <p>{t.client||t.project?<><ClientMarker client={t.client}/>{t.client&&t.project?' / ':''}<ProjectMarker client={t.client} project={t.project} colors={[]}/></>:'Sem cliente ou projeto'}</p>{t.details&&<p className="planning-details">{t.details}</p>}
   {plan?.nextAction&&<p><strong>Próxima ação:</strong> {plan.nextAction}</p>}
   {t.state==='Aguardando'&&<p><strong>Aguardando:</strong> {plan?.waitingFor||'Dependência não informada'}{plan?.reviewDate?` · Revisar em ${new Date(`${plan.reviewDate}T12:00:00`).toLocaleDateString('pt-BR')}`:''}{plan?.reviewDate&&plan.reviewDate<=day?' · Revisão pendente':''}</p>}
   {t.dueDate&&<small>Prazo de entrega: {new Date(`${t.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</small>}
  </div><div className="actions">
   <button className="button button--primary" disabled={busy||t.state==='Aguardando'} onClick={()=>completed?void act(()=>request(`/api/tasks/${t.id}/complete`,'POST',{completed:false})):onStart(t)}>{completed?'Reabrir tarefa':'Iniciar'}</button>
   {compact?<details className="kanban-more"><summary>Mais</summary><div className="actions">   <button className="button" disabled={busy} onClick={()=>setEditing(t)}>Planejar / próxima ação</button><button className="button" onClick={()=>setChecklistTask(t)}>Checklist ({t.checklistCompleted||0}/{t.checklistTotal||0})</button></div></details>:<>   <button className="button" disabled={busy} onClick={()=>setEditing(t)}>Planejar / próxima ação</button><button className="button" onClick={()=>setChecklistTask(t)}>Checklist ({t.checklistCompleted||0}/{t.checklistTotal||0})</button></>}
   {!t.completed&&t.state!=='Aguardando'&&<button className="button" disabled={busy} onClick={()=>void act(()=>request(`/api/planning/plans/${t.id}`,'PUT',{...planInput(t,plan),plannedDate:day,priority:!(plan?.plannedDate===day&&plan.priority>0)}))}>{plan?.plannedDate===day&&plan.priority>0?'Retirar prioridade':'Priorizar neste dia'}</button>}
   {!t.completed&&<button className="button" disabled={busy} onClick={()=>void act(()=>request(`/api/tasks/${t.id}/complete`,'POST',{completed:true}))}>Concluir tarefa</button>}
   {rank>=0&&<><button className="button button--quiet" aria-label={`Subir prioridade de ${t.activity}`} disabled={busy||rank===0} onClick={()=>void act(()=>request(`/api/planning/plans/${t.id}/move`,'POST',{direction:-1}))}>↑</button><button className="button button--quiet" aria-label={`Descer prioridade de ${t.activity}`} disabled={busy||rank===priorities.length-1} onClick={()=>void act(()=>request(`/api/planning/plans/${t.id}/move`,'POST',{direction:1}))}>↓</button></>}
  </div></article>;};
 return <div className="page-stack"><div className="page-title"><div><h1>{taskList?'Tarefas e hoje':'Hoje'}</h1><p>Organize suas tarefas, escolha seu foco e feche o dia com clareza.</p></div><Field label="Dia de planejamento"><input type="date" required value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></Field></div>
  <div className="planning-tabs" role="group" aria-label="Organização pessoal">{[...(taskList?[['tasks','Todas as tarefas']]:[]),['today','Meu dia'],['inbox',`Caixa de entrada (${inbox.length})`],['templates','Modelos'],['plan','Planejar tarefas'],['week-plan','Planejamento semanal'],['review','Fechamento do dia'],['weekly','Revisão semanal']].map(([value,label])=><button key={value} className={`button ${tab===value?'button--primary':''}`} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</div>
  {error&&<p role="alert" className="message message--error">{error} <button className="button" onClick={()=>void act(load)}>Tentar novamente</button></p>}
  {!loaded&&!error&&<p role="status">Carregando planejamento…</p>}
  {loaded&&tab==='today'&&<>
   <div className="day-kanban" role="group" aria-label="Kanban do dia">
    <section className="kanban-column" aria-label="Para hoje"><Card title={`Para hoje (${pending.length})`}>{pending.length?pending.map(t=>taskCard(t,true)):<Empty>Nenhuma tarefa pendente para este dia.</Empty>}</Card></section>
    <section className="kanban-column kanban-column--priority" aria-label="Priorizadas"><Card title={`Priorizadas (${priorities.length}/${priorityLimit})`}>{priorities.length?priorities.map(t=>taskCard(t,true)):<Empty>Priorize uma tarefa de hoje para começar.</Empty>}</Card></section>
    <section className="kanban-column kanban-column--done" aria-label="Feitas"><Card title={`Feitas (${done.length})`}>{done.length?done.map(t=>taskCard(t,true)):<Empty>As tarefas concluídas deste dia aparecem aqui.</Empty>}</Card></section>
   </div>
   {overdue.length>0&&<Card title="Planejamentos anteriores para revisar" collapsible><p className="muted">Escolha uma nova data conscientemente. O prazo de entrega permanece independente.</p>{overdue.map(t=>taskCard(t))}</Card>}
   {waiting.filter(t=>!dayTasks.includes(t)).length>0&&<Card title="Aguardando retorno em outros dias" collapsible>{waiting.filter(t=>!dayTasks.includes(t)).map(t=>taskCard(t))}</Card>}
   </>}
  {loaded&&tab==='inbox'&&<InboxPanel items={inbox} catalogs={catalogs} onChanged={refresh}/>}
  {loaded&&tab==='templates'&&<TaskTemplatesPanel templates={templates} tasks={tasks} onChanged={refresh}/>}
  {tab==='tasks'&&taskList?.(setEditing,refresh)}
  {loaded&&tab==='weekly'&&<WeeklyReviewPanel day={day} tasks={tasks} onPlan={setEditing} onInbox={()=>setTab('inbox')}/>}
  {loaded&&tab==='week-plan'&&<WeekPlanningPanel day={day} onDay={setDay} tasks={tasks} plans={plans} onMoved={refresh}/>}
  {loaded&&tab==='plan'&&<><CapacityPanel day={day} tasks={tasks} plans={plans}/><Card title="Planejar tarefas"><Field label="Buscar tarefa para planejar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cliente, projeto, atividade ou detalhamento"/></Field>{tasks.filter(t=>!t.completed&&[t.activity,t.details,t.client,t.project].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).map(t=>taskCard(t))}{!tasks.some(t=>!t.completed)&&<Empty>Crie uma tarefa em Todas as tarefas.</Empty>}</Card></>}
  {loaded&&tab==='review'&&<DailyReviewPanel key={day} day={day} tasks={tasks} plans={plans} sessions={sessions} onPlan={setEditing} onJourney={()=>onJourney(day)}/>}
  {checklistTask&&<ChecklistDialog task={checklistTask} onClose={()=>setChecklistTask(null)} onChanged={refresh}/>}
  {editing&&<PlanDialog task={editing} plan={byId.get(editing.id)} onClose={()=>setEditing(null)} onSaved={refresh}/>}
 </div>;
}
