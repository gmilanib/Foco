import { useEffect,useState } from 'react';
import { request,safeMessage } from '../api';
import { Dialog } from './Dialog';
import type { ChangeEntry } from '../types';

export function HistoryDialog({entityType,entityId,title,onClose}:{entityType:'task'|'session';entityId:string;title:string;onClose:()=>void}){
 const [items,setItems]=useState<ChangeEntry[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;request<ChangeEntry[]>(`/api/history?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`).then(rows=>{if(alive)setItems(rows);}).catch(e=>{if(alive)setError(safeMessage(e));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[entityType,entityId]);
 return <Dialog title={`Histórico · ${title}`} onClose={onClose}>
  {loading&&<p role="status">Carregando histórico…</p>}{error&&<p className="message message--error" role="alert">{error}</p>}
  {!loading&&!error&&!items.length&&<p className="muted">Nenhuma alteração registrada.</p>}
  <div className="history-list">{items.map(item=><details className="history-item" key={item.id} open={items.length===1}>
   <summary>{new Date(item.changedAt).toLocaleString('pt-BR')} · {!item.oldValue?'Registro criado':!item.newValue?'Registro excluído':'Alteração'}</summary>
   {item.oldValue&&<div><strong>Antes</strong><pre>{pretty(item.oldValue)}</pre></div>}
   {item.newValue&&<div><strong>Depois</strong><pre>{pretty(item.newValue)}</pre></div>}
  </details>)}</div>
 </Dialog>;
}
function pretty(value:string){try{return JSON.stringify(JSON.parse(value),null,2);}catch{return value;}}
