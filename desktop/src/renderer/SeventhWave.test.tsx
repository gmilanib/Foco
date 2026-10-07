import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { timelineSegments,dayBounds } from './timeline';
import { DayTimeline } from './components/DayTimeline';
import { ScheduleSettings } from './components/ScheduleSettings';
import { RestoreBackup } from './components/RestoreBackup';
import { WorkHoursPage } from './pages/WorkHoursPage';
import { workHoursCsv,isoDay } from './format';
import type { Session } from './types';
const day=isoDay(new Date()),at=(time:string)=>`${day}T${time}:00`;
const session=(id='Work'):Session=>({id,taskId:null,activity:id,client:'',project:'',details:'',consultant:'',cardReference:'',startAt:at('09:00'),endAt:at('12:00'),plannedSeconds:0,focusSeconds:7200,hourlyRate:null,status:'Encerrada',category:'Normal'});
const precise=()=>({...session(),workIntervals:[{sessionId:'Work',startAt:at('09:00'),endAt:at('10:00'),lastTickAt:at('10:00'),precision:'Precisa'},{sessionId:'Work',startAt:at('11:00'),endAt:at('12:00'),lastTickAt:at('12:00'),precision:'Precisa'}]});
const preview={path:'C:/copies/foco.zip',sha256:'hash',counts:{sessions:3,tasks:2,task_checklist:4},activeSessions:1,warning:'Substitui os dados SQLite.'};
beforeEach(()=>{vi.mocked(window.foco.request).mockReset();vi.mocked(window.foco.chooseBackup).mockReset();});afterEach(cleanup);
describe('seventh wave',()=>{
 it('shows precise pauses without inventing legacy pauses and clips to local midnight',()=>{
  expect(timelineSegments([precise()],day).map(s=>s.kind)).toEqual(['work','pause','work']);expect(timelineSegments([session()],day).map(s=>s.kind)).toEqual(['estimated']);
  const bounds=dayBounds(day);const crossing={...session(),startAt:new Date(bounds.start-3600000).toISOString(),endAt:new Date(bounds.start+3600000).toISOString()};const segments=timelineSegments([crossing],day);expect(segments[0].start).toBe(bounds.start);expect(segments[0].end).toBe(bounds.start+3600000);expect(dayBounds(day).end).toBeGreaterThan(bounds.start);
 });
 it('marks unfinished intervals provisional and keeps overlaps in separate sessions',()=>{
  const current={...session(),status:'Em andamento' as const,endAt:null,workIntervals:[{sessionId:'Work',startAt:at('09:00'),endAt:null,lastTickAt:at('09:10'),precision:'Precisa'}]};const segments=timelineSegments([current,{...session('Other'),startAt:at('09:05')}],day);expect(segments).toHaveLength(2);expect(segments[0].provisional).toBe(true);expect(segments[1].session.id).toBe('Other');
 });
 it('timeline opens existing edit and gap actions with keyboard buttons',()=>{
  const edit=vi.fn(),book=vi.fn(),change=vi.fn(),gap={day,startAt:at('12:00'),endAt:at('13:00'),seconds:3600};render(<DayTimeline sessions={[precise()]} periods={[gap]} onEdit={edit} onBook={book} onDayChange={change}/>);
  fireEvent.click(screen.getByRole('button',{name:/Pausa.*Editar Work/}));expect(edit).toHaveBeenCalledWith(precise());fireEvent.click(screen.getByRole('button',{name:/Classificar A definir/}));expect(book).toHaveBeenCalledWith(gap);fireEvent.click(screen.getByRole('button',{name:'Dia seguinte'}));expect(change).toHaveBeenCalledOnce();
 });
 it('weekly settings save seven days, explicit days off and a date exception',async()=>{
  vi.mocked(window.foco.request).mockResolvedValue({rules:[],exceptions:[]});render(<ScheduleSettings/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Salvar jornada semanal'})).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Intervalos de Segunda-feira'),{target:{value:'08:00-12:00'}});fireEvent.click(screen.getByRole('button',{name:'Salvar jornada semanal'}));await screen.findByText(/Jornada semanal salva/);
  expect(window.foco.request).toHaveBeenCalledWith('/api/work-schedule/rules','PUT',{effectiveFrom:day,week:[[{start:'08:00',end:'12:00'}],...Array.from({length:4},()=>[{start:'09:00',end:'12:00'},{start:'13:00',end:'18:00'}]),[],[]]});
  fireEvent.click(screen.getByRole('button',{name:'Salvar exceção'}));await screen.findByText('Exceção salva.');expect(window.foco.request).toHaveBeenCalledWith('/api/work-schedule/exceptions','PUT',{day,windows:[]});
 });
 it('settings failure retains inputs and never reports success',async()=>{
  vi.mocked(window.foco.request).mockResolvedValueOnce({rules:[],exceptions:[]}).mockRejectedValueOnce(new Error('Sobreposição rejeitada'));render(<ScheduleSettings/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Salvar jornada semanal'})).toBeEnabled());fireEvent.change(screen.getByLabelText('Intervalos de Segunda-feira'),{target:{value:'09:00-12:00, 11:00-13:00'}});fireEvent.click(screen.getByRole('button',{name:'Salvar jornada semanal'}));await screen.findByText('Sobreposição rejeitada');expect(screen.getByLabelText('Intervalos de Segunda-feira')).toHaveValue('09:00-12:00, 11:00-13:00');expect(screen.queryByText(/Jornada semanal salva/)).toBeNull();
 });
 it('restoration requires a preview and explicit confirmation then shows safety receipt',async()=>{
  const refreshed=vi.fn();vi.mocked(window.foco.chooseBackup).mockResolvedValue(preview.path);vi.mocked(window.foco.request).mockResolvedValueOnce(preview).mockResolvedValueOnce({safetyBackup:'C:/safety/previous.zip',restoredAt:'now'});render(<RestoreBackup onRestored={refreshed}/>);
  fireEvent.click(screen.getByRole('button',{name:'Escolher backup para conferir'}));await screen.findByRole('dialog',{name:'Conferir restauração'});expect(screen.getByRole('button',{name:'Restaurar este backup'})).toBeDisabled();expect(screen.getByText('Apontamentos')).toBeInTheDocument();expect(screen.getByText('Etapas de checklist')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/Confirmo a substituição/));fireEvent.click(screen.getByRole('button',{name:'Restaurar este backup'}));await screen.findByRole('dialog',{name:'Backup restaurado'});expect(window.foco.request).toHaveBeenLastCalledWith('/api/backup/restore','POST',{path:preview.path,sha256:'hash',confirmed:true});expect(refreshed).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Concluir e atualizar Foco'}));expect(refreshed).toHaveBeenCalledOnce();
 });
 it('failed restoration requires reconfirmation and keeps the preview',async()=>{
  vi.mocked(window.foco.chooseBackup).mockResolvedValue(preview.path);vi.mocked(window.foco.request).mockResolvedValueOnce(preview).mockRejectedValueOnce(new Error('O arquivo mudou desde a prévia.'));render(<RestoreBackup onRestored={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Escolher backup para conferir'}));await screen.findByRole('dialog');fireEvent.click(screen.getByLabelText(/Confirmo a substituição/));fireEvent.click(screen.getByRole('button',{name:'Restaurar este backup'}));await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Restaurar este backup'})).toBeDisabled();expect(screen.getByLabelText(/Confirmo a substituição/)).not.toBeChecked();expect(screen.queryByText('Restauração concluída.')).toBeNull();
 });
 it('cancelled or invalid backup selection cannot restore',async()=>{
  vi.mocked(window.foco.chooseBackup).mockResolvedValueOnce(null).mockResolvedValueOnce(preview.path);vi.mocked(window.foco.request).mockRejectedValue(new Error('Backup inválido'));render(<RestoreBackup onRestored={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Escolher backup para conferir'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Escolher backup para conferir'})).toBeEnabled());expect(window.foco.request).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Escolher backup para conferir'}));await screen.findByText('Backup inválido');expect(screen.queryByRole('dialog')).toBeNull();
 });
 it('timeline tab refreshes gaps when switching day and CSV identifies applied schedule',()=>{
  const refresh=vi.fn();render(<WorkHoursPage report={{days:[],undefinedPeriods:[]}} sessions={[session()]} onRefresh={refresh} onExport={vi.fn()} onBook={vi.fn()}/>);fireEvent.click(screen.getByRole('tab',{name:'Linha do tempo'}));fireEvent.click(screen.getByRole('button',{name:'Dia seguinte'}));expect(refresh.mock.calls.at(-1)?.[0].from).not.toBe(day);
  const csv=workHoursCsv({days:[{day,workedSeconds:3600,undefinedSeconds:0,regularSeconds:0,extraSeconds:3600,estimated:false,targetSeconds:0,scheduleSource:'Exceção'}],undefinedPeriods:[]});expect(csv).toContain('Meta_jornada_segundos');expect(csv).toContain('Exceção');
 });
});
