import {useEffect,useState} from 'react';
import {request,safeMessage} from '../api';
import {isoDay} from '../format';
import {Dialog} from './Dialog';
import {Field} from './Field';

type Preferences={journeyMode:string;extraMode:string;toleranceMinutes:string;provider:string;email:string;company:string;cnpj:string;manager:string;monthlyAmount:string};
type Preview={lines:{day:string;seconds:number;description:string}[];extraSeconds:number;deductionSeconds:number;totalSeconds:number;warnings:string[]};
const defaults:Preferences={journeyMode:'rounded',extraMode:'real',toleranceMinutes:'30',provider:'',email:'',company:'',cnpj:'',manager:'',monthlyAmount:''};
const time=(seconds:number)=>{const n=Math.abs(seconds);return `${seconds<0?'−':''}${Math.floor(n/3600)}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
export function OvertimeDialog({onClose}:{onClose:()=>void}){
 const [from,setFrom]=useState(()=>`${isoDay(new Date()).slice(0,7)}-01`),[to,setTo]=useState(()=>isoDay(new Date()));
 const [prefs,setPrefs]=useState<Preferences>(defaults),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<Preview|null>(null);
 useEffect(()=>{let active=true;request<Record<string,string>>('/api/settings').then(settings=>{if(!active)return;const next={...defaults};for(const key of Object.keys(next) as (keyof Preferences)[])next[key]=settings[`overtime.${key}`]??defaults[key];setPrefs(next);setLoaded(true);}).catch(e=>{if(active)setError(safeMessage(e));});return()=>{active=false;};},[]);
 const update=(key:keyof Preferences,value:string)=>{setPrefs(p=>({...p,[key]:value}));setPreview(null);};
 const payload=()=>{
  if(!from||!to||from>to)throw new Error('Informe a data inicial e a final, com início anterior ou igual ao fim.');
  const tolerance=Number(prefs.toleranceMinutes),amount=prefs.monthlyAmount===''?null:Number(prefs.monthlyAmount);
  if(!Number.isInteger(tolerance)||tolerance<0||tolerance>1440)throw new Error('Informe uma tolerância de 0 a 1440 minutos.');
  if(amount!==null&&(!Number.isFinite(amount)||amount<0||amount>100000000))throw new Error('Valor mensal inválido.');
  return {...prefs,from,to,toleranceMinutes:tolerance,monthlyAmount:amount};
 };
 const calculate=async()=>{setBusy(true);setError('');setPreview(null);try{setPreview(await request<Preview>('/api/overtime/preview','POST',payload()));}catch(e){setError(safeMessage(e));}finally{setBusy(false);}};
 const download=async()=>{setBusy(true);setError('');try{
  const body=payload();await request('/api/settings','PUT',Object.fromEntries(Object.entries(prefs).map(([key,value])=>[`overtime.${key}`,value])));
  await window.foco.saveOvertime(body);
 }catch(e){setError(safeMessage(e));}finally{setBusy(false);}};
 return <Dialog title="Exportar horas extras" onClose={()=>{if(!busy)onClose();}}>
  <p>Planilha no modelo de Relatório de Atividades. Escolha livremente as datas, inclusive entre meses ou anos, como 20/09 a 21/10. Considera todos os apontamentos finalizados do período, independentemente dos filtros do relatório.</p>
  <fieldset disabled={busy||!loaded} style={{border:0,padding:0,margin:0}}>
   <div className="form-grid"><Field label="Apuração inicial"><input type="date" min="1900-01-01" max="9999-12-31" value={from} onChange={e=>{setFrom(e.target.value);setPreview(null);}}/></Field><Field label="Apuração final"><input type="date" min="1900-01-01" max="9999-12-31" value={to} onChange={e=>{setTo(e.target.value);setPreview(null);}}/></Field></div>
   <details className="disclosure"><summary>Cálculo e tolerância</summary><div className="disclosure__body form-grid">
    <Field label="Horas para completar a jornada"><select value={prefs.journeyMode} onChange={e=>update('journeyMode',e.target.value)}><option value="rounded">Arredondadas</option><option value="real">Reais</option></select></Field>
    <Field label="Horas extras"><select value={prefs.extraMode} onChange={e=>update('extraMode',e.target.value)}><option value="real">Reais</option><option value="rounded">Arredondadas</option></select></Field>
    <Field label="Tolerância diária de falta (minutos)"><input type="number" min="0" max="1440" step="1" value={prefs.toleranceMinutes} onChange={e=>update('toleranceMinutes',e.target.value)}/></Field>
   </div></details>
   <p className="muted">Jornada de cada dia conforme as configurações, incluindo folgas e exceções. Faltas de dias anteriores descontam apenas o que excede a tolerância de {prefs.toleranceMinutes} min. Hoje não gera abatimento. Pausas e tempo A definir não entram.</p>
   <details className="disclosure"><summary>Dados do prestador</summary><div className="disclosure__body form-grid">
    {([['provider','Prestador'],['email','E-mail do prestador'],['company','Razão social'],['cnpj','CNPJ'],['manager','Nome do gestor'],['monthlyAmount','Valor da nota mensal (opcional)']] as [keyof Preferences,string][]).map(([key,label])=><Field key={key} label={label}><input type={key==='monthlyAmount'?'number':'text'} maxLength={key==='cnpj'?40:200} min={key==='monthlyAmount'?'0':undefined} step={key==='monthlyAmount'?'0.01':undefined} value={prefs[key]} onChange={e=>update(key,e.target.value)}/></Field>)}
   </div><p className="muted">Campos opcionais, salvos ao exportar. O valor do pedido segue a fórmula do modelo: nota mensal ÷ 160 × saldo de horas. A assinatura fica em branco.</p></details>
  </fieldset>
  {error&&<p role="alert">{error}</p>}
  {preview&&<section aria-label="Prévia de horas extras"><p><strong>Extras: {time(preview.extraSeconds)} · Abatimentos: {time(preview.deductionSeconds)} · Saldo: {time(preview.totalSeconds)}</strong></p>{preview.warnings.map(w=><p role="status" key={w}>{w}</p>)}{!preview.lines.length?<p>Sem horas extras ou abatimentos no período.</p>:<details><summary>Conferir {preview.lines.length} linhas</summary><div className="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Horas</th></tr></thead><tbody>{preview.lines.map((line,i)=><tr key={i}><td>{line.day.split('-').reverse().join('/')}</td><td>{line.description}</td><td>{time(line.seconds)}</td></tr>)}</tbody></table></div></details>}</section>}
  <div className="dialog__footer"><button className="button" disabled={busy} onClick={onClose}>Fechar</button><button className="button" disabled={busy||!loaded} onClick={()=>void calculate()}>{busy?'Aguarde…':'Calcular prévia'}</button><button className="button button--primary" disabled={busy||!preview} onClick={()=>void download()}>Baixar XLSX</button></div>
 </Dialog>;
}
