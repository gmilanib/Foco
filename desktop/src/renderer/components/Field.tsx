import type { ReactNode } from 'react';

export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){
  return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
export function Card({title,children,actions}:{title:string;children:ReactNode;actions?:ReactNode}){
  return <section className="card"><header className="card__header"><h2>{title}</h2>{actions}</header>{children}</section>;
}
export function Empty({children}:{children:string}){return <div className="empty" role="status">{children}</div>;}
export function Status({value}:{value:string}){
  const kind=value==='Concluída'?'success':value==='Em andamento'?'warning':value==='Interrompida'?'error':'neutral';
  return <span className={`status status--${kind}`}>{value}</span>;
}
