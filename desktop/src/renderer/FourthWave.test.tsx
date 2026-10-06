import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { PlanningAnalysisPanel } from './components/PlanningAnalysisPanel';
import { DashboardPage } from './pages/DashboardPage';
import { visibleGroups } from './dashboardGroups';
import type { Dashboard } from './types';

afterEach(()=>{cleanup();vi.mocked(window.foco.request).mockReset().mockResolvedValue([]);});
const rows=Array.from({length:14},(_,i)=>({name:`Cliente ${i}`,parent:null,client:`Cliente ${i}`,sessions:1,seconds:(14-i)*60,value:i,unpriced:1}));
const data:Dashboard={groups:rows,projects:[],sessions:14,seconds:rows.reduce((n,g)=>n+g.seconds,0),value:91,unpriced:14};
const analysis={from:'2026-09-28',to:'2026-10-02',hoursMode:'real',unlinkedSeconds:600,
 tasks:[{id:'a',client:'ACME',project:'Projeto',activity:'Testar',details:'Fluxo',plannedDate:'2026-09-28',estimatedSeconds:3600,plannedSeconds:3600,actualSeconds:4200},{id:'b',client:'',project:'',activity:'Planejar',details:'',plannedDate:'2026-10-02',estimatedSeconds:null,plannedSeconds:0,actualSeconds:0}],
 projects:[{client:'ACME',name:'Projeto',estimatedSeconds:3600,plannedSeconds:3600,actualSeconds:4800,missingEstimates:1,unestimatedPlans:1,unlinkedSeconds:600}],
 weeks:[{start:'2026-09-28',plannedSeconds:3600,actualSeconds:4800,capacitySeconds:144000,unestimatedPlans:1,unlinkedSeconds:600}]};
function dates(){fireEvent.change(screen.getByLabelText('Início da comparação'),{target:{value:analysis.from}});fireEvent.change(screen.getByLabelText('Fim da comparação'),{target:{value:analysis.to}});}
it('conserva horas, valores e sessões em Outros, inclusive duração zero',()=>{
 const groups=visibleGroups(rows,false);expect(groups).toHaveLength(11);
 for(const key of ['seconds','value','sessions','unpriced'] as const)
  expect(groups.reduce((n,g)=>n+g[key],0)).toBe(rows.reduce((n,g)=>n+g[key],0));
 expect(visibleGroups(rows,true)).toEqual(rows);
 expect(visibleGroups(rows.map(g=>({...g,seconds:0})),false).at(-1)?.seconds).toBe(0);
});
it('distingue Outros de um grupo real com o mesmo nome e preserva lacunas',()=>{
 const groups=[{...rows[0],name:'Outros (5 grupos)'},...rows.slice(1),{...rows[0],name:'A definir (jornada)',client:null,seconds:300,value:0,sessions:0}];
 const visible=visibleGroups(groups,false);
 expect(visible[0].aggregate).toBeUndefined();expect(visible.at(-1)?.aggregate).toBe(true);
 expect(visible.reduce((n,g)=>n+g.seconds,0)).toBe(groups.reduce((n,g)=>n+g.seconds,0));
});
it('expande todos os grupos e guarda preferência sem alterar os totais',()=>{
 const props={data,colors:[],showValues:false,onRefresh:vi.fn(),onExportPdf:vi.fn()};
 const view=render(<DashboardPage {...props}/>);
 expect(screen.getAllByText(/Outros \(4 grupos\)/).length).toBeGreaterThan(0);
 expect(screen.queryByText('Cliente 13')).toBeNull();
 fireEvent.click(screen.getByLabelText('Mostrar todos os grupos (14)'));
 expect(screen.getAllByText('Cliente 13').length).toBeGreaterThan(0);
 expect(screen.queryByText(/Outros \(4 grupos\)/)).toBeNull();
 view.unmount();render(<DashboardPage {...props}/>);
 expect(screen.getByLabelText('Mostrar todos os grupos (14)')).toBeChecked();
});
it('compara pelo preload, mostra ausência de estimativas e pede atualização após mudar filtros',async()=>{
 vi.mocked(window.foco.request).mockResolvedValue(analysis);
 render(<PlanningAnalysisPanel/>);dates();fireEvent.click(screen.getByRole('button',{name:'Comparar horas'}));
 await screen.findByText('Testar · Fluxo');
 expect(window.foco.request).toHaveBeenCalledWith('/api/planning/analysis?from=2026-09-28&to=2026-10-02&hoursMode=real','GET',undefined);
 expect(screen.getAllByText('+0h 10min').length).toBeGreaterThan(0);
 const taskRow=screen.getByText('Planejar').closest('tr')!;
 expect(within(taskRow).getAllByText('Sem estimativa')).toHaveLength(3);
 expect(screen.getAllByText(/incompleto/).length).toBeGreaterThan(0);
 fireEvent.change(screen.getByLabelText('Horas realizadas na comparação'),{target:{value:'rounded'}});
 expect(screen.getByText(/Filtros alterados/)).toBeInTheDocument();expect(screen.queryByText('Testar · Fluxo')).toBeNull();
});
it('permite repetir após falha e não mostra resultados antigos',async()=>{
 vi.mocked(window.foco.request).mockResolvedValueOnce(analysis).mockRejectedValueOnce(new Error('Falha local')).mockResolvedValueOnce({...analysis,tasks:[],projects:[]});
 render(<PlanningAnalysisPanel/>);dates();fireEvent.click(screen.getByRole('button',{name:'Comparar horas'}));await screen.findByText('Testar · Fluxo');
 fireEvent.click(screen.getByRole('button',{name:'Comparar horas'}));await screen.findByRole('alert');
 expect(screen.queryByText('Testar · Fluxo')).toBeNull();expect(screen.getByRole('alert')).toHaveTextContent('Falha local');
 fireEvent.click(screen.getByRole('button',{name:'Comparar horas'}));await screen.findByText('Nenhuma tarefa planejada ou apontada no período.');
});
it('desabilita consulta sem data e enquanto carrega',async()=>{
 let resolve!:(value:unknown)=>void;
 vi.mocked(window.foco.request).mockImplementation(()=>new Promise(r=>{resolve=r;}) as never);
 render(<PlanningAnalysisPanel/>);dates();
 fireEvent.change(screen.getByLabelText('Início da comparação'),{target:{value:''}});expect(screen.getByRole('button',{name:'Comparar horas'})).toBeDisabled();
 dates();fireEvent.click(screen.getByRole('button',{name:'Comparar horas'}));expect(screen.getByRole('button',{name:'Comparando…'})).toBeDisabled();
 resolve(analysis);await waitFor(()=>expect(screen.getByRole('button',{name:'Comparar horas'})).toBeEnabled());
});
