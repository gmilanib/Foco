import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { ReportPage } from './pages/ReportPage';
import { TasksPage } from './pages/TasksPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionTaskDialog } from './components/SessionTaskDialog';
import { focusSeconds } from './hoursBasis';
import { sessionCsv,isoDay } from './format';
import { readView,oneOf } from './viewPreferences';
import type { Session,Task } from './types';

afterEach(cleanup);
beforeEach(()=>vi.mocked(window.foco.request).mockReset().mockResolvedValue([]));
const session:Session={id:'s',taskId:null,client:'ACME',project:'P',activity:'Teste',details:'Original',consultant:'',cardReference:'',startAt:'2026-10-01T09:00:00-03:00',endAt:'2026-10-01T09:15:00-03:00',roundedEndAt:'2026-10-01T09:18:00-03:00',plannedSeconds:0,focusSeconds:600,hourlyRate:120,status:'Encerrada',category:'Normal'};
const task:Task={id:'t',client:'ACME',project:'P',activity:'Teste',details:'Tarefa',consultant:'',cardReference:'',hourlyRate:120,dueDate:null,completed:false,state:'Pendente',entries:1,focusSeconds:600,realFocusSeconds:420};
const catalogs={items:{clients:['ACME'],projects:['P'],activities:['Teste']},possibleDuplicates:[]};
const noop=vi.fn();

it('preserva pausas, legados e lacunas e identifica as duas bases no CSV',()=>{
 expect(focusSeconds(session,'real')).toBe(420);
 expect(focusSeconds({...session,roundedEndAt:null},'real')).toBe(600);
 expect(focusSeconds({...session,endAt:null},'real')).toBe(600);
 expect(focusSeconds({...session,virtual:true},'real')).toBe(600);
 expect(focusSeconds({...session,focusSeconds:60},'real')).toBe(0);
 const csv=sessionCsv([session],true,'rounded','real');
 expect(csv).toContain('Base_horas');expect(csv).toContain('"420"');expect(csv).toContain('"14.00"');expect(csv).toContain('09:18');
 expect(sessionCsv([session],false,'real','rounded')).not.toContain('Custo_BRL');
 expect(session.focusSeconds).toBe(600);
});

it('aplica horas ao relatório e CSV sem mudar o registro passado à edição',async()=>{
 const exported=vi.fn(),edited=vi.fn(),refresh=vi.fn().mockResolvedValue(true);
 render(<ReportPage items={[session]} colors={[]} showValues onRefresh={refresh} onEdit={edited} onDelete={noop} onBatch={noop} onExport={exported}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Horas exibidas'),{target:{value:'real'}});
 expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar CSV'})).toBeEnabled());
 expect(screen.getAllByText('0h 07min').length).toBeGreaterThan(0);
 fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));expect(exported).toHaveBeenCalledWith([session],'real','real');
 fireEvent.click(screen.getByLabelText('Selecionar Teste'));fireEvent.click(screen.getByRole('button',{name:'Editar selecionada'}));
 expect(edited).toHaveBeenCalledWith(session);
 refresh.mockResolvedValue(false);fireEvent.change(screen.getByLabelText('Horas exibidas'),{target:{value:'rounded'}});fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
 await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(3));expect(screen.getByRole('button',{name:/Exportar CSV/})).toBeDisabled();
 expect(screen.getAllByText('0h 07min').length).toBeGreaterThan(0);
});

it('lembra base e ordenação de tarefas ao reabrir',()=>{
 const props={items:[task],history:[session],catalogs,colors:[],showValues:false,onSave:async()=>{},onStart:noop,onComplete:noop,onStatusChange:noop};
 const view=render(<TasksPage {...props}/>);
 fireEvent.change(screen.getByLabelText('Horas exibidas'),{target:{value:'real'}});
 expect(screen.getByText('0h 07min')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Ordenar por'),{target:{value:'activity'}});view.unmount();render(<TasksPage {...props}/>);
 expect(screen.getByLabelText('Horas exibidas')).toHaveValue('real');expect(screen.getByLabelText('Ordenar por')).toHaveValue('activity');
});

it('lembra o agrupamento do dashboard, mas abre datas atuais',async()=>{
 const refresh=vi.fn().mockResolvedValue(true),props={data:null,colors:[],showValues:false,onRefresh:refresh,onExportPdf:noop};
 const view=render(<DashboardPage {...props}/>);
 fireEvent.change(screen.getByLabelText('Agrupar por'),{target:{value:'project'}});
 fireEvent.change(screen.getByLabelText('Data inicial'),{target:{value:'2020-01-01'}});
 view.unmount();render(<DashboardPage {...props}/>);
 expect(screen.getByLabelText('Agrupar por')).toHaveValue('project');expect(screen.getByLabelText('Data inicial')).toHaveValue(isoDay(new Date()));
 localStorage.setItem('foco.view.v1.bad','{"sort":5}');expect(readView('bad','real',oneOf('real','rounded'))).toBe('real');
});

it('corrige vínculo por ação própria e conserva a seleção quando a API falha',async()=>{
 const changed=vi.fn(),close=vi.fn();vi.mocked(window.foco.request).mockRejectedValueOnce(new Error('Falha local')).mockResolvedValueOnce(session);
 render(<SessionTaskDialog session={session} tasks={[task]} onClose={close} onSaved={changed}/>);
 fireEvent.change(screen.getByLabelText('Tarefa vinculada'),{target:{value:'t'}});fireEvent.click(screen.getByRole('button',{name:'Salvar vínculo'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Falha local');expect(close).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Tarefa vinculada')).toHaveValue('t');fireEvent.click(screen.getByRole('button',{name:'Salvar vínculo'}));
 await waitFor(()=>expect(close).toHaveBeenCalled());
 expect(window.foco.request).toHaveBeenLastCalledWith('/api/sessions/s/task','PUT',{taskId:'t'});expect(changed).toHaveBeenCalledTimes(1);
});
