import { useRef,useState } from 'react';
import { Dialog } from './Dialog';
import { Field } from './Field';
import { DraftRecovery,clearDraft } from './DraftRecovery';
import { request,safeMessage } from '../api';

export function QuickCaptureDialog({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}){
 const [title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 return <Dialog title="Capturar uma demanda" initialFocus="input" onClose={()=>{if(!lock.current)onClose();}}><form className="dialog-form" onSubmit={event=>{event.preventDefault();if(lock.current||!title.trim())return;lock.current=true;setBusy(true);setError('');void (async()=>{try{await request('/api/planning/inbox','POST',{title:title.trim()});setTitle('');clearDraft('global-capture');try{await onSaved();onClose();}catch(error){setError('Captura salva, mas não foi possível atualizar a tela. '+safeMessage(error));}}catch(error){setError(safeMessage(error));}finally{lock.current=false;setBusy(false);}})();}}>
  <DraftRecovery id="global-capture" value={title} onRecover={setTitle}/>
  <Field label="Demanda para lembrar"><input required maxLength={1000} disabled={busy} value={title} onChange={event=>setTitle(event.target.value)}/></Field>
  <p>Vai para a caixa de entrada. Cliente, atividade e prazo podem ser definidos depois.</p>
  {error&&<p role="alert">{error}</p>}<div className="dialog__footer"><button type="button" className="button" disabled={busy} onClick={onClose}>Cancelar captura</button><button className="button button--primary" disabled={busy||!title.trim()}>Salvar captura</button></div>
 </form></Dialog>;
}
