import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { App } from './App';

afterEach(cleanup);
const api=vi.mocked(window.foco.request);
function setup(status:string,fail=false,linked=false){
 let rows=[{id:'old',taskId:linked?'previous-task':null,activity:'Atual',client:'',project:'',details:'',consultant:'',cardReference:'',startAt:'2026-09-22T09:00:00Z',endAt:null,focusSeconds:120,plannedSeconds:0,hourlyRate:null,status,category:'Normal'}];
 api.mockReset();
 api.mockImplementation(async(path,method='GET',body)=>{
  if(path==='/api/planning/plans')return [{taskId:'previous-task',nextAction:'Retomar relatório'}] as never;
  if(path.startsWith('/api/planning/'))return Promise.resolve([]) as never;
  if(path==='/api/work-hours/intervals')return Promise.resolve([]);
  if(path==='/api/sessions'&&method==='GET')return rows as never;
  if(path.startsWith('/api/tasks?'))return [{id:'next',activity:'Entrega',state:'Pendente',completed:false,client:'',project:'',details:'',consultant:'',cardReference:'',hourlyRate:null,dueDate:null,entries:0,focusSeconds:0}] as never;
  if(path==='/api/catalogs')return {items:{clients:[],projects:[],activities:['Atual','Entrega']},possibleDuplicates:[]} as never;
  if(path==='/api/settings/colors')return [] as never;
  if(path==='/api/sessions/switch'){
   if(fail)throw new Error('Falha ao iniciar a nova tarefa');
   const input=body as {next:Record<string,unknown>};
   rows=[{...rows[0],...input.next,id:'new',status:'Em andamento',focusSeconds:0}];return rows[0] as never;
  }
  return {} as never;
 });
}
it.each(['Em andamento','Pausada'])('troca %s por outra tarefa sem diálogo de confirmação',async(status)=>{
 setup(status);render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
 await waitFor(()=>expect(screen.getByText(status==='Pausada'?'PAUSADA':'EM FOCO')).toBeInTheDocument());
 fireEvent.keyDown(window,{key:'t',altKey:true});
 fireEvent.click(await screen.findByRole('button',{name:'Iniciar'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/sessions/switch','POST',expect.objectContaining({previousId:'old',next:expect.objectContaining({taskId:'next',activity:'Entrega'})})));
 expect(screen.queryByRole('heading',{name:'Encerrar apontamento'})).not.toBeInTheDocument();
 expect(await screen.findByText('EM FOCO')).toBeInTheDocument();
});
it('exibe a falha da troca sem finalizar a sessão em uma chamada separada',async()=>{
 setup('Em andamento',true);render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));
 await screen.findByText('EM FOCO');fireEvent.keyDown(window,{key:'t',altKey:true});
 fireEvent.click(await screen.findByRole('button',{name:'Iniciar'}));
 expect(await screen.findByText('Falha ao iniciar a nova tarefa')).toBeInTheDocument();
 expect(api.mock.calls.some(([path])=>path.endsWith('/finish'))).toBe(false);
});

it('oferece próxima ação na troca vinculada e permite cancelar sem interromper',async()=>{
 setup('Em andamento',false,true);render(<App/>);await screen.findByText('Atual');
 fireEvent.keyDown(window,{key:'t',altKey:true});fireEvent.click(await screen.findByRole('button',{name:'Iniciar'}));
 await waitFor(()=>expect(screen.getByLabelText('Próxima ação (opcional)')).toHaveValue('Retomar relatório'));
 fireEvent.click(screen.getByText('Cancelar'));expect(api.mock.calls.some(([path])=>path.endsWith('/switch'))).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Iniciar'}));await waitFor(()=>expect(screen.getByLabelText('Próxima ação (opcional)')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Próxima ação (opcional)'),{target:{value:'Revisar conclusões'}});fireEvent.click(screen.getByRole('button',{name:'Trocar tarefa'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/sessions/switch','POST',expect.objectContaining({nextAction:'Revisar conclusões',previousId:'old'})));
 expect(localStorage.getItem('foco.draft.v1.next-action.previous-task')).toBeNull();
});

it('envia a próxima ação ao encerrar manualmente a tarefa vinculada',async()=>{
 setup('Em andamento',false,true);render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Apontar horas'}));await screen.findByText('EM FOCO');
 fireEvent.click(screen.getByRole('button',{name:'Encerrar'}));await waitFor(()=>expect(screen.getByLabelText('Próxima ação (opcional)')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Próxima ação (opcional)'),{target:{value:'Conferir amanhã'}});fireEvent.click(screen.getByRole('button',{name:'Encerrada'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/sessions/old/finish','POST',expect.objectContaining({nextAction:'Conferir amanhã',status:'Encerrada'})));
});
