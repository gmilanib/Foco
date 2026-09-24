import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { TasksPage } from './pages/TasksPage';
import type { Session,Task } from './types';

const task:Task={id:'t1',client:'ACME',project:'Portal',activity:'Revisão',details:'Texto anterior',consultant:'Ana',cardReference:'CARD-1',hourlyRate:90,dueDate:'2026-10-10',completed:false,state:'Pendente',entries:0,focusSeconds:0};
const history:Session={id:'s1',taskId:null,client:'ACME',project:'Aplicativo',activity:'Entrega',details:'Histórico',consultant:'Bruno',cardReference:'CARD-2',startAt:'2026-09-23T10:00:00Z',endAt:null,plannedSeconds:0,focusSeconds:60,hourlyRate:120,status:'Concluída',category:'Normal'};
const props={items:[task],history:[history],colors:[{client:' acme ',hex:'#123456'}],showValues:true,onSave:vi.fn().mockResolvedValue(undefined),onStart:vi.fn(),onComplete:vi.fn()};
afterEach(cleanup);

describe('quadro de tarefas',()=>{
 it('marca cliente com cor cadastrada e sugere só o campo digitado',()=>{
  const {container}=render(<TasksPage {...props}/>);
  expect(container.querySelector('.client-marker')?.getAttribute('style')).toContain('#123456');
  fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
  expect(screen.getByLabelText('Projeto (opcional)')).toHaveAttribute('list','task-suggestions-project');
  expect(screen.getByLabelText('Detalhamento')).not.toHaveAttribute('list');
  fireEvent.change(screen.getByLabelText('Projeto (opcional)'),{target:{value:'plic'}});
  expect(document.querySelector('#task-suggestions-project option')?.getAttribute('value')).toBe('Aplicativo');
  fireEvent.change(screen.getByLabelText('Projeto (opcional)'),{target:{value:'Aplicativo'}});
  expect(screen.getByLabelText('Cliente (opcional)')).toHaveValue('');
  expect(screen.getByLabelText('Atividade *')).toHaveValue('');
  expect(screen.getByLabelText('Consultor solicitante')).toHaveValue('');
 });
 it('mantém dados digitados ao escolher opção incompatível e não marca cliente sem cor',()=>{
  const {container}=render(<TasksPage {...props} colors={[]}/>);
  expect(container.querySelector('.client-marker')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
  fireEvent.change(screen.getByLabelText('Cliente (opcional)'),{target:{value:'Outro'}});
  fireEvent.change(screen.getByLabelText('Projeto (opcional)'),{target:{value:'Portal'}});
  expect(screen.getByLabelText('Cliente (opcional)')).toHaveValue('Outro');
  expect(screen.getByLabelText('Atividade *')).toHaveValue('');
 });
 it('filtra por prazo e salva a data limite informada',async()=>{
  render(<TasksPage {...props}/>);
  expect(screen.getByText('10/10/2026')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Prazo até'),{target:{value:'2026-10-09'}});
  expect(screen.getByText(/Nenhuma tarefa encontrada/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Prazo até'),{target:{value:'2026-10-10'}});
  expect(screen.getByText('Revisão')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
  fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Entrega nova'}});
  fireEvent.change(screen.getByLabelText('Prazo limite'),{target:{value:'2026-10-20'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar tarefa'}));
  await vi.waitFor(()=>expect(props.onSave).toHaveBeenCalledWith(null,expect.objectContaining({activity:'Entrega nova',dueDate:'2026-10-20'})));
 });
});
