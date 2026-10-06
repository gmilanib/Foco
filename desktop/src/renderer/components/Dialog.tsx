import { useEffect,useId,useRef,type ReactNode } from 'react';

export function Dialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  const titleId=useId();
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal();return()=>{if(dialog?.open)dialog.close();if(previous?.isConnected)previous.focus();};},[]);
  return <dialog ref={ref} aria-labelledby={titleId} className="dialog" onKeyDown={event=>{
    if(event.key!=='Tab')return;
    const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(element=>!element.closest('[hidden]'));
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }} onCancel={event=>{event.preventDefault();onClose();}}>
    <header className="dialog__header"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar diálogo">×</button></header>
    <div className="dialog__body">{children}</div>
  </dialog>;
}
