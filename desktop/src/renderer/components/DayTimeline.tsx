import { useState } from 'react';
import { Card,Field,Empty } from './Field';
import { duration,isoDay } from '../format';
import { shiftDay } from '../calendar';
import { dayBounds,timelineSegments } from '../timeline';
import type { Session,UndefinedPeriod } from '../types';
const clock=(time:number)=>new Date(time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
export function DayTimeline({sessions,periods,initialDay,onEdit,onBook,onDayChange}:{sessions:Session[];periods:UndefinedPeriod[];initialDay?:string;onEdit?:(session:Session)=>void;onBook:(period:UndefinedPeriod)=>void;onDayChange?:(day:string)=>void}){
 const [day,setDay]=useState(initialDay||isoDay(new Date()));
 const chooseDay=(value:string)=>{setDay(value);onDayChange?.(value);};
 const segments=timelineSegments(sessions,day),bounds=dayBounds(day);
 const gaps=periods.filter(p=>p.day===day),rows=Array.from(new Map(segments.map(segment=>[segment.session.id,segment.session])).values());
 const style=(start:number,end:number)=>({left:`${(start-bounds.start)/(bounds.end-bounds.start)*100}%`,width:`${(end-start)/(bounds.end-bounds.start)*100}%`});
 return <Card title="Linha do tempo diária">
  <div className="actions"><button className="button" onClick={()=>chooseDay(shiftDay(day,-1))}>Dia anterior</button><Field label="Dia da linha do tempo"><input type="date" required value={day} onChange={e=>{if(e.target.value)chooseDay(e.target.value);}}/></Field><button className="button" onClick={()=>chooseDay(shiftDay(day,1))}>Dia seguinte</button></div>
  <p className="muted">Horários locais. Pausas aparecem somente quando há intervalos precisos. Barras estimadas mostram o período da sessão, sem supor pausas; largura não representa horas de foco. Sessões abertas são provisórias.</p>
  {!segments.length&&!gaps.length&&<Empty>Nenhum intervalo encontrado neste dia.</Empty>}
  {rows.map(session=><section className="timeline-row" key={session.id}><h3>{session.activity} {session.client&&<small>· {session.client}</small>}</h3><div className="timeline-ruler"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div><div className="timeline-track" aria-hidden="true">{segments.filter(s=>s.session.id===session.id).map((s,i)=><i key={i} className={`timeline-bar timeline-bar--${s.kind}`} style={style(s.start,s.end)}/>)}</div><ul className="timeline-details">{segments.filter(s=>s.session.id===session.id).map((s,i)=><li key={i}><button className="button button--quiet" disabled={!onEdit||session.status==='Em andamento'||session.status==='Pausada'} onClick={()=>onEdit?.(session)}>{s.kind==='work'?'Trabalho':s.kind==='pause'?'Pausa':'Período estimado'} · {clock(s.start)}–{s.end===bounds.end?'24:00':clock(s.end)} · {duration((s.end-s.start)/1000)}{s.provisional?' · provisório':''}<span className="sr-only"> · Editar {session.activity}</span></button></li>)}</ul></section>)}
  {gaps.length>0&&<section className="timeline-row"><h3>A definir na jornada</h3><div className="timeline-track" aria-hidden="true">{gaps.map((gap,i)=><i key={i} className="timeline-bar timeline-bar--gap" style={style(new Date(gap.startAt).getTime(),new Date(gap.endAt).getTime())}/>)}</div><ul className="timeline-details">{gaps.map((gap,i)=><li key={i}><button className="button" onClick={()=>onBook(gap)}>Classificar A definir · {clock(new Date(gap.startAt).getTime())}–{clock(new Date(gap.endAt).getTime())} · {duration(gap.seconds)}</button></li>)}</ul></section>}
 </Card>;
}
