import { useState } from 'react';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { DraftRecovery,clearDraft } from './components/DraftRecovery';
import { NextActionField } from './components/NextActionField';
import { TasksPage } from './pages/TasksPage';
import { DailyReviewPanel } from './components/DailyReviewPanel';
import { Dialog } from './components/Dialog';

afterEach(cleanup);
function Form({id='test'}:{id?:string}){
 const [value,setValue]=useState({text:'',date:null as string|null});
 return <><DraftRecovery id={id} value={value} onRecover={setValue}/><input aria-label="Texto" value={value.text} onChange={e=>setValue({...value,text:e.target.value})}/><span>{value.date}</span></>;
}
it('recupera apenas por escolha, descarta e isola rascunhos por entidade',()=>{
 const first=render(<Form/>);fireEvent.change(screen.getByLabelText('Texto'),{target:{value:'Continuar amanhã'}});first.unmount();
 const second=render(<Form/>);expect(screen.getByLabelText('Texto')).toHaveValue('');fireEvent.click(screen.getByText('Recuperar rascunho'));expect(screen.getByLabelText('Texto')).toHaveValue('Continuar amanhã');second.unmount();
 const third=render(<Form id="outra"/>);expect(screen.queryByText('Recuperar rascunho')).not.toBeInTheDocument();third.unmount();
 render(<Form/>);fireEvent.click(screen.getByText('Descartar rascunho'));expect(localStorage.getItem('foco.draft.v1.test')).toBeNull();
});
it('recupera data opcional e ignora conteúdo incompatível ou corrompido',()=>{
 localStorage.setItem('foco.draft.v1.test',JSON.stringify({text:'Nota',date:'2026-10-01'}));const form=render(<Form/>);
 fireEvent.click(screen.getByText('Recuperar rascunho'));expect(screen.getByText('2026-10-01')).toBeInTheDocument();form.unmount();
 localStorage.setItem('foco.draft.v1.test','{"text":123}');const bad=render(<Form/>);expect(screen.queryByText('Recuperar rascunho')).not.toBeInTheDocument();bad.unmount();
 localStorage.setItem('foco.draft.v1.test','{');render(<Form/>);expect(screen.queryByText('Recuperar rascunho')).not.toBeInTheDocument();clearDraft('test');
});
it('mantém o formulário utilizável e avisa quando o armazenamento falha',()=>{
 const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('full');});
 render(<Form/>);fireEvent.change(screen.getByLabelText('Texto'),{target:{value:'Não perder'}});
 expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível guardar');expect(screen.getByLabelText('Texto')).toHaveValue('Não perder');write.mockRestore();
});
it('nova tarefa fica sem prazo por padrão e aceita prazo explícito',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);
 render(<TasksPage items={[]} history={[]} catalogs={{items:{clients:[],projects:[],activities:['Teste']},possibleDuplicates:[]}} colors={[]} showValues={false} onSave={save} onStart={vi.fn()} onComplete={vi.fn()} onStatusChange={vi.fn()}/>);
 fireEvent.click(screen.getByText('Nova tarefa'));expect(screen.getByLabelText('Prazo limite')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Atividade *'),{target:{value:'Teste'}});fireEvent.change(screen.getByLabelText('Prazo limite'),{target:{value:'2026-10-03'}});
 fireEvent.click(screen.getByText('Salvar tarefa'));await waitFor(()=>expect(save).toHaveBeenCalledWith(null,expect.objectContaining({dueDate:'2026-10-03'})));
 expect(localStorage.getItem('foco.draft.v1.task.new')).toBeNull();
});
it('carrega a próxima ação existente e permite limpá-la explicitamente',async()=>{
 vi.mocked(window.foco.request).mockResolvedValue([{taskId:'a',nextAction:'Rever testes'}]);const change=vi.fn();
 render(<NextActionField taskId="a" onChange={change}/>);
 await waitFor(()=>expect(screen.getByLabelText('Próxima ação (opcional)')).toHaveValue('Rever testes'));
 expect(change).toHaveBeenLastCalledWith(undefined);fireEvent.change(screen.getByLabelText('Próxima ação (opcional)'),{target:{value:''}});expect(change).toHaveBeenLastCalledWith('');
});
it('falha no carregamento não transforma a próxima ação em texto vazio',async()=>{
 vi.mocked(window.foco.request).mockRejectedValue(new Error('Falha local'));const change=vi.fn();
 render(<NextActionField taskId="a" onChange={change}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Falha local');expect(screen.getByLabelText('Próxima ação (opcional)')).toBeDisabled();expect(change).toHaveBeenLastCalledWith(undefined);
});
it('notas não salvas sobrevivem à navegação sem substituir a revisão salva',async()=>{
 vi.mocked(window.foco.request).mockImplementation(async path=>path.includes('/reviews/')?{day:'2026-09-30',notes:'Salva',reviewedAt:null}:{days:[],undefinedPeriods:[]});
 const props={day:'2026-09-30',tasks:[],plans:[],sessions:[],onPlan:vi.fn(),onJourney:vi.fn()};
 const first=render(<DailyReviewPanel {...props}/>);await waitFor(()=>expect(screen.getByLabelText('Notas da revisão')).toHaveValue('Salva'));
 fireEvent.change(screen.getByLabelText('Notas da revisão'),{target:{value:'Rascunho'}});first.unmount();render(<DailyReviewPanel {...props}/>);
 await screen.findByText('Recuperar rascunho');expect(screen.getByLabelText('Notas da revisão')).toHaveValue('Salva');fireEvent.click(screen.getByText('Recuperar rascunho'));expect(screen.getByLabelText('Notas da revisão')).toHaveValue('Rascunho');
});
it('diálogo tem nome acessível e devolve o foco ao fechar',()=>{
 function Host(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Abrir</button>{open&&<Dialog title="Planejamento" onClose={()=>setOpen(false)}>Conteúdo</Dialog>}</>;}
 render(<Host/>);screen.getByText('Abrir').focus();fireEvent.click(screen.getByText('Abrir'));expect(screen.getByRole('dialog',{name:'Planejamento'})).toBeInTheDocument();fireEvent.click(screen.getByLabelText('Fechar diálogo'));expect(screen.getByText('Abrir')).toHaveFocus();
});
