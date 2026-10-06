import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { ChecklistDialog,type ChecklistStep } from './components/ChecklistDialog';
import { TaskTemplatesPanel } from './components/TaskTemplatesPanel';
import { TasksPage } from './pages/TasksPage';
import { CatalogsPage } from './pages/CatalogsPage';
import { availableCatalogs,isArchived } from './organization';
import type { TaskTemplate } from './planning';
import type { Task,Catalogs } from './types';
const api=window.foco.request as ReturnType<typeof vi.fn>;
const task:Task={id:'a',activity:'Entrega',client:'Cliente',project:'Projeto',details:'Contexto',consultant:'',cardReference:'',hourlyRate:null,dueDate:null,completed:false,state:'Pendente',entries:1,focusSeconds:600};
const catalogs:Catalogs={items:{clients:['Cliente'],projects:['Projeto','Antigo'],activities:['Entrega']},possibleDuplicates:[],archivedProjects:['Antigo']};
const template:TaskTemplate={id:'m',sourceId:'a',name:'Revisar',recurrence:'weekly',nextDate:'2026-10-02',paused:false};
const changed=vi.fn().mockResolvedValue(undefined);
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();api.mockResolvedValue([]);});
afterEach(cleanup);
it('checklist cria, marca, renomeia e remove passos sem chamadas de conclusão ou apontamento',async()=>{
 let steps:ChecklistStep[]=[];
 api.mockImplementation((_path:string,method='GET',body?:{title:string;completed:boolean})=>{
  if(method==='POST')steps=[{id:'s',taskId:'a',title:body!.title,completed:false,position:1}];
  if(method==='PUT')steps=[{...steps[0],...body}];
  if(method==='DELETE')steps=[];
  return Promise.resolve(method==='GET'?steps:steps[0]);
 });
 render(<ChecklistDialog task={task} onClose={vi.fn()} onChanged={changed}/>);
 fireEvent.change(await screen.findByLabelText('Novo passo'),{target:{value:'Conferir testes'}});
 fireEvent.click(screen.getByRole('button',{name:'Adicionar passo'}));
 expect(await screen.findByLabelText('Conferir testes')).toBeInTheDocument();
 await waitFor(()=>expect(screen.getByLabelText('Conferir testes')).toBeEnabled());
 fireEvent.click(screen.getByLabelText('Conferir testes'));
 await waitFor(()=>expect(screen.getByLabelText('Conferir testes')).toBeChecked());
 await waitFor(()=>expect(screen.getByRole('button',{name:'Editar passo'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Editar passo'}));
 fireEvent.change(screen.getByLabelText('Editar texto do passo'),{target:{value:'Validar entrega'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar passo'}));
 expect(await screen.findByLabelText('Validar entrega')).toBeChecked();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Remover passo'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Remover passo'}));
 await waitFor(()=>expect(screen.queryByLabelText('Validar entrega')).not.toBeInTheDocument());
 expect(api.mock.calls.every(([path])=>path.startsWith('/api/tasks/a/checklist'))).toBe(true);
 expect(changed).toHaveBeenCalledTimes(4);
});
it('falha de checklist mantém o texto para nova tentativa e tarefa arquivada é somente leitura',async()=>{
 api.mockImplementation((_path:string,method='GET')=>method==='POST'?Promise.reject(new Error('Falha local')):Promise.resolve([]));
 const view=render(<ChecklistDialog task={task} onClose={vi.fn()} onChanged={changed}/>);
 fireEvent.change(await screen.findByLabelText('Novo passo'),{target:{value:'Não perder'}});fireEvent.click(screen.getByRole('button',{name:'Adicionar passo'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Falha local');expect(screen.getByLabelText('Novo passo')).toHaveValue('Não perder');
 view.unmount();api.mockResolvedValue([{id:'s',taskId:'a',title:'Passo',completed:false,position:1}]);
 render(<ChecklistDialog task={{...task,projectArchived:true}} onClose={vi.fn()} onChanged={changed}/>);
 expect(await screen.findByLabelText('Passo')).toBeDisabled();expect(screen.queryByLabelText('Novo passo')).not.toBeInTheDocument();
});
function tasksView(items:Task[]){return render(<TasksPage items={items} history={[]} catalogs={catalogs} colors={[]} showValues={false} onChanged={changed} onSave={vi.fn()} onStart={vi.fn()} onComplete={vi.fn()} onStatusChange={vi.fn()}/>);}
it('filtra arquivadas e confirma restauração preservando a necessidade de restaurar projeto',async()=>{
 tasksView([task,{...task,id:'b',activity:'Arquivada',archived:true,projectArchived:true}]);
 expect(screen.queryByText('Arquivada')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Arquivamento'),{target:{value:'archived'}});
 expect(screen.getByText('Arquivada')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Iniciar'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Restaurar tarefa'}));expect(api).not.toHaveBeenCalled();
 expect(screen.getByText(/projeto também precisa ser restaurado/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Confirmar restauração'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/tasks/b/archive','PUT',{archived:false}));
 await waitFor(()=>expect(changed).toHaveBeenCalled());
});
it('arquivamento de tarefa exige confirmação e exibe falha sem perder a lista',async()=>{
 api.mockRejectedValue(new Error('Encerre o apontamento ativo'));
 tasksView([task]);fireEvent.click(screen.getByRole('button',{name:'Arquivar tarefa'}));expect(api).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Confirmar arquivamento'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Encerre o apontamento ativo');expect(screen.getAllByText('Entrega').length).toBeGreaterThan(0);expect(changed).not.toHaveBeenCalled();
});
it('cadastros mostram arquivados e restauram projeto com confirmação',async()=>{
 render(<CatalogsPage catalogs={catalogs} onChanged={changed}/>);fireEvent.click(screen.getByRole('tab',{name:'Projetos'}));
 expect(screen.queryByText('Antigo · Arquivado')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Arquivamento dos projetos'),{target:{value:'archived'}});
 fireEvent.click(screen.getByRole('button',{name:'Restaurar projeto'}));expect(api).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Confirmar alteração'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/catalogs/projects/Antigo/archive','PUT',{archived:false}));
});
it('edição de modelo mantém id e salva mensal com dia 31',async()=>{
 render(<TaskTemplatesPanel templates={[template]} tasks={[task]} onChanged={changed}/>);
 fireEvent.click(screen.getByRole('button',{name:'Editar modelo'}));
 fireEvent.change(screen.getByLabelText('Nome do modelo'),{target:{value:'Fechamento'}});
 fireEvent.change(screen.getByLabelText('Frequência'),{target:{value:'monthly'}});
 fireEvent.change(screen.getByLabelText('Dia do mês'),{target:{value:'31'}});
 fireEvent.change(screen.getByLabelText('Próxima ocorrência'),{target:{value:'2026-10-31'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar modelo'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/planning/templates/m','PUT',expect.objectContaining({name:'Fechamento',recurrence:'monthly',monthDay:31,nextDate:'2026-10-31'})));
 expect(api.mock.calls.some(([,method])=>method==='DELETE')).toBe(false);
});
it('pausa e retoma mantendo a data e os parâmetros de recorrência',async()=>{
 const view=render(<TaskTemplatesPanel templates={[template]} tasks={[task]} onChanged={changed}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pausar recorrência'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/planning/templates/m','PUT',expect.objectContaining({paused:true,nextDate:'2026-10-02',recurrence:'weekly'})));
 view.unmount();render(<TaskTemplatesPanel templates={[{...template,paused:true}]} tasks={[task]} onChanged={changed}/>);
 expect(screen.getByText(/Pausado/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Retomar recorrência'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/planning/templates/m','PUT',expect.objectContaining({paused:false})));
});
it('modelo com origem arquivada bloqueia uso manual e conserva edição',()=>{
 render(<TaskTemplatesPanel templates={[{...template,sourceArchived:true}]} tasks={[]} onChanged={changed}/>);
 expect(screen.getByRole('button',{name:'Usar modelo'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Editar modelo'}));
 expect(screen.getByLabelText('Tarefa de origem')).toHaveValue('a');
});
it('cria modelo em dias específicos e mantém formulário quando a API rejeita a data',async()=>{
 api.mockRejectedValue(new Error('A próxima data deve corresponder aos dias escolhidos.'));
 render(<TaskTemplatesPanel templates={[]} tasks={[task]} onChanged={changed}/>);
 fireEvent.click(screen.getByRole('button',{name:'Novo modelo'}));fireEvent.change(screen.getByLabelText('Tarefa de origem'),{target:{value:'a'}});fireEvent.change(screen.getByLabelText('Nome do modelo'),{target:{value:'Semana'}});
 fireEvent.change(screen.getByLabelText('Frequência'),{target:{value:'weekdays'}});fireEvent.click(screen.getByLabelText('Quarta'));
 fireEvent.change(screen.getByLabelText('Próxima ocorrência'),{target:{value:'2026-10-02'}});fireEvent.click(screen.getByRole('button',{name:'Salvar modelo'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('dias escolhidos');expect(screen.getByLabelText('Nome do modelo')).toHaveValue('Semana');
 expect(api).toHaveBeenCalledWith('/api/planning/templates','POST',expect.objectContaining({weekdays:[1,3],monthDay:null}));
});
it('seleção de projetos disponíveis preserva o catálogo completo para relatórios e edição histórica',()=>{
 expect(availableCatalogs(catalogs).items.projects).toEqual(['Projeto']);expect(catalogs.items.projects).toEqual(['Projeto','Antigo']);
 expect(isArchived({...task,projectArchived:true})).toBe(true);expect(isArchived(task)).toBe(false);
});
