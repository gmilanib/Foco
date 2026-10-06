import { useEffect,useState } from 'react';
import { request,safeMessage } from '../api';
import type { Task } from '../types';
import type { InboxItem } from '../planning';
import { Card,Empty } from './Field';

type Review={weekStart:string;weekEnd:string;oldCaptures:InboxItem[];withoutNextAction:string[];unexecuted:string[];overdueDependencies:string[]};
export function WeeklyReviewPanel({day,tasks,onPlan,onInbox}:{day:string;tasks:Task[];onPlan:(task:Task)=>void;onInbox:()=>void}){
 const [review,setReview]=useState<Review|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setReview(null);setError('');setBusy(true);void request<Review>(`/api/planning/weekly-review?day=${day}`).then(r=>{if(active)setReview(r);}).catch(e=>{if(active)setError(safeMessage(e));}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[day,tasks]);
 const date=(v:string)=>new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR');
 const group=(title:string,ids:string[])=>{const rows=tasks.filter(t=>ids.includes(t.id));return <Card title={`${title} (${rows.length})`}>{rows.length?rows.map(t=><article className="planning-task" key={t.id}><div><h3>{t.activity}</h3><p>{[t.client,t.project,t.details].filter(Boolean).join(' · ')}</p></div><button className="button" onClick={()=>onPlan(t)}>Revisar planejamento</button></article>):<Empty>Nenhuma pendência neste grupo.</Empty>}</Card>;};
 return <div className="page-stack"><p className="muted">Confira as pendências acumuladas até {date(day)}. Capturas antigas têm pelo menos sete dias. Planejamentos anteriores aparecem quando não houve tempo apontado desde a data planejada.</p>
  {busy&&<p role="status">Carregando revisão semanal…</p>}{error&&<p role="alert">{error}</p>}
  {review&&<><p>Semana de {date(review.weekStart)} a {date(review.weekEnd)}</p>
   <Card title={`Capturas antigas (${review.oldCaptures.length})`}>{review.oldCaptures.length?<>{review.oldCaptures.map(i=><p key={i.id}>{i.title}</p>)}<button className="button" onClick={onInbox}>Organizar na caixa de entrada</button></>:<Empty>Nenhuma captura antiga.</Empty>}</Card>
   {group('Tarefas sem próxima ação',review.withoutNextAction)}{group('Planejamentos não executados',review.unexecuted)}{group('Dependências para revisar',review.overdueDependencies)}
  </>}
 </div>;
}
