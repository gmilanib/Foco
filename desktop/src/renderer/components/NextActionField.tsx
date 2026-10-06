import { useEffect,useState } from 'react';
import { request,safeMessage } from '../api';
import type { Plan } from '../planning';
import { Field } from './Field';
import { DraftRecovery } from './DraftRecovery';

export function NextActionField({taskId,onChange}:{taskId:string;onChange:(value:string|undefined)=>void}){
 const [value,setValue]=useState(''),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;onChange(undefined);setLoaded(false);setError('');
  request<Plan[]>('/api/planning/plans').then(plans=>{if(alive){const text=plans.find(p=>p.taskId===taskId)?.nextAction||'';setValue(text);setLoaded(true);}}).catch(e=>{if(alive)setError(safeMessage(e));});
  return()=>{alive=false;};
 },[taskId,retry]);
 const change=(text:string)=>{setValue(text);onChange(text);};
 return <>{error&&<p role="alert">{error} <button type="button" className="button" onClick={()=>setRetry(v=>v+1)}>Recarregar próxima ação</button></p>}
 {loaded&&<DraftRecovery id={`next-action.${taskId}`} value={value} onRecover={change}/>}
 <Field label="Próxima ação (opcional)"><textarea disabled={!loaded} rows={3} maxLength={1000} value={value} onChange={e=>change(e.target.value)}/></Field>
 <p className="muted">A anotação pertence à tarefa que está sendo encerrada. Sem edição, a próxima ação existente é preservada.</p></>;
}
