import type { TaskTemplate } from '../planning';
import { Field } from './Field';
export const recurrenceLabels:Record<TaskTemplate['recurrence'],string>={none:'Sob demanda',daily:'Diária',weekly:'Semanal',workdays:'Dias úteis (segunda a sexta)',weekdays:'Dias específicos',monthly:'Mensal'};
export type TemplateForm={sourceId:string;name:string;recurrence:TaskTemplate['recurrence'];nextDate:string;paused:boolean;weekdays:number[];monthDay:number};
export function RecurrenceFields({form,onChange}:{form:TemplateForm;onChange:(form:TemplateForm)=>void}){
 return <><Field label="Frequência"><select value={form.recurrence} onChange={e=>onChange({...form,recurrence:e.target.value as TemplateForm['recurrence']})}>{Object.entries(recurrenceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
  {form.recurrence!=='none'&&<Field label="Próxima ocorrência"><input required type="date" value={form.nextDate} onChange={e=>onChange({...form,nextDate:e.target.value})}/></Field>}
  {form.recurrence==='weekdays'&&<fieldset className="recurrence-days"><legend>Dias da semana</legend>{['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((label,index)=><label key={label}><input type="checkbox" checked={form.weekdays.includes(index+1)} onChange={e=>onChange({...form,weekdays:e.target.checked?[...form.weekdays,index+1].sort():form.weekdays.filter(day=>day!==index+1)})}/>{label}</label>)}</fieldset>}
  {form.recurrence==='monthly'&&<Field label="Dia do mês"><input aria-label="Dia do mês" aria-describedby="month-day-help" required type="number" min={1} max={31} value={form.monthDay} onChange={e=>onChange({...form,monthDay:Number(e.target.value)})}/><small id="month-day-help">Meses mais curtos usam seu último dia e mantêm o dia escolhido para os meses seguintes.</small></Field>}
  <Field label="Geração de tarefas previstas"><select value={form.paused?'paused':'active'} onChange={e=>onChange({...form,paused:e.target.value==='paused'})}><option value="active">Ativa</option><option value="paused">Pausada</option></select></Field>
 </>;
}
