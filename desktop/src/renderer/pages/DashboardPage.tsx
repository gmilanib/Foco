import { useEffect,useState,type CSSProperties } from 'react';
import { Card,Field,Empty } from '../components/Field';
import { ClientMarker,clientColor } from '../components/ClientMarker';
import { duration,isoDay,money } from '../format';
import type { Color,Dashboard,GroupTotal } from '../types';

type Criteria={group:string;from:string;to:string;client:string;project:string;activity:string;consultant:string;minHours:string;maxHours:string};
const initial=():Criteria=>{const today=isoDay(new Date());return{group:'client',from:today,to:today,client:'',project:'',activity:'',consultant:'',minHours:'',maxHours:''};};
function clientHex(name:string|null|undefined,colors:Color[],index:number){return (name?clientColor(name,colors):undefined)||`var(--chart-${index%8})`;}
function Chart({groups,projects,kind,expanded,toggle,colors}:{groups:GroupTotal[];projects:GroupTotal[];kind:'hours'|'value';expanded:string[];toggle:(name:string)=>void;colors:Color[]}){
 if(!groups.length)return <Empty>Nenhum dado para os filtros escolhidos.</Empty>;
 const max=Math.max(1,...groups.map(g=>kind==='hours'?g.seconds:g.value));
 return <div className="chart-list">{groups.map(group=>{
  const key=group.name,children=projects.filter(p=>p.parent?.toLowerCase()===key.toLowerCase()),value=kind==='hours'?group.seconds:group.value,open=expanded.includes(key);
  return <div className="chart-group" key={key}><div className="chart-row"><button aria-expanded={open} className="chart-label" disabled={!children.length} onClick={()=>toggle(key)}>{children.length?(open?'▾':'▸'):''} <ClientMarker client={group.client||''} colors={colors}>{group.name}</ClientMarker></button><strong>{kind==='hours'?duration(value):money(value)}</strong></div><div className="bar-track"><span style={{width:`${value/max*100}%`,backgroundColor:clientHex(group.client,colors,groups.indexOf(group))}}/></div>
   {open&&children.length>0&&<div className="chart-children">{children.map(project=>{const subtotal=kind==='hours'?project.seconds:project.value;return <div className="chart-group" key={`${key}/${project.name}`}><div className="chart-row"><ClientMarker client={project.client||''} colors={colors}>{project.name}</ClientMarker><strong>{kind==='hours'?duration(project.seconds):money(project.value)}</strong></div><div className="bar-track bar-track--secondary"><span style={{width:`${subtotal/max*100}%`,backgroundColor:clientColor(project.client||'',colors)}}/></div>{kind==='value'&&project.unpriced>0&&<small>{project.unpriced} sem valor/hora</small>}</div>;})}</div>}
  </div>;
 })}</div>;
}
function donut(groups:GroupTotal[],total:number,colors:Color[]){if(!total)return 'conic-gradient(#d9dfe5 0 100%)';let at=0;const stops=groups.map((group,index)=>{const start=at;at+=group.seconds/total*100;return `${clientHex(group.client,colors,index)} ${start}% ${at}%`;});return `conic-gradient(${stops.join(',')})`;}

export function DashboardPage({data,colors,showValues,onRefresh}:{data:Dashboard|null;colors:Color[];showValues:boolean;onRefresh:(criteria:Criteria)=>void}){
 const [criteria,setCriteria]=useState(initial),[expanded,setExpanded]=useState<string[]>([]);
 useEffect(()=>{onRefresh(criteria);},[]);
 const toggle=(key:string)=>setExpanded(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key]);
 return <div className="page-stack"><div className="page-title"><div><h1>Dashboard</h1><p>Compare horas e valores do período por cliente, projeto e consultor.</p></div><button className="button" onClick={()=>onRefresh(criteria)}>Atualizar</button></div>
  <Card title="Filtros do dashboard"><div className="form-grid form-grid--four"><Field label="Agrupar por"><select value={criteria.group} onChange={e=>setCriteria(c=>({...c,group:e.target.value}))}><option value="client">Cliente</option><option value="project">Projeto</option><option value="activity">Atividade</option><option value="consultant">Consultor</option></select></Field><Field label="Data inicial"><input type="date" value={criteria.from} onChange={e=>setCriteria(c=>({...c,from:e.target.value}))}/></Field><Field label="Data final"><input type="date" value={criteria.to} onChange={e=>setCriteria(c=>({...c,to:e.target.value}))}/></Field><Field label="Cliente"><input value={criteria.client} onChange={e=>setCriteria(c=>({...c,client:e.target.value}))}/></Field><Field label="Projeto"><input value={criteria.project} onChange={e=>setCriteria(c=>({...c,project:e.target.value}))}/></Field><Field label="Atividade"><input value={criteria.activity} onChange={e=>setCriteria(c=>({...c,activity:e.target.value}))}/></Field><Field label="Consultor"><input value={criteria.consultant} onChange={e=>setCriteria(c=>({...c,consultant:e.target.value}))}/></Field><Field label="Horas mínimas"><input type="number" min="0" value={criteria.minHours} onChange={e=>setCriteria(c=>({...c,minHours:e.target.value}))}/></Field><Field label="Horas máximas"><input type="number" min="0" value={criteria.maxHours} onChange={e=>setCriteria(c=>({...c,maxHours:e.target.value}))}/></Field></div><label className="check-row"><input type="checkbox" checked={expanded.length>0} onChange={()=>setExpanded(expanded.length?[]:data?.groups.map(g=>g.name)||[])}/> Detalhar projetos</label></Card>
  {data&&<><div className="kpi-grid"><Card title="Sessões"><strong className="metric">{data.sessions}</strong></Card><Card title="Horas"><strong className="metric">{duration(data.seconds)}</strong></Card>{showValues&&<Card title="Valor"><strong className="metric">{money(data.value)}</strong><small>{data.unpriced} sem valor/hora</small></Card>}</div>
   <Card title="Distribuição por agrupamento"><div className="donut-layout"><div className="donut" style={{background:donut(data.groups,data.seconds,colors)} as CSSProperties}><span>{duration(data.seconds)}<small>HORAS TOTAIS</small></span></div><div className="legend">{data.groups.map((g,i)=><div key={g.name}><i style={{'--swatch':clientHex(g.client,colors,i)} as CSSProperties}/><ClientMarker client={g.client||''} colors={colors}>{g.name}</ClientMarker> · {duration(g.seconds)} · {data.seconds?Math.round(g.seconds/data.seconds*100):0}%</div>)}</div></div></Card>
   <div className="chart-grid"><Card title="Horas por agrupamento"><Chart groups={data.groups} projects={data.projects} kind="hours" expanded={expanded} toggle={toggle} colors={colors}/></Card>{showValues&&<Card title="Valor por agrupamento"><Chart groups={data.groups} projects={data.projects} kind="value" expanded={expanded} toggle={toggle} colors={colors}/></Card>}</div>
  </>}
 </div>;
}
