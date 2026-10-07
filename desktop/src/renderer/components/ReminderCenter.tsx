import { useEffect,useState } from 'react';
import type { WorkflowStatus } from '../types';
import { safeMessage } from '../api';

export function ReminderCenter(){
 const [status,setStatus]=useState<WorkflowStatus|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let mounted=true;void window.foco.workflowStatus?.().then(value=>{if(mounted)setStatus(value);}).catch(error=>{if(mounted)setError(safeMessage(error));});const off=window.foco.onWorkflowStatus?.(setStatus);return()=>{mounted=false;off?.();};},[]);
 if(!status?.pending.length&&!status?.silencedToday&&!error)return null;
 return <aside className="reminder-center print-hide" aria-label="Lembretes locais">{status?.silencedToday&&<p role="status">Lembretes silenciados até o fim do dia.</p>}{status?.pending.map(({kind,day})=><div key={kind}><p><strong>{kind==='planning'?'Planejar o dia':'Revisar o dia'}</strong> · {day}</p><div className="actions">{([['open',kind==='planning'?'Abrir planejamento':'Abrir fechamento'],['snooze','Adiar 15 minutos'],['dismiss','Dispensar'],['silence','Silenciar hoje']] as const).map(([action,label])=><button key={action} className="button" disabled={busy} onClick={()=>{setBusy(true);setError('');void window.foco.workflowAction(kind,action).then(setStatus).catch(error=>setError(safeMessage(error))).finally(()=>setBusy(false));}}>{label}</button>)}</div></div>)}{error&&<p role="alert">{error}</p>}</aside>;
}
