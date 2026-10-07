import { cleanup,fireEvent,render,screen,within } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { TasksPage } from './pages/TasksPage';
import type { Catalogs,Session,Task } from './types';

const task:Task={id:'t1',client:'ACME',project:'Portal',activity:'Revisão',details:'Texto anterior',consultant:'Ana',cardReference:'CARD-1',hourlyRate:90,dueDate:'2026-10-10',completed:false,state:'Pendente',entries:0,focusSeconds:0};
const secondTask:Task={...task,id:'t2',client:'Beta',project:'Mobile',activity:'Teste',details:'Detalhe adicional',consultant:'Bia',hourlyRate:null,dueDate:null,completed:true,state:'Concluída',entries:2,focusSeconds:3600};
const history:Session={id:'s1',taskId:null,client:'ACME',project:'Aplicativo',activity:'Entrega',details:'Histórico',consultant:'Bruno',cardReference:'CARD-2',startAt:'2026-09-23T10:00:00Z',endAt:null,plannedSeconds:0,focusSeconds:60,hourlyRate:120,status:'Concluída',category:'Normal'};
const catalogs:Catalogs={items:{clients:['ACME','Beta','Outro'],projects:['Portal','Aplicativo','Mobile'],activities:['Revisão','Teste','Entrega']},possibleDuplicates:[]};
const props={items:[task],history:[history],catalogs,colors:[{client:' acme ',hex:'#123456'}],showValues:true,onSave:vi.fn().mockResolvedValue(undefined),onStart:vi.fn(),onComplete:vi.fn(),onStatusChange:vi.fn()};
afterEach(cleanup);

describe('quadro de tarefas',()=>{
 it('permite filtrar e selecionar o estado Aguardando',()=>{
  render(<TasksPage {...props} items={[{...task,state:'Aguardando'}]}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Aguardando'}));
  expect(screen.getByText('Texto anterior')).toBeInTheDocument();
  expect(screen.getByLabelText('Estado de Revisão')).toHaveValue('Aguardando');
 });
 it('marca cliente com cor cadastrada e permite escolher apenas cadastros existentes',()=>{
  const {container}=render(<TasksPage {...props}/>);
  expect(container.querySelector('.client-marker')?.getAttribute('style')).toContain('#123456');
  expect(container.querySelector('.project-label')?.getAttribute('style')).toContain('--client-color: #123456');
  fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
  const dialog=within(screen.getByRole('dialog'));
  expect(dialog.getByLabelText('Projeto')).toContainHTML('<option value="Portal">Portal</option>');
  expect(dialog.getByLabelText('Detalhamento')).not.toHaveAttribute('list');
  fireEvent.change(dialog.getByLabelText('Projeto'),{target:{value:'Aplicativo'}});
  expect(dialog.getByLabelText('Cliente')).toHaveValue('');
  expect(dialog.getByLabelText('Atividade *')).toHaveValue('');
  expect(dialog.getByLabelText('Consultor solicitante')).toHaveValue('');
 });
 it('mantém dados digitados ao escolher opção incompatível e não marca cliente sem cor',()=>{
  const {container}=render(<TasksPage {...props} colors={[]}/>);
  expect(container.querySelector('.client-marker')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
  const dialog=within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Cliente'),{target:{value:'Outro'}});
  fireEvent.change(dialog.getByLabelText('Projeto'),{target:{value:'Portal'}});
  expect(dialog.getByLabelText('Cliente')).toHaveValue('Outro');
  expect(dialog.getByLabelText('Atividade *')).toHaveValue('');
 });
 it('filtra por prazo e salva a data limite informada',async()=>{
  render(<TasksPage {...props}/>);
  expect(screen.getByText('10/10/2026')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Prazo até'),{target:{value:'2026-10-09'}});
  expect(screen.getByText(/Nenhuma tarefa encontrada/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Prazo até'),{target:{value:'2026-10-10'}});
  expect(screen.getByText('Revisão')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
  fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Entrega'}});
  fireEvent.change(screen.getByLabelText('Prazo limite'),{target:{value:'2026-10-20'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar tarefa'}));
  await vi.waitFor(()=>expect(props.onSave).toHaveBeenCalledWith(null,expect.objectContaining({activity:'Entrega',dueDate:'2026-10-20'})));
 });
 it('exibe o detalhamento e combina busca, filtros adicionais e estado',()=>{
  render(<TasksPage {...props} items={[task,secondTask]}/>);
  expect(screen.getByText('Texto anterior')).toBeInTheDocument();
  expect(screen.getByText('Detalhe adicional')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar em todos os campos'),{target:{value:'detalhe adicional'}});
  expect(screen.getByText('Teste')).toBeInTheDocument();
  expect(screen.queryByText('Revisão')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar em todos os campos'),{target:{value:''}});
  fireEvent.click(screen.getByText('Filtros adicionais'));
  fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'acme'}});
  expect(screen.getByText('Revisão')).toBeInTheDocument();
  expect(screen.queryByText('Teste')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Consultor'),{target:{value:'inexistente'}});
  expect(screen.getByText(/Nenhuma tarefa encontrada/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Consultor'),{target:{value:''}});
  fireEvent.click(screen.getByRole('checkbox',{name:'Em andamento'}));
  expect(screen.getByText(/Nenhuma tarefa encontrada/)).toBeInTheDocument();
 });
 it('filtra por vários estados, abre card/link e permite alterar estado manualmente',()=>{
  const active={...task,id:'active',state:'Em andamento',cardReference:'https://example.test/work'};
  render(<TasksPage {...props} items={[task,secondTask,active]}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Em andamento'}));
  fireEvent.click(screen.getByRole('checkbox',{name:'Concluída'}));
  expect(screen.getByText('Teste')).toBeInTheDocument();expect(screen.getByText('Revisão')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Abrir link'})).toHaveAttribute('href','https://example.test/work');
  fireEvent.change(screen.getByLabelText('Estado de Revisão'),{target:{value:'Concluída'}});
  expect(props.onStatusChange).toHaveBeenCalledWith(active,'Concluída');
  fireEvent.click(screen.getByRole('button',{name:'Limpar estados'}));
  expect(screen.getAllByText('Revisão')).toHaveLength(2);
 });
 it('abre o histórico local da tarefa',async()=>{
  (window.foco.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{id:'history-1',entityType:'task',entityId:task.id,changedAt:'2026-09-28T12:00:00-03:00',newValue:JSON.stringify(task)}]);
  render(<TasksPage {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:'Histórico'}));
  expect(await screen.findByRole('heading',{name:'Histórico · Revisão'})).toBeInTheDocument();
  expect(await screen.findByText(/Registro criado/)).toBeInTheDocument();
  expect(screen.queryByText('Antes')).not.toBeInTheDocument();
  expect(screen.getByText('Depois')).toBeInTheDocument();
 });
 it('mantém um protocolo não HTTP como texto, sem criar link executável',()=>{
  render(<TasksPage {...props} items={[{...task,cardReference:'javascript:alert(1)'}]}/>);
  expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
 it('ordena por prazo com valores ausentes no fim e inverte a direção escolhida',()=>{
  const earlier={...secondTask,id:'t3',activity:'Ajuste',dueDate:'2026-10-01',state:'Pendente',completed:false};
  render(<TasksPage {...props} items={[task,secondTask,earlier]}/>);
  const activities=()=>screen.getAllByRole('row').slice(1).map(row=>(row as HTMLTableRowElement).cells[1].textContent);
  expect(activities()).toEqual(['Ajuste','Revisão','Teste']);
  fireEvent.change(screen.getByLabelText('Direção'),{target:{value:'desc'}});
  expect(activities()).toEqual(['Revisão','Ajuste','Teste']);
  fireEvent.change(screen.getByLabelText('Ordenar por'),{target:{value:'state'}});
  fireEvent.change(screen.getByLabelText('Direção'),{target:{value:'asc'}});
  expect(activities()).toEqual(['Ajuste','Revisão','Teste']);
 });
});
