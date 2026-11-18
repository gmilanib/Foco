import { useEffect,useId,useRef,useState,type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import '../tasks.css';

export function TaskActions({activity,children}:{activity:string;children:ReactNode}){
 const [open,setOpen]=useState(false),id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 return <div className="task-actions" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'&&open){event.stopPropagation();setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} type="button" className="button button--quiet" aria-label={`Mais opções de ${activity}`} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><MoreHorizontal size={20} aria-hidden="true"/></button>
  {open&&<div id={id} className="task-actions__panel" role="group" aria-label={`Ações de ${activity}`} onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled)')){setOpen(false);trigger.current?.focus();}}}>{children}</div>}
 </div>;
}
