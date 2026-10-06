import { describe,expect,it } from 'vitest';
import { amount,clock,duration,hourInput,localDayStartIso,sessionCsv,workHoursCsv } from './format';
import type { Session } from './types';

const sample:Session={id:'1',taskId:null,client:'=SUM(1,1)',project:'Projeto "A"',activity:'Escrita',details:'',consultant:'',cardReference:'',startAt:'2026-09-23T10:00:00-03:00',endAt:null,plannedSeconds:0,focusSeconds:1800,hourlyRate:120,status:'Concluída',category:'Normal'};

describe('formatos do Foco',()=>{
 it('exporta o t?rmino escolhido e usa o dispon?vel em registros antigos',()=>{
  const row={...sample,endAt:'2026-09-23T10:07:00Z',roundedEndAt:'2026-09-23T10:10:00Z'};
  expect(sessionCsv([row],false)).toContain(row.endAt);
  expect(sessionCsv([row],false,'rounded')).toContain(row.roundedEndAt);
  expect(sessionCsv([{...row,roundedEndAt:null}],false,'rounded')).toContain(row.endAt);
 });
 it('converte limites de data para inicios de dias locais consecutivos',()=>{
  const day='2026-09-23';
  expect(new Date(localDayStartIso(day))).toEqual(new Date(2026,8,23));
  expect(new Date(localDayStartIso(day,1))).toEqual(new Date(2026,8,24));
 });
 it('converte valor/hora brasileiro com limites e rejeita formatos ambíguos',()=>{
  expect(hourInput('1.234,56')).toBe(1234.56);
  expect(hourInput('59.37')).toBe(59.37);
  expect(hourInput('59,37')).toBe(59.37);
  expect(hourInput('')).toBeNull();
  expect(()=>hourInput('-1')).toThrow();
  expect(()=>hourInput('12,345')).toThrow();
  expect(()=>hourInput('1.000.000,01')).toThrow('Informe de 0 a 1.000.000,00 ou deixe em branco.');
 });
 it('apresenta foco e custo calculados apenas sobre segundos efetivos',()=>{
  expect(clock(0.1)).toBe('00:01');
  expect(duration(3600)).toBe('1h 00min');
  expect(amount(sample)).toBe(60);
 });
 it('escapa aspas e neutraliza fórmulas do Excel; privacidade omite valores',()=>{
  const withValues=sessionCsv([sample],true);
  expect(withValues.startsWith('\uFEFF')).toBe(true);
  expect(withValues).toContain("\"'=SUM(1,1)\"");
  expect(withValues).toContain('"Projeto ""A"""');
  expect(withValues).toContain('Valor_hora_BRL');
 const privateCsv=sessionCsv([sample],false);
 expect(privateCsv).not.toContain('Valor_hora_BRL');
 expect(privateCsv).not.toContain('120');
 });
 it('exporta resumo diário e lacunas A definir no CSV',()=>{
  const csv=workHoursCsv({days:[{day:'2026-09-22',workedSeconds:32400,undefinedSeconds:3600,regularSeconds:28800,extraSeconds:3600,estimated:true}],undefinedPeriods:[{day:'2026-09-22',startAt:'2026-09-22T10:00:00-03:00',endAt:'2026-09-22T11:00:00-03:00',seconds:3600}]});
  expect(csv).toContain('Extra_time_segundos');expect(csv).toContain('"Estimado"');expect(csv).toContain('"A definir"');expect(csv).toContain('"3600"');
 });
});
