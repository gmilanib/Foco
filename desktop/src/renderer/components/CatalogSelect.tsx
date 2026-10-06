import { Field } from './Field';
import type { ReactNode } from 'react';

type Props={label:string;value:string;options:string[];onChange:(value:string)=>void;optional?:boolean;emptyLabel?:string;required?:boolean;preview?:ReactNode};

export function CatalogSelect({label,value,options,onChange,optional=false,emptyLabel='Selecione…',required=false,preview}:Props){
 return <Field label={label}><select value={value} required={required} onChange={e=>onChange(e.target.value)}>
  <option value="">{optional?'Sem '+label.toLocaleLowerCase('pt-BR'):emptyLabel}</option>
  {options.map(option=><option key={option} value={option}>{option}</option>)}
 </select>{preview}</Field>;
}
