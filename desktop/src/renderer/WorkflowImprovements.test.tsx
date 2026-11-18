import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { TasksPage } from './pages/TasksPage';
import { FocusPage,type Draft } from './pages/FocusPage';
import { CatalogsPage } from './pages/CatalogsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { Catalogs,Session,Task } from './types';

const catalogs:Catalogs={items:{clients:['A','B'],projects:['Projeto A','Projeto B'],activities:['Revisão','Entrega']},projectClients:{'Projeto A':['A'],'Projeto B':['B']},possibleDuplicates:[]};
const task:Task={id:'t',client:'A',project:'Projeto A',activity:'Revisão',details:'',consultant:'',cardReference:'',hourlyRate:null,dueDate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0};
const noop=vi.fn(),api=vi.mocked(window.foco.request);
const props={items:[task],history:[],catalogs,colors:[],showValues:false,onSave:vi.fn().mockResolvedValue(undefined),onStart:noop,onComplete:noop,onStatusChange:noop};
beforeEach(()=>{vi.clearAllMocks();api.mockImplementation(async(path)=>path==='/api/settings'?{}:[]);});
afterEach(cleanup);

it('começa com tarefas abertas e permite consultar concluídas explicitamente',()=>{
 render(<TasksPage {...props} items={[task,{...task,id:'done',activity:'Entrega',completed:true,state:'Concluída'}]}/>);
 expect(screen.getByText('Revisão')).toBeInTheDocument();expect(screen.queryByText('Entrega')).not.toBeInTheDocument();
 expect(screen.getByRole('checkbox',{name:'Concluída'})).not.toBeChecked();
 fireEvent.click(screen.getByRole('checkbox',{name:'Concluída'}));expect(screen.getByText('Entrega')).toBeInTheDocument();
});

it('salva estimativa opcional junto da tarefa e filtra projetos pelo cliente',async()=>{
 render(<TasksPage {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
 const form=within(screen.getByRole('dialog'));
 expect(form.getByLabelText('Projeto')).not.toHaveTextContent('Projeto A');
 fireEvent.change(form.getByLabelText('Cliente'),{target:{value:'A'}});
 expect(form.getByLabelText('Projeto')).toHaveTextContent('Projeto A');expect(form.getByLabelText('Projeto')).not.toHaveTextContent('Projeto B');
 fireEvent.change(form.getByLabelText('Projeto'),{target:{value:'Projeto A'}});
 fireEvent.change(form.getByLabelText('Cliente'),{target:{value:'B'}});expect(form.getByLabelText('Projeto')).toHaveValue('');
 fireEvent.change(form.getByLabelText('Atividade *'),{target:{value:'Revisão'}});
 fireEvent.change(form.getByLabelText('Estimativa da tarefa (minutos, opcional)'),{target:{value:'45'}});
 fireEvent.click(form.getByRole('button',{name:'Salvar tarefa'}));
 await waitFor(()=>expect(props.onSave).toHaveBeenCalledWith(null,expect.objectContaining({client:'B',project:'',estimateMinutes:'45'})));
});

it('recentes preenchem cliente, projeto e atividade mantendo o detalhamento digitado',()=>{
 const recent:Session={id:'s',taskId:null,client:'A',project:'Projeto A',activity:'Entrega',details:'Antigo',consultant:'',cardReference:'',hourlyRate:null,startAt:'2026-10-13T10:00:00Z',endAt:'2026-10-13T11:00:00Z',plannedSeconds:0,focusSeconds:3600,status:'Encerrada',category:'Normal'};
 function Harness(){const [draft,setDraft]=useState<Draft>({client:'B',project:'Projeto B',activity:'Revisão',details:'Rascunho',consultant:'',cardReference:'',hourlyRate:'',category:'Normal',mode:'Cronômetro',minutes:25});return <FocusPage draft={draft} setDraft={setDraft} session={null} elapsed={0} running={false} showValues={false} onToggle={noop} onFinish={noop} onOverlay={noop} onRetroactive={noop} history={[recent]} tasks={[]} catalogs={catalogs} quickPresets={[25]} favoriteKeys={[]} quickLimit={5} defaultRate="" onToggleFavorite={noop}/>;}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:/Projeto A Entrega/}));
 expect(screen.getByLabelText('Cliente')).toHaveValue('A');expect(screen.getByLabelText('Projeto')).toHaveValue('Projeto A');expect(screen.getByLabelText('Atividade (descrição macro)')).toHaveValue('Entrega');expect(screen.getByLabelText('Detalhamento')).toHaveValue('Rascunho');
});

it('exige cliente para criar projeto e mantém atividades globais',async()=>{
 render(<CatalogsPage catalogs={catalogs} onChanged={async()=>{}}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Projetos'}));fireEvent.change(screen.getByLabelText('Nome do cadastro'),{target:{value:'Novo'}});
 expect(screen.getByRole('button',{name:'Cadastrar'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Cliente do projeto'),{target:{value:'A'}});fireEvent.click(screen.getByRole('button',{name:'Cadastrar'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/catalogs/projects','POST',{name:'Novo',client:'A'}));
 fireEvent.click(screen.getByRole('tab',{name:'Atividades'}));expect(screen.queryByLabelText('Cliente do projeto')).not.toBeInTheDocument();expect(screen.getByText('Revisão')).toBeInTheDocument();
});

it('configura horas persistidas e preserva importação V35',async()=>{
 let stored='rounded';api.mockImplementation(async(path,method,body)=>{
  if(path==='/api/settings'){if(method==='PUT')stored=(body as Record<string,string>)['display.hoursMode'];return {'display.hoursMode':stored};}
  return [];
 });
 const settings={theme:'light',accent:'#0070F2',showValues:false,clients:[],onChange:async()=>{},onColorsChanged:async()=>{}};
 const first=render(<SettingsPage {...settings}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Preferências'}));
 expect(screen.queryByText('Importação inicial da V35')).toBeInTheDocument();
 expect(screen.getByLabelText('Horas exibidas em relatórios e tarefas')).toHaveValue('rounded');
 fireEvent.change(screen.getByLabelText('Horas exibidas em relatórios e tarefas'),{target:{value:'real'}});
 await screen.findByText('Preferência de horas salva.');first.unmount();render(<SettingsPage {...settings}/>);fireEvent.click(screen.getByRole('tab',{name:'Preferências'}));
 await waitFor(()=>expect(screen.getByLabelText('Horas exibidas em relatórios e tarefas')).toHaveValue('real'));
});
