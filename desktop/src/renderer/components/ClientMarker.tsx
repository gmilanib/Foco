import type { CSSProperties,ReactNode } from 'react';
import type { Color } from '../types';

export function clientColor(client:string,colors:Color[]=[]):string|undefined{
 const key=client.trim().toLocaleLowerCase('pt-BR');
 return key?colors.find(row=>row.client.trim().toLocaleLowerCase('pt-BR')===key)?.hex:undefined;
}

export function ClientMarker({client,colors=[],children}:{client:string;colors?:Color[];children?:ReactNode}){
 const hex=clientColor(client,colors);
 return <span className="client-label">{hex&&<i className="client-marker" style={{'--client-color':hex} as CSSProperties} aria-label={`Cor do cliente ${client}`}/>}<span>{children??client}</span></span>;
}

export function ClientColorPreview({client,colors}:{client:string;colors:Color[]}){
 const hex=clientColor(client,colors);
 return hex?<span className="client-color-preview" aria-hidden="true"><i className="client-marker" style={{'--client-color':hex} as CSSProperties}/></span>:null;
}
