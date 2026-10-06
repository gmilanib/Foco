import { DraftRecovery,clearDraft } from './DraftRecovery';
import { useMemo,useState,type FormEvent,type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { ConflictingSessions } from './ConflictingSessions';
import { Field } from './Field';
import { CatalogSelect } from './CatalogSelect';
import { ClientColorPreview } from './ClientMarker';
import { duration,hourInput } from '../format';
import { buildFillSuggestions,valuesFor,type FillSuggestion,type SuggestionField } from '../fillSuggestions';
import { localDateTimeIso } from '../sessionEditing';
import { effectiveFocusMinutes,intervalMinutes,overlappingSessions } from '../retroactive';
import type { Draft } from '../pages/FocusPage';
import type { Catalogs,Color,Session,Task } from '../types';

type Result='Concluída'|'Encerrada'|'Interrompida';
export type RetroactivePreset={startAt:string;endAt:string;focusMinutes:number};
type Form=FillSuggestion&{details:string;taskId:string;startAt:string;endAt:string;status:Result;category:'Normal'|'Agenda'};
export type RetroactiveClassification=Partial<Omit<Form,'startAt'|'endAt'>>;
type Props={classification?:RetroactiveClassification;navigation?:(busy:boolean)=>ReactNode;initial:Draft;history:Session[];tasks:Task[];catalogs:Catalogs;colors?:Color[];defaultRate:string;showValues:boolean;preset?:RetroactivePreset|null;onClose:()=>void;onSave:(input:Record<string,unknown>)=>Promise<void>};

const suggestedInterval=()=>{const end=new Date(),start=new Date(end.getTime()-3600000);const local=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;return{startAt:local(start),endAt:local(end)};};
const localInput=(value:string)=>{const date=new Date(value),local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,23);};

export function RetroactiveDialog({initial,history,tasks,catalogs,colors=[],defaultRate,showValues,preset,classification,navigation,onClose,onSave}:Props){
 const [form,setForm]=useState<Form>({...suggestedInterval(),...(preset?{startAt:localInput(preset.startAt),endAt:localInput(preset.endAt)}:{}),client:initial.client,project:initial.project,activity:initial.activity,details:initial.details,consultant:initial.consultant,cardReference:initial.cardReference,hourlyRate:initial.hourlyRate||defaultRate,taskId:'',status:'Concluída',category:'Normal',...classification});
 const [manual,setManual]=useState<{hours:string;minutes:string}|null>(preset?{hours:String(Math.floor(preset.focusMinutes/60)),minutes:String(preset.focusMinutes%60)}:null);
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
   await onSave({...form,taskId:form.taskId||null,startAt:localDateTimeIso(form.startAt),endAt:localDateTimeIso(form.endAt),focusMinutes,hourlyRate:hourInput(form.hourlyRate)});clearDraft(`retro.${preset?.startAt||'new'}`);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}
 };
 return <Dialog title="Lançamento retroativo" onClose={()=>{if(!busy)onClose();}}><form className="dialog-form" onSubmit={save}><DraftRecovery id={`retro.${preset?.startAt||'new'}`} value={{form,manualHours:manual?.hours??'',manualMinutes:manual?.minutes??'',manualEnabled:manual!==null}} onRecover={v=>{setForm(v.form);setManual(v.manualEnabled?{hours:v.manualHours,minutes:v.manualMinutes}:null);setAllowOverlap(false);}}/>
  {navigation?.(busy)}
  <p className="muted">Registre horas trabalhadas enquanto o Foco estava indisponível. O registro aparecerá nos relatórios e no dashboard.</p>
  <div className="form-grid form-grid--two">
   <Field label="Tarefa (opcional)"><select value={form.taskId} onChange={e=>chooseTask(e.target.value)}><option value="">Sem tarefa vinculada</option>{tasks.map(task=><option key={task.id} value={task.id}>{[task.client,task.project,task.activity].filter(Boolean).join(' / ')}{task.completed?' (concluída)':''}</option>)}</select></Field>
   <CatalogSelect label="Cliente" optional value={form.client} options={catalogs.items.clients} onChange={value=>setText('client',value)} preview={<ClientColorPreview client={form.client} colors={colors}/>}/>
   <CatalogSelect label="Projeto" optional value={form.project} options={catalogs.items.projects} onChange={value=>setText('project',value)}/>
   <CatalogSelect label="Atividade *" required value={form.activity} options={catalogs.items.activities} onChange={value=>setText('activity',value)}/>
   <Field label="Categoria do apontamento"><select value={form.category} onChange={e=>setForm(current=>({...current,category:e.target.value as Form['category']}))}><option value="Normal">Normal</option><option value="Agenda">Agenda</option></select></Field>
   <Field label="Detalhamento"><textarea rows={2} maxLength={1000} value={form.details} onChange={e=>setText('details',e.target.value)}/></Field>
   <Field label="Consultor solicitante"><input list="retro-suggestions-consultant" maxLength={200} value={form.consultant} onChange={e=>applySuggestion('consultant',e.target.value)}/>{list('consultant')}</Field>
   <Field label="Card/link"><input list="retro-suggestions-cardReference" maxLength={500} value={form.cardReference} onChange={e=>applySuggestion('cardReference',e.target.value)}/>{list('cardReference')}</Field>
   <Field label="Início *"><input type="datetime-local" step="0.001" required value={form.startAt} onChange={e=>{setText('startAt',e.target.value);setAllowOverlap(false);}}/></Field>
   <Field label="Término *"><input type="datetime-local" step="0.001" required value={form.endAt} onChange={e=>{setText('endAt',e.target.value);setAllowOverlap(false);}}/></Field>
   <Field label="Horas de foco"><input type="number" min="0" step="1" value={hours} onChange={e=>setManual({hours:e.target.value,minutes})}/></Field>
   <Field label="Minutos de foco"><input type="number" min="0" max="59" step="1" value={minutes} onChange={e=>setManual({hours,minutes:e.target.value})}/></Field>
   {showValues&&<Field label="Valor por hora (R$)"><input inputMode="decimal" value={form.hourlyRate} onChange={e=>setText('hourlyRate',e.target.value)}/></Field>}
   <Field label="Resultado"><select value={form.status} onChange={e=>setForm(current=>({...current,status:e.target.value as Result}))}>{(['Concluída','Encerrada','Interrompida'] as const).map(status=><option key={status}>{status}</option>)}</select></Field>
  </div>
  <p className="muted">Intervalo informado: {interval==null?'informe horários válidos':duration(interval*60)}. {manual&&<button type="button" className="button button--quiet" onClick={()=>setManual(null)}>Usar intervalo completo</button>}</p>
  <ConflictingSessions sessions={overlaps}/>
  {overlaps.length>0&&<label className="check-row"><input type="checkbox" checked={allowOverlap} onChange={e=>setAllowOverlap(e.target.checked)}/> O período coincide com {overlaps.length} apontamento(s). Confirmo o lançamento mesmo assim.</label>}
  {error&&<p className="message message--error" role="alert">{error}</p>}
  <div className="dialog__footer"><button type="button" className="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}>Salvar lançamento</button></div>
 </form></Dialog>;
}
