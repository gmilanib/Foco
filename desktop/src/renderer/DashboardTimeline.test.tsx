import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { DashboardTimeline } from './components/DashboardTimeline';
import { hourlyTimelineTicks,timelineDays,shiftTimeline,timelineGroups,timelineScale } from './dashboardTimeline';
import { timelineSegments } from './timeline';
import type { Session } from './types';

const {load}=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('./api',()=>({sessions:load,safeMessage:(e:Error)=>e.message}));
const row:Session={id:'test',taskId:null,client:'Cliente',project:'Projeto',activity:'Implementação',details:'',consultant:'',cardReference:'',startAt:'2026-11-03T09:00:00',endAt:'2026-11-03T11:00:00',plannedSeconds:0,focusSeconds:5400,hourlyRate:null,status:'Concluída',category:'Normal',workIntervals:[{sessionId:'test',startAt:'2026-11-03T09:00:00',endAt:'2026-11-03T10:00:00',lastTickAt:'2026-11-03T10:00:00',precision:'Precisa'},{sessionId:'test',startAt:'2026-11-03T10:30:00',endAt:'2026-11-03T11:00:00',lastTickAt:'2026-11-03T11:00:00',precision:'Precisa'}]};
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('timeline do dashboard',()=>{
 it('recorta cada jornada, remove noites e dias vazios e mantém lacunas internas',()=>{
  const segment=(start:string,end:string)=>({...timelineSegments([row],'2026-11-03')[0],start:new Date(start).getTime(),end:new Date(end).getTime()});
  const first=segment('2026-11-03T09:00:00','2026-11-03T10:00:00');
  const last=segment('2026-11-03T11:00:00','2026-11-03T12:00:00');
  const next=segment('2026-11-05T14:00:00','2026-11-05T15:00:00');
  const scale=timelineScale([{day:'2026-11-03',segments:[last,first]},{day:'2026-11-04',segments:[]},{day:'2026-11-05',segments:[next]}]);
  expect(scale.windows).toHaveLength(2);
  expect(scale.windows[0].gaps).toEqual([{start:first.end,end:last.start}]);
  expect(scale.position(first.start)).toBe(0);
  expect(scale.position(first.end)).toBe(25);
  expect(scale.position(last.start)).toBe(50);
  expect(scale.position(last.end)).toBe(75);
  expect(scale.position(next.start)).toBe(75);
  expect(scale.position(next.end)).toBe(100);
  expect(timelineScale([]).position(0)).toBe(0);
 });
 it('não cria lacunas falsas em sobreposições e preserva estimativas e sessões abertas',()=>{
  const open={...row,endAt:null,workIntervals:row.workIntervals?.map(i=>({...i,endAt:null}))};
  const estimated={...row,id:'legacy',workIntervals:[]};
  const segments=timelineSegments([open,estimated],'2026-11-03');
  const scale=timelineScale([{day:'2026-11-03',segments}]);
  expect(scale.windows[0].gaps).toEqual([]);
  expect(scale.position(new Date(row.startAt).getTime())).toBe(0);
  expect(scale.position(new Date(row.endAt!).getTime())).toBe(100);
  expect(segments.some(s=>s.provisional)).toBe(true);
 });
 it('identifica visualmente lacunas internas e remove dias vazios na semana',async()=>{
  const later={...row,id:'later',startAt:'2026-11-03T13:00:00',endAt:'2026-11-03T14:00:00',workIntervals:[]};
  load.mockResolvedValue([row,later]);render(<DashboardTimeline revision={null}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Implementação'});
  expect(screen.getByTitle('Sem registro · 11:00–13:00')).toHaveStyle({left:'40%',width:'40%'});
  fireEvent.click(screen.getByRole('button',{name:'Semana'}));
  expect(document.querySelectorAll('.dashboard-timeline-tick')).toHaveLength(1);
  expect(document.querySelector('.dashboard-timeline-tick')).toHaveTextContent('09:00–14:00');
 });
 it('ajusta o eixo ao trabalho e mantém a pausa proporcional nas três visões',async()=>{
  load.mockResolvedValue([row]);render(<DashboardTimeline revision={null}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Implementação'});
  for(const name of ['Geral','Por cliente','Por projeto']){
   fireEvent.click(screen.getByRole('button',{name}));
   const blocks=Array.from(document.querySelectorAll<HTMLButtonElement>('.dashboard-timeline-block'));
   expect(blocks.map(b=>[b.style.left,b.style.width])).toEqual([['0%','50%'],['50%','25%'],['75%','25%']]);
   expect(Array.from(document.querySelectorAll('.dashboard-timeline-tick')).map(t=>t.textContent)).toEqual(['09:00','10:00','11:00']);
  }
 });
 it('agrupa por cliente e pelo par cliente/projeto sem perder intervalos ou sobreposições',()=>{
  const rows=[row,{...row,id:'other',project:'Outro'},{...row,id:'client',client:'Outro cliente'},{...row,id:'empty',client:'',project:''}];
  const segments=timelineSegments(rows,'2026-11-03');
  const clients=timelineGroups(segments,'client'),projects=timelineGroups(segments,'project');
  expect(clients.map(g=>g.label)).toEqual(['Trajetória por cliente']);
  expect(clients[0].laneCount).toBe(4);
  expect(projects.map(g=>g.label)).toEqual(['Cliente / Outro','Cliente / Projeto','Outro cliente / Projeto','Sem cliente / Sem projeto']);
  for(const view of ['all','client','project'] as const){
   const blocks=timelineGroups(segments,view).flatMap(g=>g.blocks);
   expect(blocks).toHaveLength(segments.length);
   for(const kind of ['work','pause','estimated'])expect(blocks.filter(s=>s.kind===kind).reduce((sum,s)=>sum+s.end-s.start,0)).toBe(segments.filter(s=>s.kind===kind).reduce((sum,s)=>sum+s.end-s.start,0));
  }
 });
 it('alterna visões mantendo período, seleção, totais e projetos homônimos separados',async()=>{
  load.mockResolvedValue([row,{...row,id:'other',client:'Outro cliente',activity:'Reunião'}]);
  render(<DashboardTimeline revision={null}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Reunião'});
  fireEvent.click(screen.getByRole('button',{name:'Semana'}));
  fireEvent.click(screen.getAllByRole('button',{name:/^Reunião · Outro cliente · Projeto/})[0]);
  for(const name of ['Por cliente','Por projeto','Geral']){
   fireEvent.click(screen.getByRole('button',{name}));
   expect(screen.getByRole('button',{name})).toHaveAttribute('aria-pressed','true');
   expect(screen.getByRole('heading',{name:'Reunião'})).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Semana'})).toHaveAttribute('aria-pressed','true');
   expect(screen.getByLabelText('Data da linha do tempo')).toHaveValue('2026-11-03');
   expect(screen.getByText('Trabalho registrado:').textContent).toContain('3h 00min');
   expect(document.querySelectorAll('.dashboard-timeline-block')).toHaveLength(6);
   expect(document.querySelectorAll('.dashboard-timeline-group')).toHaveLength(name==='Por projeto'?2:1);
   if(name==='Por projeto'){
    expect(screen.getByRole('heading',{name:'Cliente / Projeto'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Outro cliente / Projeto'})).toBeInTheDocument();
   }
  }
  expect(load).toHaveBeenCalledTimes(1);
 });
 it('mostra a trajetória A → B → A no mesmo eixo com cor por cliente e detalhes acessíveis',async()=>{
  const session=(id:string,client:string,project:string,start:number):Session=>({...row,id,client,project,activity:`Atividade ${id}`,startAt:`2026-11-03T${start}:00:00`,endAt:`2026-11-03T${start+1}:00:00`,workIntervals:[{sessionId:id,startAt:`2026-11-03T${start}:00:00`,endAt:`2026-11-03T${start+1}:00:00`,lastTickAt:`2026-11-03T${start+1}:00:00`,precision:'Precisa'}]});
  load.mockResolvedValue([session('c','Cliente A','Outro projeto',12),session('a','Cliente A','Projeto',10),session('b','Cliente B','Projeto',11),session('d','','',14)]);
  render(<DashboardTimeline revision={null} colors={[{client:'Cliente A',hex:'#ff0000'},{client:'Cliente B',hex:'#0000ff'}]}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Atividade a'});
  fireEvent.click(screen.getByRole('button',{name:'Por cliente'}));
  const blocks=Array.from(document.querySelectorAll<HTMLButtonElement>('.dashboard-timeline-block'));
  expect(document.querySelectorAll('.dashboard-timeline-axis')).toHaveLength(1);
  expect(blocks.map(b=>b.textContent)).toEqual(['Cliente A','Cliente B','Cliente A','Sem cliente']);
  expect(new Set(blocks.map(b=>b.style.top)).size).toBe(1);
  expect(blocks[0].style.backgroundColor).toBe('rgb(255, 0, 0)');
  expect(blocks[1].style.backgroundColor).toBe('rgb(0, 0, 255)');
  expect(blocks[2].style.backgroundColor).toBe(blocks[0].style.backgroundColor);
  expect(parseFloat(blocks[3].style.left)).toBeGreaterThan(parseFloat(blocks[2].style.left)+parseFloat(blocks[2].style.width));
  fireEvent.click(blocks[2]);
  expect(screen.getByRole('heading',{name:'Atividade c'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Geral'}));
  expect(document.querySelector('.dashboard-timeline-block')).toHaveTextContent('Atividade a');
 });
 it('calcula semana de segunda a domingo, mês bissexto e virada de ano',()=>{
  expect(timelineDays('2026-11-01','week')).toEqual(['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  expect(timelineDays('2024-02-15','month')).toHaveLength(29);
  expect(shiftTimeline('2026-12-31','month',1)).toBe('2027-01-01');
  expect(shiftTimeline('2026-03-31','month',-1)).toBe('2026-02-01');
 });
 it('recorta trabalho que atravessa meia-noite sem duplicar duração',()=>{
  const overnight={...row,startAt:'2026-11-02T23:30:00',endAt:'2026-11-03T00:30:00',workIntervals:[{sessionId:'test',startAt:'2026-11-02T23:30:00',endAt:'2026-11-03T00:30:00',lastTickAt:'2026-11-03T00:30:00',precision:'Precisa'}]};
  for(const day of ['2026-11-02','2026-11-03'])expect(timelineSegments([overnight],day).map(s=>(s.end-s.start)/1000)).toEqual([1800]);
 });
 it('mostra trabalho e pausas separadamente e navega entre escalas',async()=>{
  load.mockResolvedValue([row]);render(<DashboardTimeline revision={null}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Implementação'});
  expect(screen.getByText('Trabalho registrado:').textContent).toContain('1h 30min');
  expect(screen.getByText('Pausas registradas:').textContent).toContain('0h 30min');
  expect(screen.getByText(/Pausa · 10:00–10:30/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Semana'}));
  expect(document.querySelectorAll('.dashboard-timeline-tick')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Mês'}));
  expect(document.querySelectorAll('.dashboard-timeline-tick')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Próximo período'}));
  expect(screen.getByLabelText('Data da linha do tempo')).toHaveValue('2026-12-01');
  expect(screen.getByText('Nenhum intervalo encontrado neste período.')).toBeInTheDocument();
 });
 it('não soma períodos estimados como foco preciso',async()=>{
  load.mockResolvedValue([{...row,workIntervals:[]}]);render(<DashboardTimeline revision={null}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Implementação'});
  expect(screen.getByText('Trabalho registrado:').textContent).toContain('0h 00min');
  expect(screen.getByText('Períodos estimados:').textContent).toContain('2h 00min');
 });
 it('seleciona atividades na linha contínua e preserva intervalos sobrepostos',async()=>{
  load.mockResolvedValue([row,{...row,id:'zother',activity:'Reunião',details:'Alinhamento semanal',workIntervals:row.workIntervals?.map(i=>({...i,sessionId:'zother'}))}]);
  render(<DashboardTimeline revision={null}/>);
  fireEvent.change(screen.getByLabelText('Data da linha do tempo'),{target:{value:'2026-11-03'}});
  await screen.findByRole('heading',{name:'Implementação'});
  const blocks=document.querySelectorAll<HTMLButtonElement>('.dashboard-timeline-block');
  expect(blocks).toHaveLength(6);
  expect(new Set(Array.from(blocks,block=>block.style.top)).size).toBe(2);
  fireEvent.click(screen.getAllByRole('button',{name:/^Reunião · Cliente · Projeto/})[0]);
  expect(screen.getByRole('heading',{name:'Reunião'})).toBeInTheDocument();
  expect(screen.getByText('Alinhamento semanal')).toBeInTheDocument();
 });
 it('permite tentar novamente após falha e ignora resposta antiga',async()=>{
  let resolveOld!:(rows:Session[])=>void;
  load.mockImplementationOnce(()=>new Promise<Session[]>(resolve=>{resolveOld=resolve;})).mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValue([]);
  const {rerender}=render(<DashboardTimeline revision={0}/>);
  rerender(<DashboardTimeline revision={1}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
  fireEvent.click(screen.getByRole('button',{name:'Atualizar linha do tempo'}));
  await screen.findByText('Nenhum intervalo encontrado neste período.');
  resolveOld([row]);
  await waitFor(()=>expect(screen.queryByText('Implementação')).not.toBeInTheDocument());
 });
});



it.each([['09:15','12:20',['09:15','10:00','11:00','12:00','12:20']],['09:15','09:40',['09:15','09:40']],['00:00','23:59',Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`).concat('23:59')]])('marca horas inteiras de %s a %s sem ampliar a jornada',(start,end,expected)=>{
 const ticks=hourlyTimelineTicks(new Date(`2026-11-03T${start}:00`).getTime(),new Date(`2026-11-03T${end}:00`).getTime());
 expect(ticks.map(t=>new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))).toEqual(expected);
});
