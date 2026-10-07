import { useState } from 'react';
import { Card,Field } from './Field';
import { readSavedViews,writeSavedViews,viewDates,type SavedView,type Validator,type ViewPeriod } from '../savedViews';
import { safeMessage } from '../api';

export function SavedViews<T extends object>({scope,criteria,validate,onApply,fromKey='from',toKey='to',defaultPeriod='today'}:{scope:string;criteria:T;validate:Validator<T>;onApply:(criteria:T)=>void;fromKey?:string;toKey?:string;defaultPeriod?:ViewPeriod}){
 const [rows,setRows]=useState(()=>readSavedViews(scope,validate)),[selected,setSelected]=useState(''),[name,setName]=useState(''),[period,setPeriod]=useState<ViewPeriod>(defaultPeriod),[error,setError]=useState(''),[message,setMessage]=useState(''),[removing,setRemoving]=useState(false);
 const current=rows.find(row=>row.id===selected);
 const store=(next:SavedView<T>[],text:string)=>{writeSavedViews(scope,next);setRows(next);setMessage(text);setError('');};
 const act=(work:()=>void)=>{setError('');setMessage('');try{work();}catch(error){setError(safeMessage(error));}};
 const checkedName=()=>{const value=name.trim();if(!value||value.length>80)throw new Error('Informe um nome de até 80 caracteres.');if(rows.some(row=>row.id!==selected&&row.name.toLocaleLowerCase('pt-BR')===value.toLocaleLowerCase('pt-BR')))throw new Error('Já existe uma visão com esse nome.');return value;};
 const snapshot=()=>{if(!validate(criteria))throw new Error('Revise os filtros antes de salvar a visão.');return period==='fixed'?{...criteria}:{...criteria,[fromKey]:'',[toKey]:''};};
 return <div className="print-hide"><Card title="Visões salvas"><div className="form-grid form-grid--three"><Field label="Visão salva"><select value={selected} onChange={event=>{const row=rows.find(row=>row.id===event.target.value);setSelected(row?.id||'');setName(row?.name||'');setPeriod(row?.period||defaultPeriod);setRemoving(false);setMessage('');setError('');}}><option value="">Nova visão</option>{rows.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Nome da visão"><input maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></Field><Field label="Período ao aplicar visão"><select value={period} onChange={event=>setPeriod(event.target.value as ViewPeriod)}><option value="all">Sem filtro de datas</option><option value="today">Hoje</option><option value="week">Semana atual (segunda a domingo)</option><option value="fixed">Datas fixas dos filtros</option></select></Field></div>
  <p className="muted">Salva os filtros e a ordenação selecionados nesta tela. Hoje e Semana atual são recalculados ao aplicar; Datas fixas mantém as datas digitadas. As visões ficam neste perfil local.</p><div className="actions">
   <button className="button" disabled={!!current||!name.trim()} onClick={()=>act(()=>{const value=checkedName(),id=crypto.randomUUID();store([...rows,{id,name:value,period,criteria:snapshot()}],'Visão salva.');setSelected(id);})}>Salvar nova visão</button>
   <button className="button" disabled={!current} onClick={()=>act(()=>{if(current){onApply(viewDates(current.criteria,current.period,fromKey,toKey));setMessage(`Visão aplicada: ${current.name}.`);}})}>Aplicar visão</button>
   <button className="button" disabled={!current} onClick={()=>act(()=>{if(current)store(rows.map(row=>row.id===selected?{...row,period,criteria:snapshot()}:row),'Filtros da visão atualizados.');})}>Atualizar filtros da visão</button>
   <button className="button" disabled={!current||!name.trim()} onClick={()=>act(()=>{const value=checkedName();store(rows.map(row=>row.id===selected?{...row,name:value}:row),'Visão renomeada.');})}>Renomear visão</button>
   <button className="button" disabled={!current} onClick={()=>setRemoving(true)}>Excluir visão</button>
  </div>{removing&&current&&<div className="message"><p>Excluir a visão “{current.name}”? Os registros da aplicação serão preservados.</p><button className="button" onClick={()=>setRemoving(false)}>Cancelar exclusão da visão</button><button className="button" onClick={()=>act(()=>{store(rows.filter(row=>row.id!==selected),'Visão excluída.');setSelected('');setName('');setRemoving(false);})}>Confirmar exclusão da visão</button></div>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </Card></div>;
}
