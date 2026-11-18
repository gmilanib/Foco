import { useHoursPreference } from '../HoursPreference';
import { OvertimeDialog } from '../components/OvertimeDialog';
import { ActivityListDialog } from '../components/ActivityListDialog';
import { focusSeconds,hasUnknownPrecision,type HoursMode } from '../hoursBasis';
import { HoursComparison,compareSessions } from '../components/HoursComparison';
import { SavedViews } from '../components/SavedViews';
import { viewFields,viewText,viewChoice,viewDate,viewNumber } from '../savedViews';
import { readView,writeView,oneOf,useViewState } from '../viewPreferences';
import { SessionTaskDialog } from '../components/SessionTaskDialog';
import { useEffect,useMemo,useRef,useState } from 'react';
import { Card,Field,Empty,Status } from '../components/Field';
import { ClientMarker,ProjectMarker } from '../components/ClientMarker';
import { HistoryDialog } from '../components/HistoryDialog';
import { ConflictReview } from '../components/ConflictReview';
import { sessionConflicts } from '../conflicts';
import { undefinedSessions } from '../undefinedTime';
import { useUndefinedTime } from '../useUndefinedTime';
import { SortControls } from '../components/SortControls';
import { localDate,money,duration,isoDay } from '../format';
import type { Color,Session,Task } from '../types';

export type Criteria={hoursMode?:HoursMode;query:string;client:string;project:string;from:string;to:string;activity:string;consultant:string;status:string;category:string;minHours:string;maxHours:string;minValue:string;maxValue:string;sort:string;direction:'asc'|'desc'};
const defaults=():Criteria=>{const today=new Date();const day=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;return{query:'',client:'',project:'',from:day,to:day,activity:'',consultant:'',status:'',category:'',minHours:'',maxHours:'',minValue:'',maxValue:'',hoursMode:'rounded',sort:readView('reports.sort','recent',oneOf('recent','activity','client','project','consultant','focus','status','category','value')),direction:readView('reports.direction','desc',oneOf('asc','desc'))};};
const blank:Criteria={...defaults(),from:'',to:''};
type ReportView=Criteria&{endMode:'real'|'rounded';onlyConflicts:boolean};
const validReportView=viewFields<ReportView>({query:viewText,client:viewText,project:viewText,from:viewDate,to:viewDate,activity:viewText,consultant:viewText,status:viewChoice('','Concluída','Encerrada','Interrompida','Em andamento','Pausada'),category:viewChoice('','Normal','Agenda'),minHours:viewNumber,maxHours:viewNumber,minValue:viewNumber,maxValue:viewNumber,hoursMode:viewChoice('real','rounded'),sort:viewChoice('recent','activity','client','project','consultant','focus','status','category','value'),direction:viewChoice('asc','desc'),endMode:viewChoice('real','rounded'),onlyConflicts:value=>typeof value==='boolean'});
type Props={tasks?:Task[];onChanged?:()=>Promise<void>|void;items:Session[];history?:Session[];colors:Color[];showValues:boolean;onRefresh:(criteria:Criteria)=>Promise<boolean|void>|void;onEdit:(session:Session)=>void;onDelete:(session:Session)=>void;onBatch:(items:Session[],field:'client'|'project'|'details'|'cardReference',value:string)=>void;onExport:(items:Session[],endMode?:'real'|'rounded',hoursMode?:HoursMode)=>void};
export function ReportPage({items:sourceItems,history,colors,showValues,onRefresh,onEdit,onDelete,onBatch,onExport,tasks=[],onChanged}:Props){
  const hoursMode=useHoursPreference();
  const [overtimeOpen,setOvertimeOpen]=useState(false);
  const [activityListOpen,setActivityListOpen]=useState(false);
  const [endMode,setEndMode]=useViewState('reports.end','real',oneOf('real','rounded'));
  const [criteria,setCriteria]=useState(()=>({...defaults(),hoursMode}));const [selection,setSelection]=useState<string[]>([]);const [field,setField]=useState<'client'|'project'|'details'|'cardReference'>('client');const [value,setValue]=useState('');
  const [applied,setApplied]=useState(()=>({...defaults(),hoursMode})),[onlyConflicts,setOnlyConflicts]=useState(false),[historySession,setHistorySession]=useState<Session|null>(null);
  const refreshVersion=useRef(0);
  const [loading,setLoading]=useState(false),[loadFailed,setLoadFailed]=useState(false);
  const [linking,setLinking]=useState<Session|null>(null);
  useEffect(()=>{writeView('reports.sort',criteria.sort);writeView('reports.direction',criteria.direction);},[criteria.hoursMode,criteria.sort,criteria.direction]);
  const seconds=(s:Session)=>focusSeconds(s,applied.hoursMode??'rounded');
  const cost=(s:Session)=>s.hourlyRate==null?null:s.hourlyRate*seconds(s)/3600;
  const gaps=useUndefinedTime('reports',applied,sourceItems);
  const conflicts=useMemo(()=>sessionConflicts(history||sourceItems).filter(c=>sourceItems.some(s=>s.id===c.first.id||s.id===c.second.id)),[history,sourceItems]);
  const conflictingIds=new Set(conflicts.flatMap(c=>[c.first.id,c.second.id]));
  const items=useMemo(()=>[...sourceItems,...undefinedSessions(gaps.periods,applied)].filter(s=>!onlyConflicts||conflicts.some(c=>c.first.id===s.id||c.second.id===s.id)),[sourceItems,gaps.periods,applied,onlyConflicts,conflicts]);
  const refresh=async(next:Criteria)=>{next={...next,hoursMode};const version=++refreshVersion.current;setLoading(true);setLoadFailed(false);try{const ok=await onRefresh(next)!==false;if(version===refreshVersion.current){if(ok)setApplied({...next,hoursMode});else setLoadFailed(true);}}catch{if(version===refreshVersion.current)setLoadFailed(true);}finally{if(version===refreshVersion.current)setLoading(false);}};
  useEffect(()=>{const next={...criteria,hoursMode};setCriteria(next);void refresh(next);},[hoursMode]);
  const sortedItems=useMemo(()=>[...items].sort((a,b)=>{
    const sign=criteria.direction==='asc'?1:-1;
    const text=(left:string,right:string)=>left.localeCompare(right,'pt-BR',{sensitivity:'base'})*sign;
    const numeric=(left:number,right:number)=>(left-right)*sign;
    const startDifference=Date.parse(a.startAt)-Date.parse(b.startAt);
    const result=criteria.sort==='activity'?text(a.activity,b.activity):criteria.sort==='client'?text(a.client,b.client):criteria.sort==='project'?text(a.project,b.project):criteria.sort==='consultant'?text(a.consultant,b.consultant):criteria.sort==='focus'?numeric(seconds(a),seconds(b)):criteria.sort==='status'?text(a.status,b.status):criteria.sort==='category'?text(a.category||'Normal',b.category||'Normal'):criteria.sort==='value'?numeric((a.hourlyRate??0)*seconds(a),(b.hourlyRate??0)*seconds(b)):startDifference*sign;
    return result||-startDifference||a.id.localeCompare(b.id);
  }),[items,criteria.sort,criteria.direction,applied.hoursMode]);
  useEffect(()=>{setSelection([]);},[sourceItems,onlyConflicts,gaps.included]);
  const toggle=(id:string)=>setSelection(s=>s.includes(id)?s.filter(v=>v!==id):[...s,id]);
  return <div className="page-stack"><div className="page-title"><div><h1>Relatório de horas</h1><p>{items.filter(s=>!s.virtual).length} sessões · {items.filter(s=>s.virtual).length} lacunas · {duration(items.reduce((n,s)=>n+seconds(s),0))}{showValues?` · ${money(items.reduce((n,s)=>n+(cost(s)||0),0))}`:''}</p></div><button className="button" disabled={loading||loadFailed||gaps.loading||!!gaps.error||JSON.stringify({...criteria,sort:'',direction:''})!==JSON.stringify({...applied,sort:'',direction:''})} onClick={()=>onExport(selection.length?sortedItems.filter(s=>selection.includes(s.id)):sortedItems,endMode,applied.hoursMode??'rounded')}>Exportar CSV{selection.length?` (${selection.length})`:''}</button></div>
    <div className="actions"><button className="button button--primary" onClick={()=>setActivityListOpen(true)}>Lista de atividades</button><button className="button" onClick={()=>setOvertimeOpen(true)}>Exportar horas extras</button></div>
    {activityListOpen&&<ActivityListDialog onClose={()=>setActivityListOpen(false)}/>}
    {overtimeOpen&&<OvertimeDialog onClose={()=>setOvertimeOpen(false)}/>}
    {loadFailed&&<p role="alert">Não foi possível atualizar o relatório. Tente novamente antes de exportar.</p>}<p className="muted">Horas {applied.hoursMode==='real'?'reais':'arredondadas'}.</p>
    <details className="disclosure report-options"><summary>Opções do relatório</summary><div className="disclosure__body"><Field label="Término exibido"><select value={endMode} onChange={e=>setEndMode(e.target.value as 'real'|'rounded')}><option value="real">Real</option><option value="rounded">Arredondado</option></select></Field>
    <HoursComparison value={compareSessions(items)}/>
    <div><label className="check-row"><input type="checkbox" checked={gaps.included} onChange={e=>gaps.change(e.target.checked)}/> Incluir tempo A definir</label>
    <p>A definir acompanha os totais e o CSV. Lacunas não são atribuídas a clientes, projetos ou consultores.</p>
    {gaps.loading&&<p role="status">Carregando tempo A definir…</p>}{gaps.error&&<p role="alert">{gaps.error}</p>}
    <label className="check-row"><input type="checkbox" checked={onlyConflicts} onChange={e=>setOnlyConflicts(e.target.checked)}/> Somente horários conflitantes</label>
    <ConflictReview conflicts={conflicts} onEdit={onEdit}/></div>
    </div></details>
    <Card title="Filtros do relatório" collapsible>
      <SavedViews scope="reports" criteria={{...criteria,hoursMode:criteria.hoursMode??'rounded',endMode,onlyConflicts}} validate={validReportView} onApply={({endMode,onlyConflicts,...next})=>{setEndMode(endMode);setOnlyConflicts(onlyConflicts);setCriteria({...next,hoursMode});void refresh({...next,hoursMode});}}/>
      <div className="form-grid form-grid--four"><Field label="Período rápido"><select value="personalizado" onChange={e=>{if(e.target.value==='all')setCriteria({...blank,hoursMode});if(e.target.value==='today'){const day=isoDay(new Date());setCriteria(c=>({...c,from:day,to:day}));}}}><option value="personalizado">Personalizado</option><option value="today">Hoje</option><option value="all">Todos</option></select></Field>
        <Field label="Data inicial"><input type="date" value={criteria.from} onChange={e=>setCriteria(c=>({...c,from:e.target.value}))}/></Field><Field label="Data final"><input type="date" value={criteria.to} onChange={e=>setCriteria(c=>({...c,to:e.target.value}))}/></Field>
        <Field label="Buscar em todos os campos"><input value={criteria.query} onChange={e=>setCriteria(c=>({...c,query:e.target.value}))}/></Field>
        <Field label="Cliente"><input value={criteria.client} onChange={e=>setCriteria(c=>({...c,client:e.target.value}))}/></Field><Field label="Projeto"><input value={criteria.project} onChange={e=>setCriteria(c=>({...c,project:e.target.value}))}/></Field>
      </div>
      <details className="advanced-filters"><summary>Filtros adicionais</summary><div className="form-grid form-grid--four">
        <Field label="Atividade"><input value={criteria.activity} onChange={e=>setCriteria(c=>({...c,activity:e.target.value}))}/></Field><Field label="Consultor"><input value={criteria.consultant} onChange={e=>setCriteria(c=>({...c,consultant:e.target.value}))}/></Field><Field label="Resultado"><select value={criteria.status} onChange={e=>setCriteria(c=>({...c,status:e.target.value}))}><option value="">Todos</option>{['Concluída','Encerrada','Interrompida','Em andamento','Pausada'].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Categoria"><select value={criteria.category} onChange={e=>setCriteria(c=>({...c,category:e.target.value}))}><option value="">Todas</option><option value="Normal">Normal</option><option value="Agenda">Agenda</option></select></Field>
        <Field label="Horas mínimas"><input type="number" min="0" value={criteria.minHours} onChange={e=>setCriteria(c=>({...c,minHours:e.target.value}))}/></Field><Field label="Horas máximas"><input type="number" min="0" value={criteria.maxHours} onChange={e=>setCriteria(c=>({...c,maxHours:e.target.value}))}/></Field>
        {showValues&&<><Field label="Valor mínimo (R$)"><input type="number" min="0" value={criteria.minValue} onChange={e=>setCriteria(c=>({...c,minValue:e.target.value}))}/></Field><Field label="Valor máximo (R$)"><input type="number" min="0" value={criteria.maxValue} onChange={e=>setCriteria(c=>({...c,maxValue:e.target.value}))}/></Field></>}
      </div></details>
      <div className="actions"><button className="button button--primary" onClick={()=>void refresh(criteria)}>Atualizar</button><button className="button" onClick={()=>{setCriteria({...blank,hoursMode});void refresh(blank);}}>Limpar filtros</button></div>
    </Card>
    <Card title={`Sessões e lacunas (${items.length})`} actions={selection.length>0?<div className="actions"><button className="button" disabled={selection.length!==1||!!sortedItems.find(s=>s.id===selection[0])?.virtual||['Em andamento','Pausada'].includes(sortedItems.find(s=>s.id===selection[0])?.status||'')} onClick={()=>{const item=sortedItems.find(s=>s.id===selection[0]);if(item)setLinking(item);}}>Vincular tarefa</button><button className="button" disabled={selection.length!==1||!!sortedItems.find(s=>s.id===selection[0])?.virtual} onClick={()=>{const item=sortedItems.find(s=>s.id===selection[0]);if(item&&!item.virtual)setHistorySession(item);}}>Histórico</button><button className="button" disabled={selection.length!==1||!!sortedItems.find(s=>s.id===selection[0])?.virtual||['Em andamento','Pausada'].includes(sortedItems.find(s=>s.id===selection[0])?.status||'')} onClick={()=>{const item=sortedItems.find(s=>s.id===selection[0]);if(item)onEdit(item);}}>Editar selecionada</button><button className="button button--danger" disabled={selection.length!==1||!!sortedItems.find(s=>s.id===selection[0])?.virtual||sortedItems.find(s=>s.id===selection[0])?.status==='Em andamento'||sortedItems.find(s=>s.id===selection[0])?.status==='Pausada'} onClick={()=>{const item=sortedItems.find(s=>s.id===selection[0]);if(item)onDelete(item);}}>Excluir selecionada</button><button className="button" disabled={!sortedItems.some(s=>!s.virtual&&selection.includes(s.id))} onClick={()=>{const chosen=sortedItems.filter(s=>!s.virtual&&selection.includes(s.id));onBatch(chosen,field,value);}}>Aplicar em lote</button></div>:undefined}>
      <details className="disclosure table-options"><summary>Ordenação</summary><SortControls label="Ordenar sessões por" value={criteria.sort} options={[{value:'recent',label:'Data e horário'},{value:'activity',label:'Atividade'},{value:'client',label:'Cliente'},{value:'project',label:'Projeto'},{value:'consultant',label:'Consultor'},{value:'focus',label:'Tempo de foco'},...(showValues?[{value:'value',label:'Custo'}]:[]),{value:'status',label:'Resultado'},{value:'category',label:'Categoria'}]} direction={criteria.direction} onValue={sort=>setCriteria(c=>({...c,sort}))} onDirection={direction=>setCriteria(c=>({...c,direction}))}/></details>
      {selection.length>0&&<div className="batch-bar"><span>{selection.length} selecionada(s)</span><select value={field} onChange={e=>setField(e.target.value as typeof field)}><option value="client">Cliente</option><option value="project">Projeto</option><option value="details">Detalhamento</option><option value="cardReference">Card/link</option></select><input aria-label="Novo valor do campo em lote" value={value} onChange={e=>setValue(e.target.value)}/></div>}
      {!sortedItems.length?<Empty>Nenhuma sessão encontrada. Ajuste os filtros.</Empty>:<div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Selecionar todas" checked={sortedItems.length>0&&selection.length===sortedItems.length} onChange={()=>setSelection(selection.length===sortedItems.length?[]:sortedItems.map(s=>s.id))}/></th>{['Cliente','Projeto','Consultor','Atividade','Detalhamento','Início','Término','Foco','Categoria',...(showValues?['Valor/hora','Custo']:[]),'Resultado'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{sortedItems.map(s=><tr key={s.id}><td><input type="checkbox" aria-label={`Selecionar ${s.activity}`} checked={selection.includes(s.id)} onChange={()=>toggle(s.id)}/></td><td><ClientMarker client={s.client} colors={colors}>{s.client||'Sem cliente'}</ClientMarker></td><td><ProjectMarker client={s.client} project={s.project} colors={colors}/></td><td>{s.consultant||'—'}</td><td>{s.activity}{conflictingIds.has(s.id)&&<small className="conflict-badge"> · Conflito de horário</small>}</td><td className="cell-details">{s.details||'—'}</td><td>{localDate(s.startAt)}</td><td>{localDate(endMode==='rounded'?(s.roundedEndAt??s.endAt):s.endAt)}</td><td className="numeric">{duration(seconds(s))}{hasUnknownPrecision(s)&&<small className="precision-badge">Legado · precisão indisponível</small>}</td><td><span className={`category-badge ${s.category==='Agenda'?'is-agenda':''}`}>{s.virtual?'—':s.category||'Normal'}</span></td>{showValues&&<><td className="numeric">{money(s.hourlyRate)}</td><td className="numeric">{money(cost(s))}</td></>}<td>{s.virtual?'A definir':<Status value={s.status}/>}</td></tr>)}</tbody></table></div>}
    </Card>
    {linking&&<SessionTaskDialog session={linking} tasks={tasks} onClose={()=>setLinking(null)} onSaved={async()=>{await onChanged?.();await refresh(applied);}}/>}
    {historySession&&!historySession.virtual&&<HistoryDialog entityType="session" entityId={historySession.id} title={historySession.activity} onClose={()=>setHistorySession(null)}/>}
  </div>;
}
