import { Card } from './Field';
import { duration,localDate } from '../format';
import { occupiedSeconds,type SessionConflict } from '../conflicts';
import type { Session } from '../types';

export function ConflictReview({conflicts,onEdit}:{conflicts:SessionConflict[];onEdit?:(session:Session)=>void}){
 if(!conflicts.length)return null;
 const involved=[...new Map(conflicts.flatMap(c=>[c.first,c.second]).map(s=>[s.id,s])).values()];
 return <Card title={`Revisão de conflitos (${conflicts.length})`}>
  <p>Foco somado nas atividades envolvidas: {duration(involved.reduce((n,s)=>n+s.focusSeconds,0))}. Tempo ocupado sem repetir intervalos: {duration(occupiedSeconds(involved))}.</p>
  <p>Revise os horários ou abra a edição para confirmar a manutenção da sobreposição. Os totais continuam somando o foco registrado em cada atividade.</p>
  {conflicts.map(c=><div key={`${c.first.id}/${c.second.id}`} className="conflict-review">
   <strong>{c.first.activity} × {c.second.activity}: {duration(c.seconds)} em conflito{c.estimated?' (estimado)':''}</strong>
   {[c.first,c.second].map(s=><p key={s.id}>{s.activity} · {s.client||'Sem cliente'} / {s.project||'Sem projeto'} · {localDate(s.startAt)} até {localDate(s.endAt)}{s.details?` · ${s.details}`:''}</p>)}
   {c.spans.map(s=><p key={s.start}>{localDate(new Date(s.start).toISOString())} até {localDate(new Date(s.end).toISOString())}</p>)}
   {onEdit&&<div className="actions">{[c.first,c.second].map(s=><button key={s.id} className="button" disabled={s.status==='Em andamento'||s.status==='Pausada'} onClick={()=>onEdit(s)}>Revisar {s.activity} · {s.client||'Sem cliente'} / {s.project||'Sem projeto'}</button>)}</div>}
  </div>)}
 </Card>;
}
