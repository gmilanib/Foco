import { describe,expect,it } from 'vitest';
import { dashboardWithUndefined,undefinedSessions } from './undefinedTime';
import { sessionCsv } from './format';
import type { Dashboard } from './types';

const periods=[{day:'2026-09-22',startAt:'2026-09-22T10:00:00-03:00',endAt:'2026-09-22T11:00:00-03:00',seconds:3600}];
describe('tempo A definir nas consultas',()=>{
 it('gera lacunas sem entidade, preço ou vínculo e identifica o tipo no CSV',()=>{
  const rows=undefinedSessions(periods,{});
  expect(rows[0]).toMatchObject({virtual:true,activity:'A definir',client:'',project:'',hourlyRate:null,taskId:null});
  expect(sessionCsv(rows,true)).toContain('"3600";"A definir";"";"rounded";"real";"";""');
 });
 it('respeita datas e filtros sem atribuir lacunas globais a um cliente',()=>{
  const excluded:Record<string,string>[]=[{client:'ACME'},{project:'P1'},{consultant:'Ana'},{category:'Normal'},{status:'Concluída'},{from:'2026-09-23'},{to:'2026-09-21'},{activity:'Reunião'},{minHours:'2'},{maxHours:'0.5'},{minValue:'1'}];
  for(const filters of excluded)expect(undefinedSessions(periods,filters)).toEqual([]);
  expect(undefinedSessions(periods,{query:'a definir',from:'2026-09-22',to:'2026-09-22',minHours:'1',maxHours:'1'})).toHaveLength(1);
 });
 it('soma somente horas ao dashboard e não altera sessões, valores ou dados de origem',()=>{
  const data:Dashboard={sessions:2,seconds:7200,value:120,unpriced:1,groups:[],projects:[]};
  expect(dashboardWithUndefined(data,undefinedSessions(periods,{}))).toMatchObject({sessions:2,seconds:10800,value:120,unpriced:1,groups:[{name:'A definir (jornada)',seconds:3600,value:0,sessions:0}]});
  expect(data.seconds).toBe(7200);
  expect(dashboardWithUndefined(data,[])).toBe(data);
 });
});
