import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { CatalogsPage } from './pages/CatalogsPage';
import type { Catalogs } from './types';

const catalogs:Catalogs={items:{clients:['ACME'],projects:['Projeto Atlas','Projeto Atla'],activities:['Análise']},possibleDuplicates:[{type:'projects',first:'Projeto Atlas',second:'Projeto Atla',similarity:0.92}]};
afterEach(cleanup);

describe('cadastros centrais',()=>{
 it('apresenta possíveis duplicidades e só atualiza o histórico após confirmação manual',async()=>{
  const request=vi.mocked(window.foco.request);request.mockClear();
  const onChanged=vi.fn().mockResolvedValue(undefined);
  render(<CatalogsPage catalogs={catalogs} onChanged={onChanged}/>);
  fireEvent.click(screen.getByRole('tab',{name:'Projetos'}));
  expect(screen.getByText('92% parecido')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Manter “Projeto Atlas”'}));
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar unificação'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/catalogs/projects/merge','POST',{source:'Projeto Atla',target:'Projeto Atlas'}));
  expect(onChanged).toHaveBeenCalledOnce();
 });

 it('cria cadastro somente pelo espaço Cadastros',async()=>{
  const request=vi.mocked(window.foco.request);request.mockClear();
  render(<CatalogsPage catalogs={catalogs} onChanged={async()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Nome do cadastro'),{target:{value:' Novo cliente '}});
  fireEvent.click(screen.getByRole('button',{name:'Cadastrar'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/catalogs/clients','POST',{name:' Novo cliente '}));
 });
});
