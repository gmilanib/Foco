import { useEffect,useRef,useState } from 'react';
import { request,safeMessage } from '../api';
import { isoDay } from '../format';
import { Card,Field } from './Field';
import { Dialog } from './Dialog';
export type ClockWindow={start:string;end:string};
export type ScheduleRule={effectiveFrom:string;week:ClockWindow[][]};
export type ScheduleException={day:string;windows:ClockWindow[]};
type Config={rules:ScheduleRule[];exceptions:ScheduleException[]};
const names=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
const format=(windows:ClockWindow[])=>windows.map(w=>`${w.start}-${w.end}`).join(', ');
export function parseWindows(text:string):ClockWindow[]{
 if(!text.trim())return [];
 return text.split(',').map(part=>{const match=part.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);if(!match)throw new Error('Use HH:mm-HH:mm, separados por vírgula.');return {start:match[1],end:match[2]};});
}
export function ScheduleSettings(){
 const today=isoDay(new Date()),[date,setDate]=useState(today),[week,setWeek]=useState<string[]>(names.map((_,i)=>i<5?'09:00-12:00, 13:00-18:00':''));
 const [exceptionDay,setExceptionDay]=useState(today),[exception,setException]=useState(''),[config,setConfig]=useState<Config>({rules:[],exceptions:[]}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[remove,setRemove]=useState<{kind:'rules'|'exceptions';day:string}|null>(null),saving=useRef(false);
 useEffect(()=>{void request<Config>('/api/work-schedule').then(value=>{setConfig({rules:value.rules||[],exceptions:value.exceptions||[]});setReady(true);}).catch(e=>setMessage(safeMessage(e)));},[]);
 const save=async(kind:'rules'|'exceptions')=>{
  if(saving.current)return;saving.current=true;setBusy(true);setMessage('');
  try{const body=kind==='rules'?{effectiveFrom:date,week:week.map(parseWindows)}:{day:exceptionDay,windows:parseWindows(exception)};const value=await request<Config>(`/api/work-schedule/${kind}`,'PUT',body);setConfig(value);setMessage(kind==='rules'?'Jornada semanal salva. Dias anteriores mantêm suas regras.':'Exceção salva.');}catch(e){setMessage(safeMessage(e));}finally{saving.current=false;setBusy(false);}
 };
 const destroy=async()=>{if(!remove||saving.current)return;saving.current=true;setBusy(true);try{setConfig(await request<Config>(`/api/work-schedule/${remove.kind}/${remove.day}`,'DELETE'));setRemove(null);setMessage('Configuração removida.');}catch(e){setMessage(safeMessage(e));}finally{saving.current=false;setBusy(false);}};
 return <Card title="Jornada configurável"><p>Novas regras valem desde a data escolhida. Dias anteriores ficam preservados. Intervalos vazios representam folga; a soma dos horários define a meta diária. Pausas entre intervalos não geram A definir.</p><p className="muted">Use 09:00-12:00, 13:00-18:00. Até oito intervalos ordenados por dia, sem sobreposição ou passagem pela meia-noite. Esta jornada define lacunas e extra-time; capacidade de planejamento continua independente.</p>
  <Field label="Nova jornada válida desde"><input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)}/></Field><div className="form-grid form-grid--two">{names.map((name,index)=><Field key={name} label={`Intervalos de ${name}`}><input value={week[index]} onChange={e=>setWeek(rows=>rows.map((value,i)=>i===index?e.target.value:value))} placeholder="Vazio = folga"/></Field>)}</div><button className="button button--primary" disabled={busy||!ready||!date} onClick={()=>void save('rules')}>Salvar jornada semanal</button>
  <h3>Exceção por data</h3><div className="form-grid form-grid--two"><Field label="Data da exceção"><input type="date" min={today} value={exceptionDay} onChange={e=>setExceptionDay(e.target.value)}/></Field><Field label="Intervalos da exceção"><input value={exception} onChange={e=>setException(e.target.value)} placeholder="Vazio = feriado ou folga"/></Field></div><button className="button" disabled={busy||!ready||!exceptionDay} onClick={()=>void save('exceptions')}>Salvar exceção</button>
  {config.rules.length>0&&<><h3>Regras registradas</h3><ul className="schedule-list">{config.rules.map(rule=><li key={rule.effectiveFrom}><strong>Desde {rule.effectiveFrom}</strong><span>{rule.week.map((windows,i)=>`${names[i]}: ${format(windows)||'folga'}`).join(' · ')}</span><div className="actions"><button className="button" disabled={busy} onClick={()=>{setWeek(rule.week.map(format));setDate(rule.effectiveFrom<today?today:rule.effectiveFrom);}}>Usar como base</button><button className="button" disabled={busy||rule.effectiveFrom<today} onClick={()=>setRemove({kind:'rules',day:rule.effectiveFrom})}>Remover regra</button></div></li>)}</ul></>}
  {config.exceptions.length>0&&<><h3>Exceções registradas</h3><ul className="schedule-list">{config.exceptions.map(item=><li key={item.day}><strong>{item.day}: {format(item.windows)||'folga'}</strong><div className="actions"><button className="button" disabled={busy||item.day<today} onClick={()=>{setExceptionDay(item.day);setException(format(item.windows));}}>Editar exceção</button><button className="button" disabled={busy||item.day<today} onClick={()=>setRemove({kind:'exceptions',day:item.day})}>Remover exceção</button></div></li>)}</ul></>}
  {message&&<p className="message" role="status">{message}</p>}{remove&&<Dialog title="Remover configuração de jornada" onClose={()=>{if(!busy)setRemove(null);}}><p>Remover a configuração de {remove.day}? A regra anterior voltará a valer para essa data.</p><div className="dialog__footer"><button className="button" disabled={busy} onClick={()=>setRemove(null)}>Cancelar</button><button className="button button--danger" disabled={busy} onClick={()=>void destroy()}>Confirmar remoção</button></div></Dialog>}
 </Card>;
}
