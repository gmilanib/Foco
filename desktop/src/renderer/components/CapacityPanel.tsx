import { useEffect,useState } from 'react';
import { request,safeMessage } from '../api';
import type { Task } from '../types';
import type { Plan } from '../planning';
import { Card,Field } from './Field';

type Estimate={taskId:string;minutes:number};
export function capacitySummary(tasks:Task[],plans:Plan[],estimates:Estimate[],day:string){
 const selected=tasks.filter(t=>!t.completed&&t.state!=='Aguardando'&&plans.some(p=>p.taskId===t.id&&p.plannedDate===day));
 const values=new Map(estimates.map(e=>[e.taskId,e.minutes]));
 return {minutes:selected.reduce((total,t)=>total+(values.get(t.id)||0),0),missing:selected.filter(t=>!values.has(t.id)).length};
}
export function CapacityPanel({day,tasks,plans}:{day:string;tasks:Task[];plans:Plan[]}){
 const [estimates,setEstimates]=useState<Estimate[]>([]),[capacity,setCapacity]=useState('480'),[savedCapacity,setSavedCapacity]=useState(480),[taskId,setTaskId]=useState(''),[minutes,setMinutes]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=async()=>{setError('');try{const [e,s]=await Promise.all([request<Estimate[]>('/api/planning/estimates'),request<Record<string,string>>('/api/settings')]);setEstimates(Array.isArray(e)?e:[]);const c=s['planning.capacityMinutes']||'480';setCapacity(c);setSavedCapacity(Number(c));setLoaded(true);}catch(e){setError(safeMessage(e));}};
 useEffect(()=>{void load();},[]);
 const summary=capacitySummary(tasks,plans,estimates,day);
 const save=async(kind:'capacity'|'estimate')=>{
  if(busy)return;setBusy(true);setError('');setMessage('');
  try{
   if(kind==='capacity'){
    const value=Number(capacity);if(capacity===''||!Number.isInteger(value)||value<0||value>1440)throw new Error('Informe capacidade inteira entre 0 e 1440 minutos.');
    await request('/api/settings','PUT',{'planning.capacityMinutes':String(value)});setSavedCapacity(value);
   }else{
    const value=minutes===''?null:Number(minutes);if(!taskId||value!==null&&(!Number.isInteger(value)||value<1||value>100000))throw new Error('Escolha uma tarefa e informe entre 1 e 100000 minutos, ou deixe vazio.');
    await request(`/api/planning/estimates/${taskId}`,'PUT',{minutes:value});setEstimates(rows=>[...rows.filter(e=>e.taskId!==taskId),...(value===null?[]:[{taskId,minutes:value}])]);
   }setMessage(kind==='capacity'?'Capacidade salva.':'Estimativa salva.');
  }catch(e){setError(safeMessage(e));}finally{setBusy(false);}
 };
 return <Card title="Estimativas e capacidade do dia">
  <p className="muted">Estime o trabalho total de cada tarefa. A soma considera tarefas abertas e disponíveis planejadas para o dia; não desconta horas já apontadas. A capacidade padrão vale para qualquer dia.</p>
  {loaded&&<><p><strong>{summary.minutes} min estimados / {savedCapacity} min disponíveis</strong></p>{summary.minutes>savedCapacity&&<p role="status" className="message">Sobrecarga de {summary.minutes-savedCapacity} min. Você pode continuar planejando.</p>}{summary.missing>0&&<p>{summary.missing} tarefa(s) sem estimativa; o total está incompleto.</p>}</>}
  <div className="form-grid form-grid--two"><Field label="Capacidade diária (minutos)"><input type="number" min="0" max="1440" step="1" value={capacity} onChange={e=>setCapacity(e.target.value)}/></Field><button className="button" disabled={busy||!loaded} onClick={()=>void save('capacity')}>Salvar capacidade</button>
   <Field label="Tarefa para estimar"><select value={taskId} onChange={e=>{setTaskId(e.target.value);setMinutes(String(estimates.find(x=>x.taskId===e.target.value)?.minutes||''));}}><option value="">Escolha uma tarefa</option>{tasks.filter(t=>!t.completed).map(t=><option key={t.id} value={t.id}>{[t.activity,t.client,t.project,t.details].filter(Boolean).join(' · ')}</option>)}</select></Field>
   <Field label="Estimativa da tarefa (minutos)"><input type="number" min="1" max="100000" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="Sem estimativa"/></Field></div>
  <button className="button" disabled={busy||!loaded||!taskId} onClick={()=>void save('estimate')}>Salvar estimativa</button><p className="muted">Deixe a estimativa vazia para removê-la.</p>
  {error&&<p role="alert">{error} <button className="button" onClick={()=>void load()}>Recarregar estimativas</button></p>}{message&&<p role="status">{message}</p>}
 </Card>;
}
