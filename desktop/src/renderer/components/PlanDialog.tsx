import { DraftRecovery,clearDraft } from './DraftRecovery';
import { useState } from 'react';
import { request,safeMessage } from '../api';
import { planInput,taskStates,type Plan } from '../planning';
import type { Task } from '../types';
import { Dialog } from './Dialog';
import { Field } from './Field';

export function PlanDialog({task,plan,onClose,onSaved}:{task:Task;plan?:Plan;onClose:()=>void;onSaved:()=>Promise<void>}){
 const [form,setForm]=useState(()=>planInput(task,plan)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <Dialog title={`Planejar · ${task.activity}`} onClose={onClose}><form className="dialog-form" onSubmit={async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{await request(`/api/planning/plans/${task.id}`,'PUT',form);clearDraft(`plan.${task.id}`);await onSaved();onClose();}catch(e){setError(safeMessage(e));}finally{setBusy(false);}
 }}><DraftRecovery id={`plan.${task.id}`} value={form} onRecover={setForm}/><p className="muted">O planejamento organiza sua execução e não altera o prazo de entrega.</p>
 <div className="form-grid form-grid--two">
  <Field label="Data de planejamento"><input type="date" value={form.plannedDate||''} onChange={e=>setForm({...form,plannedDate:e.target.value||null,priority:e.target.value?form.priority:false})}/></Field>
  <Field label="Estado da tarefa"><select value={form.state} onChange={e=>setForm({...form,state:e.target.value,priority:['Concluída','Aguardando'].includes(e.target.value)?false:form.priority})}>{taskStates.map(s=><option key={s}>{s}</option>)}</select></Field>
  <Field label="Próxima ação"><textarea maxLength={1000} rows={3} placeholder="Qual é o próximo passo concreto?" value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})}/></Field>
  <Field label="Aguardando quem ou o quê"><input maxLength={200} value={form.waitingFor} onChange={e=>setForm({...form,waitingFor:e.target.value})}/></Field>
  <Field label="Revisar pendência em"><input type="date" value={form.reviewDate||''} onChange={e=>setForm({...form,reviewDate:e.target.value||null})}/></Field>
 </div><label className="planning-check"><input type="checkbox" checked={form.priority} disabled={!form.plannedDate||['Concluída','Aguardando'].includes(form.state)} onChange={e=>setForm({...form,priority:e.target.checked})}/>Uma das três prioridades do dia</label>
 {error&&<p role="alert" className="message message--error">{error}</p>}
 <div className="dialog__footer"><button type="button" className="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}>Salvar planejamento</button></div>
 </form></Dialog>;
}
