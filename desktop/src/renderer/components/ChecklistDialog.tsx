import { useEffect,useRef,useState } from 'react';
import { request,safeMessage } from '../api';
import type { Task } from '../types';
import { Dialog } from './Dialog';
import { Field } from './Field';

export type ChecklistStep={id:string;taskId:string;title:string;completed:boolean;position:number};
export function ChecklistDialog({task,onClose,onChanged}:{task:Task;onClose:()=>void;onChanged:()=>Promise<void>}){
 const [items,setItems]=useState<ChecklistStep[]>([]),[title,setTitle]=useState(''),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const lock=useRef(false),mounted=useRef(true),root=`/api/tasks/${encodeURIComponent(task.id)}/checklist`;
 const readonly=!!(task.archived||task.projectArchived);
 useEffect(()=>{mounted.current=true;void request<ChecklistStep[]>(root).then(rows=>{if(mounted.current){setItems(rows);setLoaded(true);}}).catch(e=>{if(mounted.current)setError(safeMessage(e));});return()=>{mounted.current=false;};},[root]);
 const act=async(path:string,method:string,body?:unknown)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await request(path,method,body);const rows=await request<ChecklistStep[]>(root);if(mounted.current){setItems(rows);if(method==='POST')setTitle('');}await onChanged();}
  catch(e){if(mounted.current)setError(safeMessage(e));}finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 return <Dialog title={`Checklist · ${task.activity}`} onClose={()=>{if(!busy)onClose();}}>
  <p>{items.filter(item=>item.completed).length} de {items.length} passos concluídos. Os apontamentos continuam na tarefa principal; marcar todos os passos não conclui a tarefa.</p>
  {readonly&&<p className="muted">Restaure a tarefa e seu projeto para editar os passos.</p>}
  {!loaded&&!error&&<p role="status">Carregando passos…</p>}
  {error&&<p role="alert" className="message message--error">{error}</p>}
  <ul className="checklist-list">{items.map(item=><ChecklistItem key={item.id} item={item} disabled={busy||readonly} onSave={(value)=>void act(`${root}/${item.id}`,'PUT',value)} onDelete={()=>void act(`${root}/${item.id}`,'DELETE')}/>)}</ul>
  {!readonly&&loaded&&<form className="dialog-form" onSubmit={e=>{e.preventDefault();void act(root,'POST',{title:title.trim(),completed:false});}}><Field label="Novo passo"><input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></Field><button className="button button--primary" disabled={busy||!title.trim()||items.length>=100}>Adicionar passo</button></form>}
  <div className="dialog__footer"><button className="button" disabled={busy} onClick={onClose}>Fechar checklist</button></div>
 </Dialog>;
}
function ChecklistItem({item,disabled,onSave,onDelete}:{item:ChecklistStep;disabled:boolean;onSave:(value:{title:string;completed:boolean})=>void;onDelete:()=>void}){
 const [editing,setEditing]=useState(false),[title,setTitle]=useState(item.title);
 useEffect(()=>{setTitle(item.title);setEditing(false);},[item.title]);
 return <li><label className="checklist-step"><input type="checkbox" checked={item.completed} disabled={disabled} onChange={e=>onSave({title:item.title,completed:e.target.checked})}/><span>{item.title}</span></label>
  {editing?<form className="actions" onSubmit={e=>{e.preventDefault();onSave({title:title.trim(),completed:item.completed});}}><input aria-label="Editar texto do passo" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/><button className="button" disabled={disabled||!title.trim()}>Salvar passo</button><button className="button" type="button" onClick={()=>setEditing(false)}>Cancelar</button></form>:<div className="actions"><button className="button button--quiet" disabled={disabled} onClick={()=>setEditing(true)}>Editar passo</button><button className="button button--quiet" disabled={disabled} onClick={onDelete}>Remover passo</button></div>}
 </li>;
}
