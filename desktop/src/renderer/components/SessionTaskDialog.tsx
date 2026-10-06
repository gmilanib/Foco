import { useState } from 'react';
import { request,safeMessage } from '../api';
import { Dialog } from './Dialog';
import { Field } from './Field';
import type { Session,Task } from '../types';

export function SessionTaskDialog({session,tasks,onClose,onSaved}:{session:Session;tasks:Task[];onClose:()=>void;onSaved:()=>Promise<void>|void}){
 const [taskId,setTaskId]=useState(session.taskId||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{setBusy(true);setError('');try{
  await request(`/api/sessions/${encodeURIComponent(session.id)}/task`,'PUT',{taskId:taskId||null});
  await onSaved();onClose();
 }catch(e){setError(safeMessage(e));}finally{setBusy(false);}};
 return <Dialog title="Vincular tarefa" onClose={()=>{if(!busy)onClose();}}>
  <p>Apontamento: <strong>{session.activity}</strong> · {new Date(session.startAt).toLocaleString('pt-BR')}</p>
  <p>O vínculo atualiza os totais das tarefas e fica registrado no histórico. Os horários, a classificação e o valor por hora do apontamento são preservados.</p>
  <Field label="Tarefa vinculada"><select value={taskId} disabled={busy} onChange={e=>setTaskId(e.target.value)}><option value="">Sem tarefa vinculada</option>{tasks.map(task=><option key={task.id} value={task.id}>{[task.client,task.project,task.activity,task.details].filter(Boolean).join(' / ')}{task.completed?' (concluída)':''}</option>)}</select></Field>
  {error&&<p role="alert">{error}</p>}
  <div className="dialog__footer"><button className="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy} onClick={()=>void save()}>Salvar vínculo</button></div>
 </Dialog>;
}
