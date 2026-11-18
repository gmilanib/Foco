import { useContext,useEffect,useMemo,useState } from 'react';
import { sessions as loadSessions,safeMessage } from '../api';
import { duration,isoDay } from '../format';
import { hourlyTimelineTicks,shiftTimeline,timelineDays,timelineGroups,timelineScale,type TimelinePeriod,type TimelineView } from '../dashboardTimeline';
import { dayBounds,timelineSegments,type TimelineSegment } from '../timeline';
import type { Color,Session } from '../types';
import { ProjectColorSeeds,clientColor,projectColor } from './ClientMarker';
import { Card,Empty,Field } from './Field';
import '../dashboardTimeline.css';

const labels={work:'Trabalho',pause:'Pausa',estimated:'Período estimado'};
const dateLabel=(day:string)=>new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
const clock=(time:number)=>new Date(time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
function segmentLabel(segment:TimelineSegment,day:string){
 return `${labels[segment.kind]} · ${clock(segment.start)}–${segment.end===dayBounds(day).end?'24:00':clock(segment.end)} · ${duration((segment.end-segment.start)/1000)}${segment.provisional?' · provisório':''}`;
}
export function DashboardTimeline({revision,colors=[]}:{revision:unknown;colors?:Color[]}){
 const seeds=useContext(ProjectColorSeeds);
 const [view,setView]=useState<TimelineView>('all');
 const [selected,setSelected]=useState<string|null>(null);
 const [day,setDay]=useState(()=>isoDay(new Date())),[period,setPeriod]=useState<TimelinePeriod>('day');
 const [rows,setRows]=useState<Session[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let cancelled=false;setLoading(true);setError('');
  // Include sessions started before the selected period (overnight work).
  void loadSessions().then(value=>{if(!cancelled)setRows(value);}).catch(e=>{if(!cancelled)setError(safeMessage(e));}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[revision,retry]);
 const days=useMemo(()=>timelineDays(day,period).map(date=>({day:date,segments:timelineSegments(rows,date)})),[rows,day,period]);
 const segments=days.flatMap(value=>value.segments);
 const {windows,position}=timelineScale(days);
 const ticks=windows.flatMap(w=>period==='day'?hourlyTimelineTicks(w.start,w.end).map(time=>({time,label:time===dayBounds(w.day).end?'24:00':clock(time)})):[{time:w.start,label:`${dateLabel(w.day)} · ${clock(w.start)}–${w.end===dayBounds(w.day).end?'24:00':clock(w.end)}`}]);
 const sessions=Array.from(new Map(segments.map(s=>[s.session.id,s.session])).values());
 const active=sessions.find(s=>s.id===selected)??sessions[0];
 const groups=timelineGroups(segments,view);
 const color=(session:Session)=>view==='client'?(clientColor(session.client,colors)??'var(--muted)'):projectColor(session.client,session.project,colors,seeds);
 const total=(kind:TimelineSegment['kind'])=>segments.filter(s=>s.kind===kind).reduce((sum,s)=>sum+(s.end-s.start)/1000,0);
 return <Card title="Linha do tempo">
  <div className="actions print-hide">
   <div className="actions" role="group" aria-label="Visão da linha do tempo">{(['all','client','project'] as const).map(value=><button key={value} className={`button ${view===value?'button--primary':''}`} aria-pressed={view===value} onClick={()=>setView(value)}>{{all:'Geral',client:'Por cliente',project:'Por projeto'}[value]}</button>)}</div>
   <div className="actions" role="group" aria-label="Escala da linha do tempo">{(['day','week','month'] as const).map(value=><button key={value} className={`button ${period===value?'button--primary':''}`} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{{day:'Dia',week:'Semana',month:'Mês'}[value]}</button>)}</div>
   <button className="button" onClick={()=>setDay(shiftTimeline(day,period,-1))}>Período anterior</button>
   <Field label="Data da linha do tempo"><input type="date" required value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></Field>
   <button className="button" onClick={()=>setDay(shiftTimeline(day,period,1))}>Próximo período</button>
   <button className="button" onClick={()=>setDay(isoDay(new Date()))}>Hoje</button>
   <button className="button" onClick={()=>setRetry(value=>value+1)}>Atualizar linha do tempo</button>
  </div>
  <p><strong>{dateLabel(days[0].day)}{days.length>1?` a ${dateLabel(days[days.length-1].day)}`:''}</strong></p>
  <p className="muted">Histórico de todos os apontamentos, com período próprio, independente dos filtros dos gráficos. Horários locais, sem arredondamento. A semana começa na segunda-feira. Registros estimados mostram a duração do período, não horas de foco; sessões abertas são provisórias.</p>
  {loading?<p role="status">Carregando linha do tempo…</p>:error?<div role="alert">{error} Use Atualizar linha do tempo para tentar novamente.</div>:<>
   <div className="dashboard-timeline-totals"><span>Trabalho registrado: <strong>{duration(total('work'))}</strong></span><span>Pausas registradas: <strong>{duration(total('pause'))}</strong></span><span>Períodos estimados: <strong>{duration(total('estimated'))}</strong></span></div>
   {!segments.length&&<Empty>Nenhum intervalo encontrado neste período.</Empty>}
   <p className="muted">{view==='client'?'Acompanhe as trocas de cliente ao longo do período em uma única linha. Cada bloco mostra o cliente daquele intervalo.':'Cada bloco representa um intervalo.'} Selecione um bloco ou uma atividade para ver os detalhes. Cada dia exibe da primeira à última atividade; dias vazios e intervalos entre jornadas não ocupam espaço. Lacunas internas aparecem como “Sem registro”; pausas são hachuradas e estimativas têm borda tracejada.</p>
   <div className="dashboard-timeline-scroll" role="region" aria-label="Linha contínua de atividades" tabIndex={0}>
    {groups.map(group=><section key={group.key} className="dashboard-timeline-group" aria-label={group.label}>
    {view==='project'&&<h3>{group.label}</h3>}
    <div className="dashboard-timeline-axis" style={{minWidth:period==='day'?Math.max(720,ticks.length*72):Math.max(720,windows.length*260),height:80+Math.max(1,group.laneCount)*44}}>
     <div className="dashboard-timeline-line"/>
     {ticks.map((tick,index)=><div key={index} className="dashboard-timeline-tick" style={{left:`${position(tick.time)}%`}}><span>{tick.label}</span></div>)}
     {windows.flatMap(w=>w.gaps.map(gap=><div key={gap.start} className="dashboard-timeline-gap" style={{left:`${position(gap.start)}%`,width:`${position(gap.end)-position(gap.start)}%`,height:Math.max(1,group.laneCount)*44}} title={`Sem registro · ${clock(gap.start)}–${clock(gap.end)}`}><span>Sem registro</span></div>))}
     {windows.slice(1).map(w=><div key={w.day} className="dashboard-timeline-break" style={{left:`${position(w.start)}%`}} title={`Início de ${dateLabel(w.day)}`}/>)}
     {group.blocks.map((s,index)=>{
      const label=`${s.session.activity} · ${s.session.client} · ${s.session.project} · ${dateLabel(isoDay(new Date(s.start)))} · ${segmentLabel(s,isoDay(new Date(s.start)))}`;
      return <button key={index} className={`dashboard-timeline-block dashboard-timeline-block--${s.kind}`} aria-label={label} title={label} aria-pressed={active?.id===s.session.id} onClick={()=>setSelected(s.session.id)} style={{left:`${position(s.start)}%`,width:`${position(s.end)-position(s.start)}%`,top:52+s.lane*44,backgroundColor:s.kind==='pause'?undefined:color(s.session)}}><span>{view==='client'?(s.session.client||'Sem cliente'):s.session.activity}</span></button>;
     })}
    </div>
    </section>)}
   </div>
   <div className="dashboard-timeline-activities" role="group" aria-label="Atividades do período">{sessions.map(session=><button className="button" key={session.id} aria-pressed={active?.id===session.id} onClick={()=>setSelected(session.id)}><i aria-hidden="true" style={{background:color(session)}}/>{session.activity} · {session.client}{session.project?` / ${session.project}`:''}</button>)}</div>
   {active&&<section className="dashboard-timeline-detail" aria-label="Detalhes do apontamento selecionado"><h3>{active.activity}</h3><p>{[active.client,active.project,active.status].filter(Boolean).join(' · ')}</p>{active.details&&<p>{active.details}</p>}<ul>{days.flatMap(d=>d.segments.filter(s=>s.session.id===active.id).map((s,index)=><li key={`${d.day}/${index}`}>{dateLabel(d.day)} · {segmentLabel(s,d.day)}</li>))}</ul></section>}
  </>}
 </Card>;
}

