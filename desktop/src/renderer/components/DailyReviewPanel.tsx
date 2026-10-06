import { DraftRecovery,clearDraft } from './DraftRecovery';
import { useEffect,useState } from 'react';
import { request,safeMessage,workHours } from '../api';
import { isoDay,duration } from '../format';
import type { DailyReview,Plan } from '../planning';
import type { Session,Task,WorkHoursReport } from '../types';
import { Card,Field } from './Field';

export function DailyReviewPanel({day,tasks,plans,sessions,onPlan,onJourney}:{day:string;tasks:Task[];plans:Plan[];sessions:Session[];onPlan:(task:Task)=>void;onJourney:()=>void}){
 const [review,setReview]=useState<DailyReview|null>(null),[notes,setNotes]=useState(''),[hours,setHours]=useState<WorkHoursReport|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setReview(null);setHours(null);setNotes('');setError('');
  Promise.all([request<DailyReview>(`/api/planning/reviews/${day}`),workHours({from:day,to:day})]).then(([r,h])=>{if(alive){setReview(r);setNotes(r.notes);setHours(h);}}).catch(e=>{if(alive)setError(safeMessage(e));});return()=>{alive=false;};
 },[day,retry]);
 const worked=new Set(sessions.filter(s=>isoDay(new Date(s.startAt))===day||(s.workIntervals||[]).some(i=>isoDay(new Date(i.startAt))===day)).map(s=>s.taskId));
 const pending=tasks.filter(t=>!t.completed&&(worked.has(t.id)||plans.some(p=>p.taskId===t.id&&p.plannedDate===day)));
 const active=sessions.filter(s=>s.status==='Em andamento'||s.status==='Pausada');
 return <Card title="Fechamento do dia">
  <p className="muted">Revise o que ficou aberto, registre a próxima ação e confira as lacunas. Salvar esta revisão não encerra o cronômetro nem conclui tarefas.</p>
  {error&&<p role="alert">{error} <button className="button" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></p>}
  {!review&&!error&&<p role="status">Carregando revisão…</p>}
  {active.length>0&&<p>Há um apontamento ativo ou pausado. Encerre-o em Apontar horas quando terminar.</p>}
  <p>{worked.size-(worked.has(null)?1:0)} tarefa(s) com apontamentos no dia · {pending.length} tarefa(s) para revisar.</p>
  <ul className="planning-list">{pending.map(t=><li key={t.id}><span>{t.activity}{t.details&&<small>{t.details}</small>}</span><button className="button" onClick={()=>onPlan(t)}>Revisar tarefa</button></li>)}</ul>
  {hours&&<p>{hours.undefinedPeriods.length} lacuna(s) a definir · {duration(hours.undefinedPeriods.reduce((sum,p)=>sum+p.seconds,0))} <button className="button" onClick={onJourney}>Conferir Jornada</button></p>}
  <form onSubmit={async e=>{e.preventDefault();if(busy||!review)return;setBusy(true);setError('');try{setReview(await request<DailyReview>(`/api/planning/reviews/${day}`,'PUT',{notes}));clearDraft(`review.${day}`);}catch(e){setError(safeMessage(e));}finally{setBusy(false);}}}>
   {review&&<DraftRecovery key={`${day}.${review.reviewedAt}`} id={`review.${day}`} value={notes} onRecover={setNotes}/>}
   <Field label="Notas da revisão"><textarea disabled={!review||busy} maxLength={2000} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="O que avançou? O que precisa continuar amanhã?"/></Field>
   <div className="actions"><button className="button button--primary" disabled={busy||!review||day>isoDay(new Date())}>Salvar revisão do dia</button>{review?.reviewedAt&&<span role="status">Revisão salva em {new Date(review.reviewedAt).toLocaleString('pt-BR')}</span>}</div>
  </form>
 </Card>;
}
