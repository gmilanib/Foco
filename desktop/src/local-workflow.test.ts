import { createRequire } from 'node:module';
import { describe,expect,it,vi } from 'vitest';
const {createLocalWorkflow}=createRequire(import.meta.url)('./local-workflow.cjs');
function fixture(saved?:unknown,register=true,supported=true){
 let clock=new Date('2026-10-06T09:00:00');
 const onNavigate=vi.fn(),onChanged=vi.fn(),saveState=vi.fn();
 const shortcut={register:vi.fn(()=>register),unregister:vi.fn()};
 const notices:{show:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>;click?:()=>void}[]=[];
 class Notice {
  static isSupported(){return supported;}
  show=vi.fn();close=vi.fn();click?:()=>void;
  constructor(){notices.push(this);}
  on(event:string,fn:()=>void){if(event==='click')this.click=fn;}
 }
 const workflow=createLocalWorkflow({globalShortcut:shortcut,Notification:Notice,onNavigate,onChanged,loadState:()=>saved,saveState:(state:unknown)=>saveState(structuredClone(state)),now:()=>clock});
 return {workflow,shortcut,onNavigate,onChanged,saveState,notices,time:(value:string)=>{clock=new Date(value);}};
}
describe('captura global',()=>{
 it('registra, troca e desativa atalho; descarte libera o registro',()=>{
  const f=fixture();f.workflow.configure({'capture.enabled':'true','capture.shortcut':'Ctrl+Alt+Q'});
  f.shortcut.register.mock.calls[0][1]?.();expect(f.onNavigate).toHaveBeenCalledWith('inbox');
  f.workflow.configure({'capture.enabled':'true','capture.shortcut':'Ctrl+Alt+W'});expect(f.shortcut.unregister).toHaveBeenCalledWith('Ctrl+Alt+Q');
  f.workflow.configure({'capture.enabled':'false'});expect(f.shortcut.unregister).toHaveBeenCalledWith('Ctrl+Alt+W');expect(f.workflow.status().shortcut.registered).toBe(false);
  f.workflow.configure({'capture.enabled':'true'});f.workflow.dispose();expect(f.shortcut.unregister).toHaveBeenCalledWith('Ctrl+Alt+Q');
 });
 it('informa conflito ou sintaxe inválida sem falsificar ativação',()=>{
  const f=fixture(undefined,false);f.workflow.configure({'capture.enabled':'true'});expect(f.workflow.status().shortcut.error).toMatch(/indisponível/);expect(f.workflow.status().shortcut.registered).toBe(false);
  f.shortcut.register.mockClear();f.workflow.configure({'capture.enabled':'true','capture.shortcut':'Q'});expect(f.shortcut.register).not.toHaveBeenCalled();expect(f.workflow.status().shortcut.error).toMatch(/inválido/);
 });
});
describe('lembretes locais',()=>{
 const enabled={'reminders.planning.enabled':'true','reminders.planning.time':'09:00','reminders.review.enabled':'true','reminders.review.time':'18:00'};
 it('notifica uma vez e mantém entrega após reiniciar, com abrir pela notificação',()=>{
  const f=fixture();f.workflow.configure(enabled);f.workflow.tick();expect(f.notices).toHaveLength(1);expect(f.workflow.status().pending).toEqual([{kind:'planning',day:'2026-10-06'}]);
  f.notices[0].click?.();expect(f.onNavigate).toHaveBeenCalledWith('today');expect(f.workflow.status().pending).toEqual([]);
  const restart=fixture(f.saveState.mock.calls.at(-1)?.[0]);restart.workflow.configure(enabled);expect(restart.notices).toHaveLength(0);
 });
 it('adia quinze minutos, preserva adiamento no reinício e silencia até a virada local do dia',()=>{
  const f=fixture();f.workflow.configure(enabled);f.workflow.action('planning','snooze');f.time('2026-10-06T09:14:59');f.workflow.tick();expect(f.notices).toHaveLength(1);
  const restart=fixture(f.saveState.mock.calls.at(-1)?.[0]);restart.time('2026-10-06T09:15:00');restart.workflow.configure(enabled);expect(restart.notices).toHaveLength(1);
  restart.workflow.action('planning','silence');restart.time('2026-10-06T18:00:00');restart.workflow.tick();expect(restart.notices).toHaveLength(1);expect(restart.workflow.status().silencedToday).toBe(true);
  restart.time('2026-10-07T09:00:00');restart.workflow.tick();expect(restart.notices).toHaveLength(2);
 });
 it('não acumula horários perdidos e mantém painel quando notificações não são suportadas',()=>{
  const f=fixture(undefined,true,false);f.time('2026-10-06T10:00:00');f.workflow.configure(enabled);expect(f.workflow.status().pending).toEqual([]);
  f.time('2026-10-06T18:00:00');f.workflow.tick();expect(f.notices).toHaveLength(0);expect(f.workflow.status().pending[0].kind).toBe('review');f.workflow.action('review','open');expect(f.onNavigate).toHaveBeenCalledWith('review');
 });
 it('desabilitar remove lembretes pendentes e não repete após dispensar',()=>{
  const f=fixture();f.workflow.configure(enabled);f.workflow.action('planning','dismiss');f.workflow.tick();expect(f.notices).toHaveLength(1);
  f.time('2026-10-06T18:00:00');f.workflow.tick();f.workflow.configure({});expect(f.workflow.status().pending).toEqual([]);expect(f.notices[1].close).toHaveBeenCalled();
  expect(()=>f.workflow.action('bad','open')).toThrow(/inválida/);
 });
});
