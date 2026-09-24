import { useMemo,useState } from 'react';
import { Dialog } from './Dialog';
import { Field } from './Field';
import { ClientColorPreview } from './ClientMarker';
import { duration,hourInput } from '../format';
import { focusSecondsBetween,localDateTimeInput,localDateTimeIso } from '../sessionEditing';
import type { Color,Session } from '../types';

type Props={session:Session;colors?:Color[];showValues:boolean;onClose:()=>void;onSave:(input:Record<string,unknown>)=>Promise<void>};
type EditForm=Omit<Session,'startAt'|'endAt'|'hourlyRate'>&{startAt:string;endAt:string;hourlyRate:string};
type TextField='client'|'project'|'activity'|'consultant'|'details'|'cardReference'|'startAt'|'endAt'|'hourlyRate';

export function SessionDialog({session,colors=[],showValues,onClose,onSave}:Props){
 const originalStart=localDateTimeInput(session.startAt),originalEnd=localDateTimeInput(session.endAt);
 const [form,setForm]=useState<EditForm>({...session,startAt:originalStart,endAt:originalEnd,hourlyRate:session.hourlyRate==null?'':String(session.hourlyRate)});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const timeChanged=form.startAt!==originalStart||form.endAt!==originalEnd;
 const focusPreview=useMemo(()=>{
  if(!timeChanged||!form.endAt)return form.focusSeconds;
  try{return focusSecondsBetween(form.startAt,form.endAt);}catch{return null;}
 },[timeChanged,form.startAt,form.endAt,form.focusSeconds]);
 const update=(key:TextField,value:string)=>setForm(current=>({...current,[key]:value}));
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();setError('');
  try{
   if(!form.activity.trim())throw new Error('Informe a atividade.');
   if(!form.startAt)throw new Error('Informe o início.');
   const focusSeconds=timeChanged&&form.endAt?focusSecondsBetween(form.startAt,form.endAt):form.focusSeconds;
   setBusy(true);
   await onSave({...form,startAt:form.startAt===originalStart?session.startAt:localDateTimeIso(form.startAt),endAt:form.endAt===originalEnd?session.endAt:form.endAt?localDateTimeIso(form.endAt):null,focusSeconds,hourlyRate:hourInput(form.hourlyRate)});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}
 };
 return <Dialog title="Editar apontamento" onClose={onClose}><form className="dialog-form" onSubmit={save}>
  <div className="form-grid form-grid--two">
   <Field label="Cliente"><input maxLength={200} value={form.client} onChange={e=>update('client',e.target.value)}/><ClientColorPreview client={form.client} colors={colors}/></Field>
   <Field label="Projeto"><input maxLength={200} value={form.project} onChange={e=>update('project',e.target.value)}/></Field>
   <Field label="Atividade"><input maxLength={200} value={form.activity} onChange={e=>update('activity',e.target.value)}/></Field>
   <Field label="Categoria do apontamento"><select value={form.category} onChange={e=>setForm(current=>({...current,category:e.target.value as Session['category']}))}><option value="Normal">Normal</option><option value="Agenda">Agenda</option></select></Field>
   <Field label="Consultor"><input maxLength={200} value={form.consultant} onChange={e=>update('consultant',e.target.value)}/></Field>
   <Field label="Detalhamento"><textarea maxLength={1000} rows={3} value={form.details} onChange={e=>update('details',e.target.value)}/></Field>
   <Field label="Card/link"><input maxLength={500} value={form.cardReference} onChange={e=>update('cardReference',e.target.value)}/></Field>
   <Field label="Início"><input type="datetime-local" value={form.startAt} onChange={e=>update('startAt',e.target.value)}/></Field>
   <Field label="Término"><input type="datetime-local" value={form.endAt} onChange={e=>update('endAt',e.target.value)}/></Field>
   <Field label="Tempo de foco"><input value={focusPreview==null?'—':duration(focusPreview)} readOnly/></Field>
   {showValues&&<Field label="Valor por hora"><input inputMode="decimal" value={form.hourlyRate} onChange={e=>update('hourlyRate',e.target.value)}/></Field>}
   <Field label="Resultado"><select value={form.status} onChange={e=>setForm(current=>({...current,status:e.target.value as Session['status']}))}>{['Em andamento','Pausada','Concluída','Encerrada','Interrompida'].map(s=><option key={s}>{s}</option>)}</select></Field>
  </div>
  {error&&<p className="message message--error" role="alert">{error}</p>}
  <div className="dialog__footer"><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}>Salvar alterações</button></div>
 </form></Dialog>;
}
