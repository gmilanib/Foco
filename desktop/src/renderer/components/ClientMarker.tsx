import { createContext,useContext,type CSSProperties,type ReactNode } from 'react';
export const ProjectColorSeeds=createContext<Record<string,number>>({});
import type { Color } from '../types';
export const ClientColors=createContext<Color[]>([]);

export function clientColor(client:string,colors:Color[]=[]):string|undefined{
 const key=client.trim().toLocaleLowerCase('pt-BR');
 return key?(colors.find(row=>row.client.trim().toLocaleLowerCase('pt-BR')===key)?.hex??automaticProjectColor(hash(key))):undefined;
}

export function ClientMarker({client,colors,children}:{client:string;colors?:Color[];children?:ReactNode}){
 const palette=useContext(ClientColors),hex=clientColor(client,colors??palette);
 return <span className="client-label">{hex&&<i className="client-marker" style={{'--client-color':hex} as CSSProperties} aria-label={`Cor do cliente ${client}`}/>}<span>{children??client}</span></span>;
}

export function ClientColorPreview({client,colors}:{client:string;colors:Color[]}){
 const hex=clientColor(client,colors);
 return hex?<span className="client-color-preview" aria-hidden="true"><i className="client-marker" style={{'--client-color':hex} as CSSProperties}/></span>:null;
}

export function ProjectMarker({project}:{client:string;project:string;colors:Color[]}){
 const seeds=useContext(ProjectColorSeeds),seed=seeds[project];
 const base=project?automaticProjectColor(seed??hash(project)):undefined;
 if(!project||!base)return <>{project||'—'}</>;
 const shade=100;
 return <span className="project-label" style={{'--client-color':base,'--project-mix':`${shade}%`} as CSSProperties}>
  <i aria-hidden="true"/><span>{project}</span>
 </span>;
}

function hash(value:string){return [...value].reduce((total,char)=>(total*31+char.charCodeAt(0))>>>0,7);}

function automaticProjectColor(seed:number){return `hsl(${seed%360} 65% 48%)`;}
export function projectColor(_client:string,project:string,_colors:Color[],seeds:Record<string,number>={}){
 const seed=seeds[project],base=project?automaticProjectColor(seed??hash(project)):undefined;
 return base;
}
