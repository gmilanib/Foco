import { useRef,useState } from 'react';
import { request,safeMessage } from '../api';
import { duration,isoDay } from '../format';
import { Card,Field,Empty } from './Field';

type Task={id:string;client:string;project:string;activity:string;details:string;plannedDate:string|null;estimatedSeconds:number|null;plannedSeconds:number;actualSeconds:number};
type Project={client:string;name:string;estimatedSeconds:number;plannedSeconds:number;actualSeconds:number;missingEstimates:number;unestimatedPlans:number;unlinkedSeconds:number};
type Week={start:string;plannedSeconds:number;actualSeconds:number;capacitySeconds:number;unestimatedPlans:number;unlinkedSeconds:number};
type Analysis={from:string;to:string;hoursMode:string;tasks:Task[];projects:Project[];weeks:Week[];unlinkedSeconds:number};
const defaults=()=>{const now=new Date(),start=new Date(now);start.setDate(now.getDate()-(now.getDay()+6)%7);return {from:isoDay(start),to:isoDay(now),hoursMode:'real'};};
function difference(actual:number,estimate:number|null){
 if(estimate===null)return 'Sem estimativa';
 const delta=actual-estimate;
 return `${delta>0?'+':delta<0?'−':''}${duration(Math.abs(delta))}`;
}
function missing(count:number){return count?` · ${count} sem estimativa`:'';}

export function PlanningAnalysisPanel(){
 const [criteria,setCriteria]=useState(defaults),[data,setData]=useState<Analysis|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const generation=useRef(0);
 const update=async()=>{
  const version=++generation.current;setLoading(true);setError('');setData(null);
  try{
   const result=await request<Analysis>(`/api/planning/analysis?${new URLSearchParams(criteria)}`);
   if(version===generation.current)setData(result);
  }catch(e){if(version===generation.current)setError(safeMessage(e));}
  finally{if(version===generation.current)setLoading(false);}
 };
 const pending=!!data&&(data.from!==criteria.from||data.to!==criteria.to||data.hoursMode!==criteria.hoursMode);
 return <div className="print-hide"><Card title="Planejado, estimado e realizado">
  <p>Consulta independente dos filtros do Dashboard. Inclui tarefas planejadas ou com apontamentos no período, inclusive concluídas. A estimativa é o total atual da tarefa; planejado é essa estimativa na sua data planejada. Sem estimativa não significa zero horas.</p>
  <p>Semanas começam na segunda-feira. A capacidade atual vale para cada dia selecionado, inclusive fins de semana. Estimativas, datas planejadas e capacidade não têm histórico: alterações atuais também afetam consultas antigas. Apontamentos inteiros entram na data local de início; sessões ativas mostram somente o tempo já salvo. Lacunas A definir ficam fora desta comparação.</p>
  <div className="form-grid">
   <Field label="Início da comparação"><input type="date" required value={criteria.from} onChange={e=>setCriteria(c=>({...c,from:e.target.value}))}/></Field>
   <Field label="Fim da comparação"><input type="date" required value={criteria.to} onChange={e=>setCriteria(c=>({...c,to:e.target.value}))}/></Field>
   <Field label="Horas realizadas na comparação"><select value={criteria.hoursMode} onChange={e=>setCriteria(c=>({...c,hoursMode:e.target.value}))}><option value="real">Reais</option><option value="rounded">Arredondadas</option></select></Field>
  </div>
  <button className="button" disabled={loading||!criteria.from||!criteria.to} onClick={()=>void update()}>{loading?'Comparando…':'Comparar horas'}</button>
  {error&&<p role="alert">{error}</p>}{pending&&<p role="status">Filtros alterados. Compare novamente para aplicar.</p>}
  {data&&!pending&&<div className="page-stack">
   <p>Período aplicado: {data.from} a {data.to} · Horas {data.hoursMode==='real'?'reais':'arredondadas'} · Realizado sem vínculo com tarefa: {duration(data.unlinkedSeconds)}.</p>
   <h3>Por tarefa</h3>{!data.tasks.length?<Empty>Nenhuma tarefa planejada ou apontada no período.</Empty>:<div className="analysis-scroll" tabIndex={0} role="region" aria-label="Tabela de comparação de horas"><table className="analysis-table"><thead><tr><th>Tarefa / projeto</th><th>Data planejada</th><th>Estimativa total</th><th>Planejado no período</th><th>Realizado no período</th><th>Realizado − estimativa</th></tr></thead><tbody>{data.tasks.map(t=><tr key={t.id}><th scope="row">{t.activity}{t.details&&` · ${t.details}`}<small>{t.client||'Sem cliente'} / {t.project||'Sem projeto'}</small></th><td>{t.plannedDate||'Sem data'}</td><td>{t.estimatedSeconds===null?'Sem estimativa':duration(t.estimatedSeconds)}</td><td>{t.plannedDate&&t.plannedDate>=data.from&&t.plannedDate<=data.to?(t.estimatedSeconds===null?'Sem estimativa':duration(t.plannedSeconds)):'Fora do período'}</td><td>{duration(t.actualSeconds)}</td><td>{difference(t.actualSeconds,t.estimatedSeconds)}</td></tr>)}</tbody></table></div>}
   <p>A diferença compara trabalho do período com a estimativa total; não representa o saldo da tarefa quando há trabalho fora do período.</p>
   <h3>Por projeto</h3>{!data.projects.length?<Empty>Nenhum projeto no período.</Empty>:<div className="analysis-scroll" tabIndex={0} role="region" aria-label="Tabela de comparação de horas"><table className="analysis-table"><thead><tr><th>Cliente / projeto</th><th>Estimado das tarefas incluídas</th><th>Planejado</th><th>Realizado</th><th>Vinculado − estimado</th><th>Sem vínculo</th></tr></thead><tbody>{data.projects.map(p=><tr key={JSON.stringify([p.client,p.name])}><th scope="row">{p.client||'Sem cliente'} / {p.name||'Sem projeto'}</th><td>{duration(p.estimatedSeconds)}{missing(p.missingEstimates)}</td><td>{duration(p.plannedSeconds)}{missing(p.unestimatedPlans)}</td><td>{duration(p.actualSeconds)}</td><td>{difference(p.actualSeconds-p.unlinkedSeconds,p.estimatedSeconds)}{p.missingEstimates?' · incompleto':''}</td><td>{duration(p.unlinkedSeconds)}</td></tr>)}</tbody></table></div>}
   <p>Tarefas vinculadas usam seu cliente/projeto atual. Apontamentos sem tarefa usam seu próprio cliente/projeto e não recebem estimativa.</p>
   <h3>Por semana</h3><div className="analysis-scroll" tabIndex={0} role="region" aria-label="Tabela de comparação de horas"><table className="analysis-table"><thead><tr><th>Semana de</th><th>Planejado / estimado</th><th>Realizado</th><th>Realizado − planejado</th><th>Capacidade no período</th><th>Planejado − capacidade</th><th>Sem vínculo</th></tr></thead><tbody>{data.weeks.map(w=><tr key={w.start}><th scope="row">{w.start}</th><td>{duration(w.plannedSeconds)}{missing(w.unestimatedPlans)}</td><td>{duration(w.actualSeconds)}</td><td>{difference(w.actualSeconds,w.plannedSeconds)}{w.unestimatedPlans?' · incompleto':''}</td><td>{duration(w.capacitySeconds)}</td><td>{difference(w.plannedSeconds,w.capacitySeconds)}{w.unestimatedPlans>0?' · incompleto':''}</td><td>{duration(w.unlinkedSeconds)}</td></tr>)}</tbody></table></div>
  </div>}
 </Card></div>;
}
