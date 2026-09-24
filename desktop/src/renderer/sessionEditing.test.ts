import { describe,expect,it } from 'vitest';
import { focusSecondsBetween,localDateTimeInput,localDateTimeIso } from './sessionEditing';

describe('edição de horários de apontamentos',()=>{
 it('abre os horários no fuso local e salva sem deslocar o instante',()=>{
  const stored='2026-09-23T10:15:00-03:00';
  const input=localDateTimeInput(stored);
  expect(new Date(localDateTimeIso(input)).getTime()).toBe(new Date(stored).getTime());
 });
 it('calcula os segundos exatos entre início e término, inclusive na virada do dia',()=>{
  expect(focusSecondsBetween('2026-09-23T23:30','2026-09-24T01:00')).toBe(5400);
 });
 it('rejeita término igual ou anterior ao início',()=>{
  expect(()=>focusSecondsBetween('2026-09-23T10:00','2026-09-23T10:00')).toThrow('O término deve ocorrer depois do início.');
  expect(()=>focusSecondsBetween('2026-09-23T11:00','2026-09-23T10:00')).toThrow('O término deve ocorrer depois do início.');
 });
});
