import { useEffect,useState } from 'react';
import { Card,Field } from './Field';
import { request,safeMessage } from '../api';
import type { WorkflowStatus } from '../types';

const defaults={'capture.enabled':'false','capture.shortcut':'Ctrl+Alt+Q','reminders.planning.enabled':'false','reminders.planning.time':'09:00','reminders.review.enabled':'false','reminders.review.time':'18:00'};
export function WorkflowSettings({onSaved}:{onSaved:()=>Promise<void>}){
 const [values,setValues]=useState<Record<string,string>>(defaults),[status,setStatus]=useState<WorkflowStatus|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=async()=>{try{const settings=await request<Record<string,string>>('/api/settings');setValues({...defaults,...Object.fromEntries(Object.keys(defaults).map(key=>[key,settings[key]??defaults[key as keyof typeof defaults]]))});setLoaded(true);setError('');setStatus(await window.foco.workflowStatus?.()||null);}catch(error){setError(safeMessage(error));}};
 useEffect(()=>{void load();return window.foco.onWorkflowStatus?.(setStatus);},[]);
 const change=(key:string,value:string)=>setValues(current=>({...current,[key]:value}));
 return <Card title="Captura global e lembretes"><p>Funcionam enquanto o Foco estiver aberto ou na bandeja. O atalho global abre uma captura com foco, mesmo com a janela oculta. Alt+Q continua disponível dentro do aplicativo.</p>
  <form onSubmit={event=>{event.preventDefault();if(busy||!loaded)return;setBusy(true);setError('');setMessage('');void (async()=>{try{await request('/api/settings','PUT',values);setStatus(await window.foco.workflowStatus?.()||null);await onSaved();setMessage('Preferências de captura e lembretes salvas.');}catch(error){setError(safeMessage(error));}finally{setBusy(false);}})();}}>
   <label className="check-row"><input type="checkbox" checked={values['capture.enabled']==='true'} onChange={event=>change('capture.enabled',String(event.target.checked))}/> Ativar atalho global de captura</label>
   <Field label="Atalho global"><input required maxLength={60} value={values['capture.shortcut']} onChange={event=>change('capture.shortcut',event.target.value)} placeholder="Ctrl+Alt+Q"/></Field>
   <p className="muted">Use Ctrl, Alt ou Super com letra, número ou F1 a F24. Se outra aplicação usar a combinação, escolha outra.</p>
   <div className="form-grid form-grid--two">{([['planning','Planejamento'],['review','Revisão do dia']] as const).map(([kind,label])=><div key={kind}><label className="check-row"><input type="checkbox" checked={values[`reminders.${kind}.enabled`]==='true'} onChange={event=>change(`reminders.${kind}.enabled`,String(event.target.checked))}/> Lembrete de {label.toLocaleLowerCase('pt-BR')}</label><Field label={`Horário de ${label.toLocaleLowerCase('pt-BR')}`}><input type="time" required value={values[`reminders.${kind}.time`]} onChange={event=>change(`reminders.${kind}.time`,event.target.value)}/></Field></div>)}</div>
   <p className="muted">Horários locais, todos os dias. Lembretes com mais de 15 minutos de atraso não são recuperados. Você pode adiar 15 minutos, dispensar ou silenciar os lembretes de hoje.</p>
   <button className="button" disabled={busy||!loaded}>Salvar captura e lembretes</button>
  </form>
  {status?.shortcut.error&&<p role="alert">{status.shortcut.error} A captura pelo menu da bandeja continua disponível.</p>}
  {status?.shortcut.registered&&<p role="status">Atalho ativo: {status.shortcut.accelerator}</p>}
  {status&&!status.notificationsSupported&&<p>Notificações do sistema indisponíveis. Os lembretes aparecerão no painel do Foco.</p>}
  {error&&<p role="alert">{error} <button className="button" onClick={()=>void load()}>Recarregar preferências de lembretes</button></p>}{message&&<p role="status">{message}</p>}
 </Card>;
}
