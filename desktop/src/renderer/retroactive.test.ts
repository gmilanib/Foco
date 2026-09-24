import { describe,expect,it } from 'vitest';
import { effectiveFocusMinutes,intervalMinutes,overlappingSessions } from './retroactive';
import type { Session } from './types';

const existing:Session={id:'one',taskId:null,client:'ACME',project:'P1',activity:'Revisão',details:'',consultant:'',cardReference:'',startAt:'2026-09-22T09:00:00-03:00',endAt:'2026-09-22T10:00:00-03:00',plannedSeconds:0,focusSeconds:3600,hourlyRate:null,status:'Concluída',category:'Normal'};

describe('lançamento retroativo',()=>{
 it('sugere o intervalo e aceita foco efetivo menor',()=>{
  const interval=intervalMinutes('2026-09-22T09:00:00-03:00','2026-09-22T11:00:00-03:00');
  expect(interval).toBe(120);
  expect(effectiveFocusMinutes('1','15',interval!)).toBe(75);
 });
 it('rejeita foco zero, minutos fora do relógio e foco maior que o intervalo',()=>{
  expect(()=>effectiveFocusMinutes('0','0',120)).toThrow();
  expect(()=>effectiveFocusMinutes('0','60',120)).toThrow();
  expect(()=>effectiveFocusMinutes('2','1',120)).toThrow('não pode exceder');
  expect(()=>effectiveFocusMinutes('','15',120)).toThrow();
  expect(intervalMinutes('2026-09-22T11:00:00-03:00','2026-09-22T09:00:00-03:00')).toBeNull();
 });
 it('avisa somente sobre intervalos que realmente se cruzam, inclusive apontamentos abertos',()=>{
  expect(overlappingSessions([existing],'2026-09-22T09:30:00-03:00','2026-09-22T10:30:00-03:00')).toHaveLength(1);
  expect(overlappingSessions([existing],'2026-09-22T10:00:00-03:00','2026-09-22T11:00:00-03:00')).toHaveLength(0);
  expect(overlappingSessions([{...existing,endAt:null}],'2026-09-22T10:00:00-03:00','2026-09-22T11:00:00-03:00',new Date('2026-09-22T12:00:00-03:00'))).toHaveLength(1);
 });
});
