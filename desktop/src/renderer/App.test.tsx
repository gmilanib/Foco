import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { App } from './App';

const api=window.foco.request as unknown as ReturnType<typeof vi.fn>;
afterEach(cleanup);

beforeEach(()=>{
 api.mockReset();
 api.mockImplementation((path:string,method='GET',body?:Record<string,unknown>)=>{
  if(path.startsWith('/api/planning/'))return Promise.resolve([]) as never;
  if(path==='/api/work-hours/intervals')return Promise.resolve([]);
  if(path.startsWith('/api/work-hours?'))return Promise.resolve({days:[],undefinedPeriods:[]});
  if(path.startsWith('/api/sessions')&&method==='GET')return Promise.resolve([]);
  if(path.startsWith('/api/tasks?'))return Promise.resolve([]);
  if(path==='/api/settings'&&method==='GET')return Promise.resolve({showValues:'true'});
  if(path==='/api/settings/colors')return Promise.resolve([]);
  if(path==='/api/catalogs')return Promise.resolve({items:{clients:['ACME','Outro','Beta'],projects:['P1','P2','Portal','Aplicativo','Mobile'],activities:['Revisão','Foco','Atividade de teste','Entrega','Teste']},possibleDuplicates:[]});
  if(path==='/api/sessions'&&method==='POST')return Promise.resolve({
   ...body,id:'timer-session',taskId:null,focusSeconds:0,endAt:null,hourlyRate:null,
  });
  return Promise.resolve({});
 });
});

describe('início do modo cronômetro',()=>{
 it('identifica a navegação e leva o foco ao título sem repetir a entrada da tela ao mudar o tema',async()=>{
  const {container}=render(<App/>);
  await screen.findByRole('heading',{name:'Tarefas e hoje'});
  expect(screen.getByRole('navigation',{name:'Navegação principal'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  expect(await screen.findByRole('heading',{name:'Lançamento'})).toHaveFocus();
  const content=container.querySelector('.page-content');
  fireEvent.change(screen.getByLabelText('Detalhamento'),{target:{value:'Meu rascunho'}});
  fireEvent.click(screen.getByRole('button',{name:'Ativar tema escuro'}));
  expect(container.querySelector('.page-content')).toBe(content);
  expect(screen.getByLabelText('Detalhamento')).toHaveValue('Meu rascunho');
  expect(screen.getByText(/Ao encerrar, o foco é arredondado/)).toHaveTextContent('2 minutos');
 });
 it('abre em Hoje e acessa captura rápida pelo atalho',async()=>{
  render(<App/>);
  expect(await screen.findByRole('heading',{name:'Tarefas e hoje'})).toBeInTheDocument();
  fireEvent.keyDown(window,{key:'q',altKey:true});
  expect(await screen.findByLabelText('Captura rápida')).toBeInTheDocument();
 });
 it('navega entre telas e controla o foco pelos atalhos Alt',async()=>{
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  await screen.findByRole('heading',{name:'Lançamento'});
  fireEvent.keyDown(window,{key:'t',altKey:true});
  expect(await screen.findByRole('heading',{name:'Tarefas e hoje'})).toBeInTheDocument();
  fireEvent.keyDown(window,{key:'f',altKey:true});
  expect(await screen.findByRole('heading',{name:'Lançamento'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Relatórios'}));
  expect(await screen.findByRole('heading',{name:'Relatório de horas'})).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Jornada e extra-time'})).not.toBeInTheDocument();
  fireEvent.keyDown(window,{key:'j',altKey:true});
  expect(await screen.findByRole('heading',{name:'Jornada'})).toBeInTheDocument();
  await waitFor(()=>expect(api).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/work-hours\?from=.*&to=/),'GET',undefined));
 });
 it('abre o lançamento retroativo pelo botão em Apontar horas',async()=>{
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  fireEvent.click(await screen.findByRole('button',{name:'Lançamento retroativo'}));
  expect(await screen.findByRole('heading',{name:'Lançamento retroativo'})).toBeInTheDocument();
 });
 it('não inicia sem atividade e cria uma sessão ilimitada depois de preenchê-la',async()=>{
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  const button=await screen.findByRole('button',{name:'Iniciar foco'});
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Atividade (descrição macro)'),{target:{value:'Atividade de teste'}});
  fireEvent.change(screen.getByLabelText('Categoria do apontamento'),{target:{value:'Agenda'}});
  await waitFor(()=>expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(await screen.findByText('EM FOCO')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/sessions','POST',expect.objectContaining({
   activity:'Atividade de teste',plannedSeconds:0,status:'Em andamento',category:'Agenda',
  }));
 });
 it('inicia o cronômetro com valor/hora decimal preenchido com ponto',async()=>{
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  fireEvent.change(await screen.findByLabelText('Atividade (descrição macro)'),{target:{value:'Atividade de teste'}});
  fireEvent.change(screen.getByLabelText('Valor por hora (R$)'),{target:{value:'59.37'}});
  fireEvent.click(screen.getByRole('button',{name:'Iniciar foco'}));
  expect(await screen.findByText('EM FOCO')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/sessions','POST',expect.objectContaining({hourlyRate:59.37}));
 });
});

describe('cores compartilhadas entre configurações e tarefas',()=>{
 it('aplica a nova cor sem reiniciar o aplicativo',async()=>{
  let colors:{client:string;hex:string}[]=[];
  api.mockImplementation((path:string,method='GET',body?:Record<string,string>)=>{
  if(path.startsWith('/api/planning/'))return Promise.resolve([]) as never;
  if(path==='/api/work-hours/intervals')return Promise.resolve([]);
   if(path==='/api/sessions')return Promise.resolve([]);
   if(path.startsWith('/api/tasks?'))return Promise.resolve([{id:'t1',client:'ACME',project:'Portal',activity:'Revisão',details:'',consultant:'',cardReference:'',hourlyRate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0}]);
   if(path==='/api/settings/colors'&&method==='GET')return Promise.resolve(colors);
   if(path==='/api/catalogs')return Promise.resolve({items:{clients:['ACME','Outro','Beta'],projects:['P1','P2','Portal','Aplicativo','Mobile'],activities:['Revisão','Foco','Atividade de teste','Entrega','Teste']},possibleDuplicates:[]});
   if(path==='/api/settings/colors'&&method==='PUT'){const saved={client:body?.client||'',hex:body?.hex||''};colors=[saved];return Promise.resolve(saved);}
   if(path==='/api/settings')return Promise.resolve({showValues:'false'});
   return Promise.resolve({});
  });
  const {container}=render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  fireEvent.click(screen.getByRole('button',{name:'Configurações'}));
  fireEvent.change(await screen.findByLabelText('Cliente'),{target:{value:'ACME'}});
  fireEvent.change(screen.getByLabelText('Cor'),{target:{value:'#123456'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar cor'}));
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/settings/colors','PUT',{client:'ACME',hex:'#123456'}));
  fireEvent.keyDown(window,{key:'t',altKey:true});
  await waitFor(()=>expect(container.querySelector('.client-marker')?.getAttribute('style')).toContain('#123456'));
 });
});

describe('exclusão de lançamentos no relatório',()=>{
 it('pede confirmação e exclui somente a sessão selecionada',async()=>{
  const entry={id:'entry-1',taskId:null,client:'ACME',project:'P1',activity:'Revisão',details:'',consultant:'',cardReference:'',startAt:'2026-09-23T10:00:00Z',endAt:'2026-09-23T11:00:00Z',plannedSeconds:0,focusSeconds:3600,hourlyRate:null,status:'Concluída'};
  let rows=[entry];
  api.mockImplementation((path:string,method='GET')=>{
  if(path.startsWith('/api/planning/'))return Promise.resolve([]) as never;
  if(path==='/api/work-hours/intervals')return Promise.resolve([]);
   if(path.startsWith('/api/sessions')&&method==='GET')return Promise.resolve(rows);
   if(path==='/api/sessions/entry-1'&&method==='DELETE'){rows=[];return Promise.resolve({});}
   if(path.startsWith('/api/tasks?'))return Promise.resolve([]);
   if(path==='/api/settings'&&method==='GET')return Promise.resolve({showValues:'false'});
   if(path==='/api/settings/colors')return Promise.resolve([]);
   if(path==='/api/catalogs')return Promise.resolve({items:{clients:['ACME'],projects:['P1'],activities:['Revisão']},possibleDuplicates:[]});
   return Promise.resolve({});
  });
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Relatórios'}));});
  fireEvent.click(await screen.findByRole('checkbox',{name:'Selecionar Revisão'}));
  fireEvent.click(screen.getByRole('button',{name:'Excluir selecionada'}));
  expect(screen.getByRole('heading',{name:'Excluir lançamento'})).toBeInTheDocument();
  expect(api).not.toHaveBeenCalledWith('/api/sessions/entry-1','DELETE',undefined);
  fireEvent.click(screen.getByRole('button',{name:'Excluir lançamento'}));
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/sessions/entry-1','DELETE',undefined));
  await waitFor(()=>expect(screen.queryByRole('heading',{name:'Excluir lançamento'})).not.toBeInTheDocument());
 });
});
