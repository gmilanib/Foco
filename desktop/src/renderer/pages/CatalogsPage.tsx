import { useState,type FormEvent } from 'react';
import { ArrowLeftRight,Plus,Trash2 } from 'lucide-react';
import { request,safeMessage } from '../api';
import { CatalogSelect } from '../components/CatalogSelect';
import { Dialog } from '../components/Dialog';
import { Card,Field } from '../components/Field';
import type { CatalogDuplicate,Catalogs,CatalogType } from '../types';

type Props={catalogs:Catalogs;onChanged:()=>Promise<void>};
type Action={kind:'rename'|'merge'|'delete'|'archive';source:string;target:string};
const labels:Record<CatalogType,string>={clients:'Clientes',projects:'Projetos',activities:'Atividades'};
const blank:Catalogs={items:{clients:[],projects:[],activities:[]},possibleDuplicates:[]};

export function CatalogsPage({catalogs=blank,onChanged}:Props){
 const [type,setType]=useState<CatalogType>('clients'),[name,setName]=useState('');
 const [action,setAction]=useState<Action|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [archive,setArchive]=useState('active');
 const allNames=catalogs.items[type]||[],names=allNames.filter(name=>type!=='projects'||archive==='all'||(archive==='archived')===!!catalogs.archivedProjects?.includes(name));
 const create=async(event:FormEvent)=>{
  event.preventDefault();setError('');setMessage('');setBusy(true);
  try{await request(`/api/catalogs/${type}`,'POST',{name});setName('');await onChanged();setMessage(`${labels[type]} atualizado.`);}
  catch(e){setError(safeMessage(e));}finally{setBusy(false);}
 };
 const openMerge=(source:string,target:string)=>{setAction({kind:'merge',source,target});setError('');};
 const runAction=async(event:FormEvent)=>{
  event.preventDefault();if(!action)return;setError('');setBusy(true);
  try{
   if(action.kind==='archive')await request(`/api/catalogs/projects/${encodeURIComponent(action.source)}/archive`,'PUT',{archived:!catalogs.archivedProjects?.includes(action.source)});
   if(action.kind==='merge')await request(`/api/catalogs/${type}/merge`,'POST',{source:action.source,target:action.target});
   if(action.kind==='rename')await request(`/api/catalogs/${type}/${encodeURIComponent(action.source)}`,'PUT',{name:action.target});
   if(action.kind==='delete')await request(`/api/catalogs/${type}/${encodeURIComponent(action.source)}`,'DELETE');
   setAction(null);await onChanged();setMessage(`${labels[type]} atualizado.`);
  }catch(e){setError(safeMessage(e));}finally{setBusy(false);}
 };
 const proposals=catalogs.possibleDuplicates.filter(item=>item.type===type);
 const mergeProposal=(item:CatalogDuplicate,target:string)=>openMerge(target===item.first?item.second:item.first,target);

 return <div className="page-stack"><div className="page-title"><div><h1>Cadastros</h1><p>Centralize os nomes usados em apontamentos e tarefas.</p></div></div>
  <div className="catalog-tabs" role="tablist" aria-label="Tipo de cadastro">{(Object.keys(labels) as CatalogType[]).map(key=><button key={key} role="tab" aria-selected={type===key} className={`button ${type===key?'button--primary':''}`} onClick={()=>setType(key)}>{labels[key]}</button>)}</div>
  {type==='projects'&&<Field label="Arquivamento dos projetos"><select value={archive} onChange={e=>setArchive(e.target.value)}><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></Field>}
  <Card title={`Cadastrar ${labels[type].toLocaleLowerCase('pt-BR')}`}><form className="catalog-create" onSubmit={create}><Field label={`Nome do cadastro`}><input value={name} maxLength={200} required onChange={e=>setName(e.target.value)} placeholder={`Nome de ${labels[type].toLocaleLowerCase('pt-BR')}`}/></Field><button className="button button--primary" disabled={busy||!name.trim()}><Plus size={16}/> Cadastrar</button></form></Card>
  {proposals.length>0&&<Card title="Possíveis duplicidades"><p className="muted">Compare os nomes sugeridos. Nada é combinado sem sua confirmação.</p><div className="catalog-proposals">{proposals.map(item=><div className="catalog-proposal" key={`${item.first}|${item.second}`}><span>{item.first}</span><ArrowLeftRight size={16}/><span>{item.second}</span><small>{Math.round(item.similarity*100)}% parecido</small><button className="button" onClick={()=>mergeProposal(item,item.first)}>Manter “{item.first}”</button><button className="button" onClick={()=>mergeProposal(item,item.second)}>Manter “{item.second}”</button></div>)}</div></Card>}
  <Card title={`${labels[type]} cadastrados`}><div className="catalog-list">{names.length?names.map(item=><div className="catalog-row" key={item}><span>{item}{type==='projects'&&catalogs.archivedProjects?.includes(item)?' · Arquivado':''}</span><div className="catalog-actions">{type==='projects'&&<button className="button button--quiet" onClick={()=>{setError('');setAction({kind:'archive',source:item,target:''});}}>{catalogs.archivedProjects?.includes(item)?'Restaurar projeto':'Arquivar projeto'}</button>}<button className="button button--quiet" onClick={()=>setAction({kind:'rename',source:item,target:item})}>Renomear</button><button className="button button--quiet" onClick={()=>setAction({kind:'merge',source:item,target:names.find(value=>value!==item)||''})} disabled={names.length<2}>Unificar</button><button className="button button--quiet" aria-label={`Excluir ${item}`} onClick={()=>setAction({kind:'delete',source:item,target:''})}><Trash2 size={16}/></button></div></div>):<p className="muted">Nenhum cadastro ainda. Valores já usados no histórico serão carregados na primeira atualização.</p>}</div></Card>
  {error&&<p className="message message--error" role="alert">{error}</p>}{message&&<p className="message" role="status">{message}</p>}
  {action&&<Dialog title={action.kind==='archive'?(catalogs.archivedProjects?.includes(action.source)?'Restaurar projeto':'Arquivar projeto'):action.kind==='merge'?'Unificar cadastros':action.kind==='rename'?'Renomear cadastro':'Excluir cadastro'} onClose={()=>{if(!busy)setAction(null);}}><form onSubmit={runAction}>
   {action.kind==='rename'&&<Field label="Novo nome"><input autoFocus required maxLength={200} value={action.target} onChange={e=>setAction({...action,target:e.target.value})}/></Field>}
   {action.kind==='merge'&&<><p>O nome escolhido será o canônico. Lançamentos e tarefas antigos serão atualizados para esse nome.</p><Field label="Cadastro a unificar"><input value={action.source} readOnly/></Field><CatalogSelect label="Manter como nome canônico" value={action.target} options={names.filter(value=>value!==action.source)} onChange={target=>setAction({...action,target})} required/></>}
   {action.kind==='archive'&&<p>{catalogs.archivedProjects?.includes(action.source)?'Restaurar':'Arquivar'} o projeto <strong>{action.source}</strong>? Apontamentos e relatórios serão preservados. Arquivar oculta as tarefas deste projeto e remove suas prioridades; restaurar não altera o arquivamento individual das tarefas.</p>}
   {action.kind==='delete'&&<p>Excluir <strong>{action.source}</strong>? Cadastros usados no histórico só podem ser renomeados ou unificados.</p>}
   {error&&<p role="alert" className="message message--error">{error}</p>}<div className="dialog__footer"><button type="button" className="button" disabled={busy} onClick={()=>setAction(null)}>Cancelar</button><button className="button button--primary" disabled={busy||(action.kind==='merge'&&!action.target)}>{action.kind==='archive'?'Confirmar alteração':action.kind==='merge'?'Confirmar unificação':action.kind==='rename'?'Salvar nome':'Excluir cadastro'}</button></div>
  </form></Dialog>}
 </div>;
}
