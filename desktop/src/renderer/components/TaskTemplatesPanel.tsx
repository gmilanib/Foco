import { DraftRecovery,clearDraft } from './DraftRecovery';
import { useRef,useState } from 'react';
import { request,safeMessage } from '../api';
import { isoDay } from '../format';
import type { TaskTemplate } from '../planning';
import type { Task } from '../types';
import { Card,Empty,Field } from './Field';
import { Dialog } from './Dialog';
import { RecurrenceFields,recurrenceLabels,type TemplateForm } from './RecurrenceFields';

const blank=():TemplateForm=>({sourceId:'',name:'',recurrence:'none',nextDate:isoDay(new Date()),paused:false,weekdays:[1],monthDay:new Date().getDate()});
export const templateInput=(t:TaskTemplate)=>({sourceId:t.sourceId,name:t.name,recurrence:t.recurrence,nextDate:t.nextDate,paused:!!t.paused,weekdays:t.weekdays||[],monthDay:t.monthDay??null});
export function TaskTemplatesPanel({templates,tasks,onChanged}:{templates:TaskTemplate[];tasks:Task[];onChanged:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<TaskTemplate|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[removing,setRemoving]=useState<TaskTemplate|null>(null);
 const [form,setForm]=useState<TemplateForm>(blank);
 const lock=useRef(false);
 const act=async(work:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await work();await onChanged();}catch(e){setError(safeMessage(e));}finally{lock.current=false;setBusy(false);}};
 const edit=(template:TaskTemplate|null)=>{setError('');setEditing(template);setForm(template?{...templateInput(template),nextDate:template.nextDate||isoDay(new Date()),monthDay:template.monthDay||new Date().getDate()}:blank());setOpen(true);};
 const draftKey=`template.${editing?.id||'new'}`;
 return <Card title="Modelos e recorrência" actions={<button className="button" disabled={busy} onClick={()=>edit(null)}>Novo modelo</button>}>
  <p className="muted">A geração é manual: cria uma tarefa por modelo vencido, planejada para hoje, e avança até a próxima ocorrência futura. Modelos pausados ou com origem arquivada não geram tarefas previstas. Pausar não impede o uso manual de uma origem disponível.</p>
  <button className="button button--primary" disabled={busy} onClick={()=>void act(async()=>{const created=await request<Task[]>('/api/planning/templates/generate','POST');setMessage(`${created.length} tarefa(s) criada(s) para hoje.`);})}>Criar tarefas previstas</button>
  {error&&!open&&<p role="alert" className="message message--error">{error}</p>}{message&&<p role="status">{message}</p>}
  {!templates.length?<Empty>Crie um modelo a partir de uma tarefa existente.</Empty>:<ul className="planning-list">{templates.map(t=><li key={t.id}><span><strong>{t.name}</strong><small>{recurrenceLabels[t.recurrence]}{t.paused?' · Pausado':''}{t.sourceArchived?' · Origem arquivada':''}{t.nextDate?` · Próxima: ${new Date(`${t.nextDate}T12:00:00`).toLocaleDateString('pt-BR')}`:''}{t.recurrence==='weekdays'?` · Dias: ${(t.weekdays||[]).map(day=>['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][day-1]).join(', ')}`:''}{t.recurrence==='monthly'?` · Dia ${t.monthDay}`:''}</small></span><div className="actions"><button className="button" disabled={busy||t.sourceArchived} onClick={()=>void act(async()=>{await request(`/api/planning/templates/${t.id}/use`,'POST');setMessage('Tarefa criada. Escolha quando executá-la em Planejar tarefas.');})}>Usar modelo</button><button className="button" disabled={busy} onClick={()=>edit(t)}>Editar modelo</button><button className="button" disabled={busy} onClick={()=>void act(async()=>{await request(`/api/planning/templates/${t.id}`,'PUT',{...templateInput(t),paused:!t.paused});})}>{t.paused?'Retomar recorrência':'Pausar recorrência'}</button><button className="button button--quiet" disabled={busy} onClick={()=>setRemoving(t)}>Remover modelo</button></div></li>)}</ul>}
  {open&&<Dialog title={editing?'Editar modelo':'Novo modelo'} onClose={()=>{if(!busy)setOpen(false);}}><form className="dialog-form" onSubmit={e=>{e.preventDefault();void act(async()=>{await request(editing?`/api/planning/templates/${editing.id}`:'/api/planning/templates',editing?'PUT':'POST',{...form,nextDate:form.recurrence==='none'?null:form.nextDate,weekdays:form.recurrence==='weekdays'?form.weekdays:[],monthDay:form.recurrence==='monthly'?form.monthDay:null});clearDraft(draftKey);setOpen(false);});}}><DraftRecovery key={draftKey} id={draftKey} value={form} onRecover={setForm}/><div className="form-grid form-grid--two">
   <Field label="Tarefa de origem"><select required value={form.sourceId} onChange={e=>setForm({...form,sourceId:e.target.value})}><option value="">Selecione…</option>{editing&&!tasks.some(t=>t.id===editing.sourceId)&&<option value={editing.sourceId}>Origem arquivada (restaure para usar)</option>}{tasks.map(t=><option key={t.id} value={t.id}>{[t.client,t.project,t.activity,t.details].filter(Boolean).join(' · ')}</option>)}</select></Field>
   <Field label="Nome do modelo"><input required maxLength={200} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
   <RecurrenceFields form={form} onChange={setForm}/>
  </div><p className="muted">Dias úteis e específicos exigem uma próxima data em um dos dias escolhidos. A frequência mensal exige uma data correspondente ao dia do mês.</p>{error&&<p role="alert">{error}</p>}<div className="dialog__footer"><button type="button" className="button" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button><button className="button button--primary" disabled={busy}>Salvar modelo</button></div></form></Dialog>}
  {removing&&<Dialog title="Remover modelo" onClose={()=>{if(!busy)setRemoving(null);}}><p>Remover “{removing.name}”? As tarefas já criadas serão preservadas.</p><div className="dialog__footer"><button className="button" disabled={busy} onClick={()=>setRemoving(null)}>Cancelar</button><button className="button button--danger" disabled={busy} onClick={()=>void act(async()=>{await request(`/api/planning/templates/${removing.id}`,'DELETE');setRemoving(null);})}>Confirmar remoção</button></div></Dialog>}
 </Card>;
}
