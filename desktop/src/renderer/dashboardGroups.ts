import type { GroupTotal } from './types';

export function visibleGroups(groups:GroupTotal[],all:boolean):GroupTotal[]{
 if(all||groups.length<=10)return groups;
 const rest=groups.slice(10);
 return [...groups.slice(0,10),{
  name:`Outros (${rest.length} grupos)`,parent:null,client:null,aggregate:true,
  sessions:rest.reduce((n,g)=>n+g.sessions,0),seconds:rest.reduce((n,g)=>n+g.seconds,0),
  value:rest.reduce((n,g)=>n+g.value,0),unpriced:rest.reduce((n,g)=>n+g.unpriced,0),
 }];
}
