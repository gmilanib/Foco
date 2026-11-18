import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { FocusPage,type Draft } from './pages/FocusPage';
import type { Catalogs,Session,Task } from './types';

const task:Task={id:'t1',client:'ACME',project:'Projeto Novo',activity:'Implantação',details:'',consultant:'Bruno',cardReference:'CARD-7',hourlyRate:90,dueDate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0};
const initial:Draft={client:'',project:'',activity:'',details:'Detalhe digitado',consultant:'',cardReference:'',hourlyRate:'',category:'Normal',mode:'Cronômetro',minutes:25};
const catalogs:Catalogs={items:{clients:['ACME'],projects:['Projeto Novo'],activities:['Implantação']},possibleDuplicates:[],projectClients:{'Projeto Novo':['ACME']}};
function Harness({items=[task],onStartTask,onToggle=()=>{},session=null,busy=false}:{items?:Task[];onStartTask?:(task:Task)=>void;onToggle?:()=>void;session?:Session|null;busy?:boolean}={}){const [draft,setDraft]=useState(initial);return <FocusPage onStartTask={onStartTask} busy={busy} draft={draft} setDraft={setDraft} session={session} elapsed={0} running={session?.status==='Em andamento'} showValues onToggle={onToggle} onFinish={()=>{}} onOverlay={()=>{}} onRetroactive={()=>{}} history={[]} tasks={items} catalogs={catalogs} quickPresets={[25]} favoriteKeys={[]} quickLimit={5} defaultRate="" onToggleFavorite={()=>{}}/>;}

describe('sugestões no formulário de foco',()=>{
 afterEach(cleanup);
 it('inicia foco na tarefa selecionada e volta ao rascunho ao limpar',()=>{
  const start=vi.fn(),toggle=vi.fn();render(<Harness onStartTask={start} onToggle={toggle}/>);
  fireEvent.change(screen.getByLabelText('Tarefa para apontar horas'),{target:{value:task.id}});
  fireEvent.click(screen.getByRole('button',{name:'Iniciar foco'}));
  expect(start).toHaveBeenCalledWith(task);expect(toggle).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Limpar seleção de tarefa'}));
  expect(screen.getByLabelText('Detalhamento')).toHaveValue('Detalhe digitado');
  expect(screen.getByRole('button',{name:'Iniciar foco'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Atividade (descrição macro)'),{target:{value:'Implantação'}});
  fireEvent.click(screen.getByRole('button',{name:'Iniciar foco'}));expect(toggle).toHaveBeenCalledOnce();
 });
 it('bloqueia iniciar foco com tarefa indisponível ou operação pendente',()=>{
  const start=vi.fn(),toggle=vi.fn();const view=render(<Harness onStartTask={start} onToggle={toggle}/>);
  fireEvent.change(screen.getByLabelText('Tarefa para apontar horas'),{target:{value:task.id}});
  for(const props of [{items:[{...task,state:'Aguardando'}]},{items:[{...task,completed:true}]},{busy:true}]){
   view.rerender(<Harness onStartTask={start} onToggle={toggle} {...props}/>);
   expect(screen.getByRole('button',{name:'Iniciar foco'})).toBeDisabled();
   fireEvent.click(screen.getByRole('button',{name:'Iniciar foco'}));
  }
  expect(start).not.toHaveBeenCalled();expect(toggle).not.toHaveBeenCalled();
 });
 it('mantém pausar e retomar na sessão atual mesmo com outra tarefa selecionada',()=>{
  const start=vi.fn(),toggle=vi.fn();
  const current:Session={...task,id:'session',taskId:'current',startAt:'2026-11-03T09:00:00Z',endAt:null,plannedSeconds:0,status:'Em andamento',category:'Normal'};
  const view=render(<Harness onStartTask={start} onToggle={toggle} session={current}/>);
  fireEvent.change(screen.getByLabelText('Tarefa para apontar horas'),{target:{value:task.id}});
  fireEvent.click(screen.getByRole('button',{name:'Pausar'}));
  view.rerender(<Harness onStartTask={start} onToggle={toggle} session={{...current,status:'Pausada'}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Retomar'}));
  expect(toggle).toHaveBeenCalledTimes(2);expect(start).not.toHaveBeenCalled();
 });
 it('oferece tarefas abertas de qualquer prazo e inicia com o vínculo existente',()=>{
  const start=vi.fn();render(<Harness onStartTask={start} items={[{...task,dueDate:'2020-01-01'},{...task,id:'done',completed:true},{...task,id:'closed',state:'Concluída'},{...task,id:'archived',archived:true},{...task,id:'archived-project',projectArchived:true}]}/>);
  const select=screen.getByLabelText('Tarefa para apontar horas') as HTMLSelectElement;
  expect(Array.from(select.options).map(option=>option.value)).toEqual(['',task.id]);
  expect(screen.getByRole('button',{name:'Iniciar tarefa'})).toBeDisabled();fireEvent.change(select,{target:{value:task.id}});fireEvent.click(screen.getByRole('button',{name:'Iniciar tarefa'}));
  expect(start).toHaveBeenCalledWith(expect.objectContaining({id:task.id,dueDate:'2020-01-01'}));
 });
 it('bloqueia tarefa aguardando e invalida seleção que foi concluída',()=>{
  const start=vi.fn();const view=render(<Harness onStartTask={start} items={[{...task,state:'Aguardando'}]}/>);
  fireEvent.change(screen.getByLabelText('Tarefa para apontar horas'),{target:{value:task.id}});expect(screen.getByRole('button',{name:'Iniciar tarefa'})).toBeDisabled();
  view.rerender(<Harness onStartTask={start} items={[task]}/>);expect(screen.getByRole('button',{name:'Iniciar tarefa'})).toBeEnabled();
  view.rerender(<Harness onStartTask={start} items={[{...task,completed:true}]}/>);expect(screen.getByLabelText('Tarefa para apontar horas')).toHaveValue('');expect(screen.getByRole('button',{name:'Iniciar tarefa'})).toBeDisabled();expect(start).not.toHaveBeenCalled();
 });
 it('sugere projeto e atribui consultor da combinação sem alterar os demais campos',()=>{
  render(<Harness/>);
  expect(screen.getByLabelText('Projeto')).not.toContainHTML('<option value="Projeto Novo">Projeto Novo</option>');
  fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'ACME'}});
  expect(screen.getByLabelText('Projeto')).toContainHTML('<option value="Projeto Novo">Projeto Novo</option>');
  fireEvent.change(screen.getByLabelText('Projeto'),{target:{value:'Projeto Novo'}});
  expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('ACME');
  expect((screen.getByLabelText('Atividade (descrição macro)') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Detalhamento') as HTMLTextAreaElement).value).toBe('Detalhe digitado');
  expect((screen.getByLabelText('Consultor solicitante') as HTMLInputElement).value).toBe('Bruno');
  fireEvent.change(screen.getByLabelText('Consultor solicitante'),{target:{value:'Consultor manual'}});
  fireEvent.change(screen.getByLabelText('Detalhamento'),{target:{value:'Novo detalhe'}});
  expect(screen.getByLabelText('Consultor solicitante')).toHaveValue('Consultor manual');
  fireEvent.change(screen.getByLabelText('Projeto'),{target:{value:''}});
  expect(screen.getByLabelText('Consultor solicitante')).toHaveValue('');
  expect((screen.getByLabelText('Card ou link do cronograma') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Valor por hora (R$)') as HTMLInputElement).value).toBe('');
 });
 it('remove a lista de sugestoes de detalhamento e ao apagar preserva o consultor',()=>{
  render(<Harness/>);
  expect(screen.queryByLabelText('Sugestões de detalhamento')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Detalhamento'),{target:{value:''}});
  expect((screen.getByLabelText('Consultor solicitante') as HTMLInputElement).value).toBe('');
 });
});
