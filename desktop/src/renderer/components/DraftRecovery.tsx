import { useEffect,useRef,useState } from 'react';

const prefix='foco.draft.v1.';
export function clearDraft(id:string){try{localStorage.removeItem(prefix+id);}catch{/* Keep the form usable without storage. */}}
function readDraft<T>(id:string,initial:T):T|null{
 try{
  const raw=localStorage.getItem(prefix+id);if(!raw)return null;
  const value=JSON.parse(raw);
  // Reject incompatible or corrupt drafts after an application update.
  const valid=(a:unknown,b:unknown):boolean=>b===null?a===null||typeof a==='string':
   typeof b==='object'?!!a&&typeof a==='object'&&Object.entries(b).every(([k,v])=>valid((a as Record<string,unknown>)[k],v)):
   typeof a===typeof b;
  return valid(value,initial)?value:null;
 }catch{return null;}
}

/** Mount per entity/date. Only changed fields are saved; recovery is explicit. */
export function DraftRecovery<T>({id,value,onRecover}:{id:string;value:T;onRecover:(value:T)=>void}){
 const baseline=useRef(JSON.stringify(value)),last=useRef(baseline.current);
 const [pending,setPending]=useState(()=>readDraft(id,value)),[error,setError]=useState('');
 useEffect(()=>{
  const encoded=JSON.stringify(value);if(encoded===last.current)return;last.current=encoded;
  try{if(encoded===baseline.current)clearDraft(id);else localStorage.setItem(prefix+id,encoded);setPending(null);setError('');}
  catch{setError('Não foi possível guardar o rascunho neste computador.');}
 },[id,value]);
 if(error)return <p role="alert">{error}</p>;
 if(pending===null)return null;
 return <div className="message draft-recovery" role="status">Há um rascunho local deste formulário.
  <button type="button" className="button" onClick={()=>{onRecover(pending);setPending(null);}}>Recuperar rascunho</button>
  <button type="button" className="button" onClick={()=>{clearDraft(id);setPending(null);}}>Descartar rascunho</button>
 </div>;
}
