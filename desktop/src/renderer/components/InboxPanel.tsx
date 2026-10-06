import { DraftRecovery,clearDraft } from './DraftRecovery';
import { useRef,useState } from 'react';
import { request,safeMessage } from '../api';
import type { InboxItem } from '../planning';
import type { Catalogs } from '../types';
import { Card,Empty,Field } from './Field';
import { CatalogSelect } from './CatalogSelect';
import { Dialog } from './Dialog';

export function InboxPanel({items,catalogs,onChanged}:{items:InboxItem[];catalogs:Catalogs;onChanged:()=>Promise<void>}){
 const [title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState<InboxItem|null>(null),[discarding,setDiscarding]=useState<InboxItem|null>(null);
 const [form,setForm]=useState({client:'',project:'',activity:'',details:'',dueDate:''});
 const lock=useRef(false);
 const act=async(work:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();await onChanged();}catch(e){setError(safeMessage(e));}finally{setBusy(false);lock.current=false;}};
 return <Card title={`Caixa de entrada (${items.length})`}>
  <DraftRecovery id="capture" value={title} onRecover={setTitle}/>
  <form className="planning-capture" onSubmit={e=>{e.preventDefault();if(!title.trim())return;void act(async()=>{await request('/api/planning/inbox','POST',{title:title.trim()});clearDraft('capture');setTitle('');});}}>
   <Field label="Captura rápida"><input required disabled={busy} maxLength={1000} value={title} onChange={e=>setTitle(e.target.value)} placeholder="O que você precisa lembrar de fazer?"/></Field><button className="button button--primary" disabled={busy||!title.trim()}>Capturar</button>
  </form><p className="muted">Registre agora. Escolha cliente, projeto e atividade quando for organizar.</p>
  {error&&<p role="alert" className="message message--error">{error}</p>}
  {!items.length?<Empty>Nenhuma demanda para organizar.</Empty>:<ul className="planning-list">{items.map(item=><li key={item.id}><span>{item.title}</span><div className="actions"><button className="button" disabled={busy} onClick={()=>{setEditing(item);setForm({client:'',project:'',activity:'',details:item.title,dueDate:''});}}>Organizar</button><button className="button button--quiet" disabled={busy} onClick={()=>setDiscarding(item)}>Descartar</button></div></li>)}</ul>}
  {editing&&<Dialog title="Organizar captura" onClose={()=>setEditing(null)}><form className="dialog-form" onSubmit={e=>{e.preventDefault();void act(async()=>{await request(`/api/planning/inbox/${editing.id}/convert`,'POST',{...form,dueDate:form.dueDate||null,hourlyRate:null,consultant:'',cardReference:''});clearDraft(`capture.${editing.id}`);setEditing(null);});}}>
   <DraftRecovery id={`capture.${editing.id}`} value={form} onRecover={setForm}/>
   <p className="muted">A captura só sai da caixa de entrada depois que a tarefa for salva. Novas atividades podem ser cadastradas em Cadastros.</p>
   <div className="form-grid form-grid--two"><CatalogSelect label="Cliente" optional value={form.client} options={catalogs.items.clients} onChange={client=>setForm({...form,client})}/><CatalogSelect label="Projeto" optional value={form.project} options={catalogs.items.projects} onChange={project=>setForm({...form,project})}/><CatalogSelect label="Atividade" required value={form.activity} options={catalogs.items.activities} onChange={activity=>setForm({...form,activity})}/><Field label="Prazo de entrega (opcional)"><input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></Field><Field label="Detalhamento"><textarea required maxLength={1000} value={form.details} onChange={e=>setForm({...form,details:e.target.value})}/></Field></div>
   {error&&<p role="alert">{error}</p>}<div className="dialog__footer"><button className="button button--primary" disabled={busy||!form.activity}>Criar tarefa</button></div>
  </form></Dialog>}
  {discarding&&<Dialog title="Descartar captura" onClose={()=>setDiscarding(null)}><p>Descartar “{discarding.title}”?</p><div className="dialog__footer"><button className="button" disabled={busy} onClick={()=>setDiscarding(null)}>Cancelar</button><button className="button button--danger" disabled={busy} onClick={()=>void act(async()=>{await request(`/api/planning/inbox/${discarding.id}`,'DELETE');setDiscarding(null);})}>Confirmar descarte</button></div></Dialog>}
 </Card>;
}
