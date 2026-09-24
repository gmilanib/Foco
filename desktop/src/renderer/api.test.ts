import { beforeEach,describe,expect,it,vi } from 'vitest';
import { dashboard } from './api';

describe('consulta do dashboard',()=>{
 beforeEach(()=>vi.mocked(window.foco.request).mockClear());
 it('omite filtros vazios para não zerar a consulta no backend',async()=>{
  await dashboard({group:'client',from:'',to:'',client:''});
  expect(window.foco.request).toHaveBeenCalledWith('/api/dashboard?group=client','GET',undefined);
 });
});
