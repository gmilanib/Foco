import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach,describe,expect,it } from 'vitest';
import { FocusPage,type Draft } from './pages/FocusPage';
import type { Catalogs,Task } from './types';

const task:Task={id:'t1',client:'ACME',project:'Projeto Novo',activity:'Implantação',details:'',consultant:'Bruno',cardReference:'CARD-7',hourlyRate:90,dueDate:null,completed:false,state:'Pendente',entries:0,focusSeconds:0};
const initial:Draft={client:'',project:'',activity:'',details:'Detalhe digitado',consultant:'',cardReference:'',hourlyRate:'',category:'Normal',mode:'Cronômetro',minutes:25};
const catalogs:Catalogs={items:{clients:['ACME'],projects:['Projeto Novo'],activities:['Implantação']},possibleDuplicates:[]};
function Harness(){const [draft,setDraft]=useState(initial);return <FocusPage draft={draft} setDraft={setDraft} session={null} elapsed={0} running={false} showValues onToggle={()=>{}} onFinish={()=>{}} onOverlay={()=>{}} onRetroactive={()=>{}} history={[]} tasks={[task]} catalogs={catalogs} quickPresets={[25]} favoriteKeys={[]} quickLimit={5} defaultRate="" onToggleFavorite={()=>{}}/>;}

describe('sugestões no formulário de foco',()=>{
 afterEach(cleanup);
 it('sugere projeto conforme o texto e altera somente o campo escolhido',()=>{
  render(<Harness/>);
  expect(screen.getByLabelText('Projeto')).toContainHTML('<option value="Projeto Novo">Projeto Novo</option>');
  fireEvent.change(screen.getByLabelText('Projeto'),{target:{value:'Projeto Novo'}});
  expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Atividade (descrição macro)') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Detalhamento') as HTMLTextAreaElement).value).toBe('Detalhe digitado');
  expect((screen.getByLabelText('Consultor solicitante') as HTMLInputElement).value).toBe('');
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
