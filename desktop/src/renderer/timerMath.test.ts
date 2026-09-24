import { describe,expect,it } from 'vitest';
import { timerStep } from './timerMath';

describe('acumulação do cronômetro',()=>{
 it('mantém o total igual ao tempo real após centenas de gravações',()=>{
  let saved=0,startedAt=1_000_000;
  for(let milliseconds=250;milliseconds<=30*60*1000;milliseconds+=250){
   const step=timerStep(saved,startedAt,1_000_000+milliseconds);
   expect(step.total).toBe(Math.floor(milliseconds/1000));
   saved=step.saved;startedAt=step.startedAt;
  }
  expect(saved).toBe(1800);
 });
 it('não avança quando o relógio monotônico recebe um valor anterior',()=>{
  expect(timerStep(120,1_000,900)).toMatchObject({total:120,saved:120,shouldSave:false});
 });
});
