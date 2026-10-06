import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterAll,afterEach,beforeAll,describe,expect,it,vi } from 'vitest';
import { SessionDialog } from './components/SessionDialog';
import { localDateTimeInput } from './sessionEditing';
import type { Catalogs,Session } from './types';

const session:Session={id:'edit-1',taskId:null,client:'ACME',project:'P1',activity:'Revisão',details:'',consultant:'Ana',cardReference:'',startAt:'2026-09-23T10:00:00-03:00',endAt:'2026-09-23T11:30:00-03:00',plannedSeconds:0,focusSeconds:5400,hourlyRate:120,status:'Concluída',category:'Normal'};
const catalogs:Catalogs={items:{clients:['ACME','Outro cliente'],projects:['P1'],activities:['Revisão']},possibleDuplicates:[]};
const showModal=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');
const closeDialog=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');

describe('edição de apontamento',()=>{
 beforeAll(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
  Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
 });
 afterEach(cleanup);
 afterAll(()=>{
  if(showModal)Object.defineProperty(HTMLDialogElement.prototype,'showModal',showModal);else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');
  if(closeDialog)Object.defineProperty(HTMLDialogElement.prototype,'close',closeDialog);else Reflect.deleteProperty(HTMLDialogElement.prototype,'close');
 });
 it('mantém os horários locais, mostra o foco recalculado e envia o novo total',async()=>{
  const onSave=vi.fn().mockResolvedValue(undefined);
  render(<SessionDialog session={session} catalogs={catalogs} showValues onClose={()=>{}} onSave={onSave}/>);
  expect((screen.getByLabelText('Início') as HTMLInputElement).value).toBe(localDateTimeInput(session.startAt));
  expect((screen.getByLabelText('Término') as HTMLInputElement).value).toBe(localDateTimeInput(session.endAt));
  fireEvent.change(screen.getByLabelText('Início'),{target:{value:'2026-09-23T09:00'}});
  fireEvent.change(screen.getByLabelText('Término'),{target:{value:'2026-09-23T12:00'}});
  expect((screen.getByLabelText('Tempo de foco') as HTMLInputElement).value).toBe('3h 00min');
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledOnce());
  const saved=onSave.mock.calls[0][0];
  expect(saved.focusSeconds).toBe(10800);
  expect(new Date(saved.startAt as string).getTime()).toBe(new Date('2026-09-23T09:00').getTime());
  expect(new Date(saved.endAt as string).getTime()).toBe(new Date('2026-09-23T12:00').getTime());
 });
 it('não salva horários iguais ou invertidos',async()=>{
  const onSave=vi.fn().mockResolvedValue(undefined);
  render(<SessionDialog session={session} catalogs={catalogs} showValues={false} onClose={()=>{}} onSave={onSave}/>);
  fireEvent.change(screen.getByLabelText('Término'),{target:{value:'2026-09-23T09:00'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('O término deve ocorrer depois do início.');
  expect(onSave).not.toHaveBeenCalled();
 });
 it('preserva duração efetiva e segundos originais em edição apenas descritiva',async()=>{
  const onSave=vi.fn().mockResolvedValue(undefined);
  const retro={...session,startAt:'2026-09-23T10:00:32-03:00',endAt:'2026-09-23T12:00:47-03:00',focusSeconds:4500};
  render(<SessionDialog session={retro} catalogs={catalogs} showValues={false} onClose={()=>{}} onSave={onSave}/>);
  expect((screen.getByLabelText('Tempo de foco') as HTMLInputElement).value).toBe('1h 15min');
  fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'Outro cliente'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(onSave).toHaveBeenCalledOnce());
  expect(onSave.mock.calls[0][0]).toMatchObject({startAt:retro.startAt,endAt:retro.endAt,focusSeconds:4500,client:'Outro cliente'});
 });
});
