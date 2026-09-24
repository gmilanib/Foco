import { describe,expect,it } from 'vitest';
import { buildFillSuggestions,valuesFor } from './fillSuggestions';
import type { Session,Task } from './types';

const session:Session={id:'s1',taskId:null,client:'ACME',project:'Projeto Azul',activity:'Revisão',details:'Validar entrega',consultant:'Ana',cardReference:'CARD-1',startAt:'2026-09-23T10:00:00Z',endAt:null,plannedSeconds:0,focusSeconds:60,hourlyRate:59.37,status:'Concluída',category:'Normal'};
const task:Task={id:'t1',client:'ACME',project:'Projeto Novo',activity:'Implantação',details:'',consultant:'Bruno',cardReference:'',hourlyRate:90.5,dueDate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0};

describe('autocomplete independente por campo',()=>{
 it('combina tarefas e lançamentos, sem descartar valores após 250 registros',()=>{
  const history=Array.from({length:260},(_,index)=>({...session,id:String(index),project:`Projeto ${index}`}));
  const items=buildFillSuggestions(history,[task]);
  expect(items).toHaveLength(261);
  expect(valuesFor(items,'project','259')).toEqual(['Projeto 259']);
 });
 it('filtra pelo texto digitado, sem usar outros campos e sem repetir o valor completo',()=>{
  const items=buildFillSuggestions([session],[task]);
  expect(valuesFor(items,'project','aZu')).toEqual(['Projeto Azul']);
  expect(valuesFor(items,'project','Projeto Azul')).toEqual([]);
  expect(valuesFor(items,'activity','inexistente')).toEqual([]);
 });
 it('formata valor por hora em português e limita a lista a 20 resultados',()=>{
  const items=buildFillSuggestions([session, ...Array.from({length:25},(_,i)=>({...session,id:`s${i}`,project:`P${i}`}))],[task]);
  expect(valuesFor(items,'hourlyRate')).toEqual(['90,5','59,37']);
  expect(valuesFor(items,'project')).toHaveLength(20);
 });
});
