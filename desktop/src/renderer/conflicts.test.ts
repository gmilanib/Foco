import { describe,expect,it } from 'vitest';
import { occupiedSeconds,sessionConflicts } from './conflicts';
import { overlappingSessions } from './retroactive';
import type { Session,WorkInterval } from './types';

const at=(time:string)=>`2026-09-22T${time}:00-03:00`;
const row=(id:string,start:string,end:string):Session=>({id,activity:id,taskId:null,client:'',project:'',details:'',consultant:'',cardReference:'',startAt:at(start),endAt:at(end),focusSeconds:3600,plannedSeconds:0,hourlyRate:null,status:'Concluída',category:'Normal'});
const span=(sessionId:string,start:string,end:string):WorkInterval=>({sessionId,startAt:at(start),endAt:at(end),lastTickAt:at(end),precision:'Precisa'});
describe('revisão de conflitos',()=>{
 it('aponta 30 minutos de sobreposição e 90 minutos ocupados, sem alterar o foco',()=>{
  const rows=[row('A','09:00','10:00'),row('B','09:30','10:30')];
  expect(sessionConflicts(rows)).toMatchObject([{seconds:1800,estimated:true}]);
  expect(occupiedSeconds(rows)).toBe(5400);
  expect(rows.reduce((n,s)=>n+s.focusSeconds,0)).toBe(7200);
 });
 it('não trata horários adjacentes nem a própria sessão como conflito',()=>{
  const a=row('A','09:00','10:00');
  expect(sessionConflicts([a,a,row('B','10:00','11:00')])).toEqual([]);
 });
 it('respeita pausas precisas tanto na revisão como no lançamento retroativo',()=>{
  const a={...row('A','09:00','12:00'),workIntervals:[span('A','09:00','10:00'),span('A','11:00','12:00')]};
  expect(sessionConflicts([a,row('B','10:00','11:00')])).toEqual([]);
  expect(overlappingSessions([a],at('10:00'),at('11:00'))).toEqual([]);
  expect(sessionConflicts([a,{...row('C','09:30','10:30'),workIntervals:[span('C','09:30','10:30')]}])[0]).toMatchObject({seconds:1800,estimated:false});
 });
 it('não soma em duplicidade trechos sobrepostos entre três atividades',()=>{
  expect(occupiedSeconds([row('A','09:00','10:00'),row('B','09:15','10:00'),row('C','09:30','10:00')])).toBe(3600);
 });
 it('limita intervalos ativos à última marcação e ignora intervalos inválidos',()=>{
  const a={...row('A','09:00','10:00'),endAt:null,workIntervals:[{...span('A','09:00','09:30'),endAt:null}]};
  expect(sessionConflicts([a,row('B','09:30','10:00')])).toEqual([]);
  expect(occupiedSeconds([row('bad','11:00','10:00')])).toBe(0);
 });
});
