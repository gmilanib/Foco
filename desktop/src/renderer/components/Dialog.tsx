import { useEffect,useRef,type ReactNode } from 'react';

export function Dialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal();return()=>{if(dialog?.open)dialog.close();};},[]);
  return <dialog ref={ref} className="dialog" onCancel={event=>{event.preventDefault();onClose();}}>
    <header className="dialog__header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar diálogo">×</button></header>
    <div className="dialog__body">{children}</div>
  </dialog>;
}
