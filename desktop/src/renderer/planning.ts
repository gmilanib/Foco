import type { Task } from './types';
export type Plan={taskId:string;plannedDate:string|null;priority:number;nextAction:string;waitingFor:string;reviewDate:string|null};
export type PlanInput={plannedDate:string|null;priority:boolean;nextAction:string;waitingFor:string;reviewDate:string|null;state:string};
export type InboxItem={id:string;title:string;createdAt:string};
export type TaskTemplate={id:string;sourceId:string;name:string;recurrence:'none'|'daily'|'weekly'|'workdays'|'weekdays'|'monthly';nextDate:string|null;paused?:boolean;weekdays?:number[];monthDay?:number|null;sourceArchived?:boolean};
export type DailyReview={day:string;notes:string;reviewedAt:string|null};
export const taskStates=['Pendente','Em andamento','Concluída','Aguardando'];
export const planInput=(task:Task,plan?:Plan):PlanInput=>({plannedDate:plan?.plannedDate||null,priority:!!plan?.priority,nextAction:plan?.nextAction||'',waitingFor:plan?.waitingFor||'',reviewDate:plan?.reviewDate||null,state:task.state});
export function plannedTasks(tasks:Task[],plans:Plan[],day:string){
 const byId=new Map(plans.map(p=>[p.taskId,p]));
 return tasks.filter(t=>byId.get(t.id)?.plannedDate===day).sort((a,b)=>{
  const rank=(t:Task)=>t.completed||t.state==='Aguardando'?9999:byId.get(t.id)?.priority||9998;
  return rank(a)-rank(b)||a.activity.localeCompare(b.activity,'pt-BR')||a.id.localeCompare(b.id);
 });
}
