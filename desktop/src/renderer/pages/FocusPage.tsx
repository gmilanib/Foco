import { useMemo,type Dispatch,type SetStateAction } from 'react';
import { Field,Card } from '../components/Field';
import { ClientMarker,ClientColorPreview } from '../components/ClientMarker';
import { TimerPanel } from '../components/TimerPanel';
import { money } from '../format';
import { buildFillSuggestions,valuesFor,type SuggestionField } from '../fillSuggestions';
import type { Color,Session,Task } from '../types';

export type Draft={client:string;project:string;activity:string;details:string;consultant:string;cardReference:string;hourlyRate:string;category:'Normal'|'Agenda';mode:'Timer'|'Cronômetro';minutes:number};
type Props={draft:Draft;setDraft:Dispatch<SetStateAction<Draft>>;session:Session|null;elapsed:number;running:boolean;showValues:boolean;onToggle:()=>void;onFinish:()=>void;onOverlay:()=>void;onRetroactive:()=>void;history:Session[];tasks:Task[];colors?:Color[];quickPresets:number[];favoriteKeys:string[];quickLimit:number;defaultRate:string;onToggleFavorite:(key:string)=>void};
const set=(setDraft:Props['setDraft'],key:keyof Draft,value:string|number)=>setDraft(current=>({...current,[key]:value}));

export function FocusPage({draft,setDraft,session,elapsed,running,showValues,onToggle,onFinish,onOverlay,onRetroactive,history,tasks,colors=[],quickPresets,favoriteKeys,quickLimit,defaultRate,onToggleFavorite}:Props){
  const suggestions=useMemo(()=>buildFillSuggestions(history,tasks),[history,tasks]);
  const applySuggestion=(field:SuggestionField,value:string)=>setDraft(current=>({...current,[field]:value}));
  const list=(field:SuggestionField)=><datalist id={`suggestions-${field}`}>{valuesFor(suggestions,field,draft[field]).map(value=><option key={value} value={value}/>)}</datalist>;
  const recent=useMemo(()=>{const seen=new Set<string>();const rows=[...history].sort((a,b)=>b.startAt.localeCompare(a.startAt)).filter(s=>{if(!s.project.trim())return false;const client=s.client.trim()||'Sem cliente',project=s.project.trim(),key=`${client.length}:${client.toLocaleUpperCase('pt-BR')}${project.toLocaleUpperCase('pt-BR')}`;if(seen.has(key))return false;seen.add(key);return true;});const favorites=rows.filter(s=>favoriteKeys.includes(`${(s.client.trim()||'Sem cliente').length}:${(s.client.trim()||'Sem cliente').toLocaleUpperCase('pt-BR')}${s.project.trim().toLocaleUpperCase('pt-BR')}`));const normal=rows.filter(s=>!favoriteKeys.includes(`${(s.client.trim()||'Sem cliente').length}:${(s.client.trim()||'Sem cliente').toLocaleUpperCase('pt-BR')}${s.project.trim().toLocaleUpperCase('pt-BR')}`));return [...favorites,...(quickLimit===0?normal:normal.slice(0,quickLimit))];},[history,favoriteKeys,quickLimit]);
  return <div className="focus-layout"><section className="focus-form">
    <div className="page-title"><div><h1>Lançamento</h1><p>Descreva sua atividade e acompanhe o foco.</p></div><button className="button" onClick={onRetroactive}>Lançamento retroativo</button></div>
    <Card title="Atividade e projeto">
      <p className="muted">As opções acompanham o que você digita e completam somente o campo escolhido.</p>
      <div className="form-grid form-grid--two">
        <Field label="Cliente"><input list="suggestions-client" value={draft.client} onChange={e=>applySuggestion('client',e.target.value)} maxLength={200}/>{list('client')}<ClientColorPreview client={draft.client} colors={colors}/></Field>
        <Field label="Projeto"><input list="suggestions-project" value={draft.project} onChange={e=>applySuggestion('project',e.target.value)} maxLength={200}/>{list('project')}</Field>
        <Field label="Atividade (descrição macro)"><input id="activity" list="suggestions-activity" value={draft.activity} onChange={e=>applySuggestion('activity',e.target.value)} maxLength={200} autoFocus placeholder="Ex.: revisar requisitos"/>{list('activity')}</Field>
        <Field label="Categoria do apontamento"><select value={draft.category} disabled={!!session} onChange={e=>set(setDraft,'category',e.target.value)}><option value="Normal">Normal</option><option value="Agenda">Agenda</option></select></Field>
        <Field label="Detalhamento"><textarea value={draft.details} onChange={e=>set(setDraft,'details',e.target.value)} maxLength={1000} rows={2}/></Field>
        <Field label="Consultor solicitante"><input list="suggestions-consultant" value={draft.consultant} onChange={e=>applySuggestion('consultant',e.target.value)} maxLength={200}/>{list('consultant')}</Field>
        <Field label="Card ou link do cronograma"><input list="suggestions-cardReference" value={draft.cardReference} onChange={e=>applySuggestion('cardReference',e.target.value)} maxLength={500}/>{list('cardReference')}</Field>
      </div>
    </Card>
    <details className="card options"><summary>Contagem, duração e valor/hora</summary>
      <div className="form-grid form-grid--three">
        <Field label="Modo"><select value={draft.mode} disabled={!!session} onChange={e=>set(setDraft,'mode',e.target.value)}><option>Timer</option><option>Cronômetro</option></select></Field>
        {draft.mode==='Timer'&&<Field label="Duração em minutos"><input type="number" min={1} max={999} value={draft.minutes} disabled={!!session} onChange={e=>set(setDraft,'minutes',Number(e.target.value))}/></Field>}
        <div className="preset-list" aria-label="Durações favoritas">{quickPresets.map(n=><button className="button button--quiet" key={n} disabled={!!session||draft.mode!=='Timer'} onClick={()=>set(setDraft,'minutes',n)}>{n} min</button>)}</div>
        {showValues&&<Field label="Valor por hora (R$)"><input list="suggestions-hourlyRate" inputMode="decimal" value={draft.hourlyRate} disabled={!!session} onChange={e=>applySuggestion('hourlyRate',e.target.value)} placeholder={defaultRate||'Ex.: 120,50'}/>{list('hourlyRate')}</Field>}
      </div>
      {draft.mode==='Cronômetro'&&<p className="muted">Cronômetro sem limite; pausas não contam no tempo de foco.</p>}
    </details>
    <Card title="Lançamentos recentes">
      {recent.length?<div className="recent-list">{recent.map(s=>{const client=s.client.trim()||'Sem cliente',project=s.project.trim(),key=`${client.length}:${client.toLocaleUpperCase('pt-BR')}${project.toLocaleUpperCase('pt-BR')}`,favorite=favoriteKeys.includes(key);return <div key={`${s.client}/${s.project}`} className="recent-row"><button className="recent-main" onClick={()=>setDraft(current=>({...current,client:s.client,project:s.project}))}><ClientMarker client={s.client} colors={colors}>{client}</ClientMarker><span>{project}</span><span>{s.activity}</span></button><button className="favorite-toggle" aria-label={favorite?'Desafixar favorito':'Fixar como favorito'} onClick={()=>onToggleFavorite(key)}>{favorite?'★':'☆'}</button></div>;})}</div>:<p className="muted">Finalize uma sessão para criar atalhos recentes de cliente e projeto.</p>}
    </Card>
  </section><aside className="focus-timer"><TimerPanel session={session} elapsed={elapsed} running={running} canStart={!!draft.activity.trim()} onToggle={onToggle} onFinish={onFinish} onOverlay={onOverlay}/>
    {session&&showValues&&<Card title="Valor da sessão"><p className="metric">{session.hourlyRate==null?'—':money(session.hourlyRate*elapsed/3600)}</p><p className="muted">Calculado pelo tempo efetivo em foco.</p></Card>}
    <p className="muted">Histórico e dados ficam neste computador.</p>
  </aside></div>;
}
