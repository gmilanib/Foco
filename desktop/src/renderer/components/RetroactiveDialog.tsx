import { useMemo,useState,type FormEvent } from 'react';
import { Dialog } from './Dialog';
import { Field } from './Field';
import { ClientColorPreview } from './ClientMarker';
import { duration,hourInput } from '../format';
import { buildFillSuggestions,valuesFor,type FillSuggestion,type SuggestionField } from '../fillSuggestions';
import { localDateTimeIso } from '../sessionEditing';
import { effectiveFocusMinutes,intervalMinutes,overlappingSessions } from '../retroactive';
import type { Draft } from '../pages/FocusPage';
import type { Color,Session,Task } from '../types';

type Result='Concluída'|'Encerrada'|'Interrompida';
type Form=FillSuggestion&{details:string;taskId:string;startAt:string;endAt:string;status:Result;category:'Normal'|'Agenda'};
type Props={initial:Draft;history:Session[];tasks:Task[];colors?:Color[];defaultRate:string;showValues:boolean;onClose:()=>void;onSave:(input:Record<string,unknown>)=>Promise<void>};

export function RetroactiveDialog({initial,history,tasks,colors=[],defaultRate,showValues,onClose,onSave}:Props){
 const [form,setForm]=useState<Form>({client:initial.client,project:initial.project,activity:initial.activity,details:initial.details,consultant:initial.consultant,cardReference:initial.cardReference,hourlyRate:initial.hourlyRate||defaultRate,taskId:'',startAt:'',endAt:'',status:'Concluída',category:'Normal'});
 const [manual,setManual]=useState<{hours:string;minutes:string}|null>(null);
 const [allowOverlap,setAllowOverlap]=useState(false);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const suggestions=useMemo(()=>buildFillSuggestions(history,tasks),[history,tasks]);
 const interval=intervalMinutes(form.startAt,form.endAt);
 const hours=manual?.hours??(interval==null?'':String(Math.floor(interval/60)));
 const minutes=manual?.minutes??(interval==null?'':String(interval%60));
 const overlaps=useMemo(()=>overlappingSessions(history,form.startAt,form.endAt),[history,form.startAt,form.endAt]);
 const setText=(key:keyof Form,value:string)=>setForm(current=>({...current,[key]:value}));
 const applySuggestion=(field:SuggestionField,value:string)=>setForm(current=>({...current,[field]:value}));
 const list=(field:SuggestionField)=><datalist id={`retro-suggestions-${field}`}>{valuesFor(suggestions,field,form[field]).map(value=><option key={value} value={value}/>)}</datalist>;
 const chooseTask=(id:string)=>{
  const task=tasks.find(item=>item.id===id);
  setForm(current=>task?{...current,taskId:id,client:current.client||task.client,project:current.project||task.project,activity:current.activity||task.activity,details:current.details||task.details,consultant:current.consultant||task.consultant,cardReference:current.cardReference||task.cardReference,hourlyRate:task.hourlyRate==null?current.hourlyRate:task.hourlyRate.toLocaleString('pt-BR',{maximumFractionDigits:2})}:{...current,taskId:''});
 };
 const save=async(event:FormEvent)=>{
  event.preventDefault();setError('');
  try{
   if(!form.activity.trim())throw new Error('Informe a atividade.');
   if(!form.startAt||!form.endAt)throw new Error('Informe início e término.');
   if(interval==null||interval<1)throw new Error('O término deve ocorrer depois do início.');
   if(new Date(form.endAt).getTime()>Date.now())throw new Error('O término retroativo não pode estar no futuro.');
   const focusMinutes=effectiveFocusMinutes(hours,minutes,interval);
   if(overlaps.length&&!allowOverlap)throw new Error('Confirme a sobreposição antes de salvar.');
   setBusy(true);
   await onSave({...form,taskId:form.taskId||null,startAt:localDateTimeIso(form.startAt),endAt:localDateTimeIso(form.endAt),focusMinutes,hourlyRate:hourInput(form.hourlyRate)});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}
 };
 return <Dialog title="Lançamento retroativo" onClose={onClose}><form className="dialog-form" onSubmit={save}>
  <p className="muted">Registre horas trabalhadas enquanto o Foco estava indisponível. O registro aparecerá nos relatórios e no dashboard.</p>
  <div className="form-grid form-grid--two">
   <Field label="Tarefa (opcional)"><select value={form.taskId} onChange={e=>chooseTask(e.target.value)}><option value="">Sem tarefa vinculada</option>{tasks.map(task=><option key={task.id} value={task.id}>{[task.client,task.project,task.activity].filter(Boolean).join(' / ')}{task.completed?' (concluída)':''}</option>)}</select></Field>
   <Field label="Cliente"><input list="retro-suggestions-client" maxLength={200} value={form.client} onChange={e=>applySuggestion('client',e.target.value)}/>{list('client')}<ClientColorPreview client={form.client} colors={colors}/></Field>
   <Field label="Projeto"><input list="retro-suggestions-project" maxLength={200} value={form.project} onChange={e=>applySuggestion('project',e.target.value)}/>{list('project')}</Field>
   <Field label="Atividade *"><input list="retro-suggestions-activity" maxLength={200} value={form.activity} onChange={e=>applySuggestion('activity',e.target.value)}/>{list('activity')}</Field>
   <Field label="Categoria do apontamento"><select value={form.category} onChange={e=>setForm(current=>({...current,category:e.target.value as Form['category']}))}><option value="Normal">Normal</option><option value="Agenda">Agenda</option></select></Field>
   <Field label="Detalhamento"><textarea rows={2} maxLength={1000} value={form.details} onChange={e=>setText('details',e.target.value)}/></Field>
   <Field label="Consultor solicitante"><input list="retro-suggestions-consultant" maxLength={200} value={form.consultant} onChange={e=>applySuggestion('consultant',e.target.value)}/>{list('consultant')}</Field>
   <Field label="Card/link"><input list="retro-suggestions-cardReference" maxLength={500} value={form.cardReference} onChange={e=>applySuggestion('cardReference',e.target.value)}/>{list('cardReference')}</Field>
   <Field label="Início *"><input type="datetime-local" required value={form.startAt} onChange={e=>{setText('startAt',e.target.value);setAllowOverlap(false);}}/></Field>
   <Field label="Término *"><input type="datetime-local" required value={form.endAt} onChange={e=>{setText('endAt',e.target.value);setAllowOverlap(false);}}/></Field>
   <Field label="Horas de foco"><input type="number" min="0" step="1" value={hours} onChange={e=>setManual({hours:e.target.value,minutes})}/></Field>
   <Field label="Minutos de foco"><input type="number" min="0" max="59" step="1" value={minutes} onChange={e=>setManual({hours,minutes:e.target.value})}/></Field>
   {showValues&&<Field label="Valor por hora (R$)"><input inputMode="decimal" value={form.hourlyRate} onChange={e=>setText('hourlyRate',e.target.value)}/></Field>}
   <Field label="Resultado"><select value={form.status} onChange={e=>setForm(current=>({...current,status:e.target.value as Result}))}>{(['Concluída','Encerrada','Interrompida'] as const).map(status=><option key={status}>{status}</option>)}</select></Field>
  </div>
  <p className="muted">Intervalo informado: {interval==null?'informe horários válidos':duration(interval*60)}. {manual&&<button type="button" className="button button--quiet" onClick={()=>setManual(null)}>Usar intervalo completo</button>}</p>
  {overlaps.length>0&&<label className="check-row"><input type="checkbox" checked={allowOverlap} onChange={e=>setAllowOverlap(e.target.checked)}/> O período coincide com {overlaps.length} apontamento(s). Confirmo o lançamento mesmo assim.</label>}
  {error&&<p className="message message--error" role="alert">{error}</p>}
  <div className="dialog__footer"><button type="button" className="button" onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}>Salvar lançamento</button></div>
 </form></Dialog>;
}
