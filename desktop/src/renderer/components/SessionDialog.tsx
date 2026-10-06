import { DraftRecovery,clearDraft } from './DraftRecovery';
import { useMemo,useState } from 'react';
import { Dialog } from './Dialog';
import { Field } from './Field';
import { CatalogSelect } from './CatalogSelect';
import { ClientColorPreview } from './ClientMarker';
import { sessionConflicts } from '../conflicts';
import { ConflictReview } from './ConflictReview';
import { duration,hourInput } from '../format';
import { focusSecondsBetween,localDateTimeInput,localDateTimeIso } from '../sessionEditing';
import type { Catalogs,Color,Session } from '../types';

type Props={session:Session;history?:Session[];catalogs:Catalogs;colors?:Color[];showValues:boolean;onClose:()=>void;onSave:(input:Record<string,unknown>)=>Promise<void>};
type EditForm=Omit<Session,'startAt'|'endAt'|'hourlyRate'>&{startAt:string;endAt:string;hourlyRate:string};
type TextField='client'|'project'|'activity'|'consultant'|'details'|'cardReference'|'startAt'|'endAt'|'hourlyRate';

export function SessionDialog({session,history=[],catalogs,colors=[],showValues,onClose,onSave}:Props){
 const originalStart=localDateTimeInput(session.startAt),originalEnd=localDateTimeInput(session.endAt);
 const [form,setForm]=useState<EditForm>({...session,startAt:originalStart,endAt:originalEnd,hourlyRate:session.hourlyRate==null?'':String(session.hourlyRate)});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const timeChanged=form.startAt!==originalStart||form.endAt!==originalEnd;
 const [confirmed,setConfirmed]=useState('');
 const conflicts=useMemo(()=>sessionConflicts([{...session,startAt:timeChanged?form.startAt:session.startAt,endAt:timeChanged?form.endAt||null:session.endAt,workIntervals:timeChanged?[]:session.workIntervals},...history.filter(s=>s.id!==session.id)]).filter(c=>c.first.id===session.id),[session,history,form.startAt,form.endAt,timeChanged]);
 const conflictKey=JSON.stringify([form.startAt,form.endAt,conflicts.map(c=>[c.second.id,c.spans])]);
 const focusPreview=useMemo(()=>{
  if(!timeChanged||!form.endAt)return form.focusSeconds;
  try{return focusSecondsBetween(form.startAt,form.endAt);}catch{return null;}
 },[timeChanged,form.startAt,form.endAt,form.focusSeconds]);
 const update=(key:TextField,value:string)=>{if(key==='startAt'||key==='endAt')setConfirmed('');setForm(current=>({...current,[key]:value}));};
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();setError('');
  try{
   if(!form.activity.trim())throw new Error('Informe a atividade.');
   if(!form.startAt)throw new Error('Informe o início.');
   if(conflicts.length&&confirmed!==conflictKey)throw new Error('Confirme a manutenção da sobreposição ou ajuste os horários.');
   const focusSeconds=timeChanged&&form.endAt?focusSecondsBetween(form.startAt,form.endAt):form.focusSeconds;
   setBusy(true);
   await onSave({...form,startAt:form.startAt===originalStart?session.startAt:localDateTimeIso(form.startAt),endAt:form.endAt===originalEnd?session.endAt:form.endAt?localDateTimeIso(form.endAt):null,focusSeconds,hourlyRate:hourInput(form.hourlyRate)});clearDraft(`session.${session.id}`);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}
 };
 return <Dialog title="Editar apontamento" onClose={onClose}><form className="dialog-form" onSubmit={save}><DraftRecovery id={`session.${session.id}`} value={form} onRecover={setForm}/>
  <div className="form-grid form-grid--two">
   <CatalogSelect label="Cliente" optional value={form.client} options={catalogs.items.clients} onChange={value=>update('client',value)} preview={<ClientColorPreview client={form.client} colors={colors}/>}/>
   <CatalogSelect label="Projeto" optional value={form.project} options={catalogs.items.projects} onChange={value=>update('project',value)}/>
   <CatalogSelect label="Atividade" required value={form.activity} options={catalogs.items.activities} onChange={value=>update('activity',value)}/>
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
  {!!conflicts.length&&<><ConflictReview conflicts={conflicts}/><label className="check-row"><input type="checkbox" checked={confirmed===conflictKey} onChange={e=>setConfirmed(e.target.checked?conflictKey:'')}/> Confirmo manter a sobreposição destes horários</label></>}
  {error&&<p className="message message--error" role="alert">{error}</p>}
  <div className="dialog__footer"><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}>Salvar alterações</button></div>
 </form></Dialog>;
}
