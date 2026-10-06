import { Field } from './Field';

export type SortOption={value:string;label:string};
type Props={label:string;directionLabel?:string;value:string;options:SortOption[];direction:'asc'|'desc';onValue:(value:string)=>void;onDirection:(value:'asc'|'desc')=>void};

export function SortControls({label,directionLabel='Direção',value,options,direction,onValue,onDirection}:Props){
 return <div className="form-grid form-grid--four sort-controls">
  <Field label={label}><select value={value} onChange={event=>onValue(event.target.value)}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
  <Field label={directionLabel}><select value={direction} onChange={event=>onDirection(event.target.value as 'asc'|'desc')}><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></Field>
 </div>;
}
