import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { SettingsPage } from './pages/SettingsPage';
import { SavedViews } from './components/SavedViews';
import { viewFields,viewText } from './savedViews';
import { applyTheme,presetId,themePresets } from './themes';
import { clientColor,projectColor } from './components/ClientMarker';

const settings={theme:'light',accent:'#2563EB',showValues:false,clients:[],onChange:vi.fn().mockResolvedValue(undefined),onColorsChanged:async()=>{}};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(window.foco.request).mockImplementation(async(path)=>path==='/api/settings'?{}:[]);});
afterEach(()=>{cleanup();vi.restoreAllMocks();applyTheme('light','classic','#2563EB');});

it('organiza configurações por abas e conserva campos ainda não salvos',()=>{
 render(<SettingsPage {...settings}/>);
 expect(screen.getByRole('tabpanel')).toHaveAttribute('id','settings-panel-appearance');
 fireEvent.click(screen.getByRole('tab',{name:'Preferências'}));
 fireEvent.change(screen.getByLabelText('Durações favoritas (minutos, até oito)'),{target:{value:'30, 60'}});
 fireEvent.click(screen.getByRole('tab',{name:'Dados'}));
 expect(screen.getByRole('tabpanel')).toHaveAttribute('id','settings-panel-data');
 fireEvent.click(screen.getByRole('tab',{name:'Preferências'}));
 expect(screen.getByLabelText('Durações favoritas (minutos, até oito)')).toHaveValue('30, 60');
 const tab=screen.getByRole('tab',{name:'Preferências'});tab.focus();fireEvent.keyDown(tab,{key:'ArrowRight'});
 expect(screen.getByRole('tab',{name:'Jornada'})).toHaveFocus();expect(screen.getByRole('tab',{name:'Jornada'})).toHaveAttribute('aria-selected','true');
});

it('aplica tema predefinido mantendo o modo claro ou escuro escolhido',async()=>{
 render(<SettingsPage {...settings} theme="dark"/>);
 fireEvent.click(screen.getByRole('button',{name:'Floresta'}));
 await waitFor(()=>expect(settings.onChange).toHaveBeenCalledWith({'theme.preset':'forest',accent:'#16836B'}));
 expect(screen.getByLabelText('Tema')).toHaveValue('dark');
});

it('mantém visões recolhidas e permite salvar e reaplicar quando abertas',()=>{
 const applied=vi.fn(),criteria={client:'ACME'},valid=viewFields<typeof criteria>({client:viewText});
 const {container}=render(<SavedViews scope="minimal" criteria={criteria} validate={valid} onApply={applied}/>);
 const details=container.querySelector('details')!;expect(details.open).toBe(false);
 fireEvent.click(screen.getByText('Visões salvas'));expect(details.open).toBe(true);
 fireEvent.change(screen.getByLabelText('Nome da visão'),{target:{value:'Meu cliente'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar nova visão'}));
 fireEvent.click(screen.getByText('Visões salvas'));expect(details.open).toBe(false);
 fireEvent.click(screen.getByText('Visões salvas'));fireEvent.click(screen.getByRole('button',{name:'Aplicar visão'}));
 expect(applied).toHaveBeenCalledWith(expect.objectContaining({client:'ACME'}));
});

it.each([['christmas','Natal','#B52F42'],['aero','Frutiger Aero','#087FA6']])('seleciona e restaura o tema especial %s sem alterar o modo',async(id,name,accent)=>{
 render(<SettingsPage {...settings} theme="system" themePreset={presetId(id)}/>);
 const button=screen.getByRole('button',{name});
 expect(button).toHaveAttribute('aria-pressed','true');
 fireEvent.click(button);
 await waitFor(()=>expect(settings.onChange).toHaveBeenCalledWith({'theme.preset':id,accent}));
 expect(screen.getByLabelText('Tema')).toHaveValue('system');
 applyTheme('dark',presetId(id),accent);
 expect(document.documentElement.dataset.palette).toBe(id);
 expect(document.documentElement.dataset.appearance).toBe('dark');
 applyTheme('light','classic','#2563EB');
 expect(document.documentElement.dataset.palette).toBe('classic');
 expect(document.documentElement.dataset.appearance).toBe('light');
});

it('resolve o modo do sistema para os temas especiais e mantém a cor personalizada',()=>{
 const matchMedia=vi.spyOn(window,'matchMedia');
 for(const matches of [true,false]){
  matchMedia.mockReturnValue({matches} as MediaQueryList);
  for(const id of ['christmas','aero']){
   applyTheme('system',presetId(id),'#123456');
   expect(document.documentElement.dataset.theme).toBe('system');
   expect(document.documentElement.dataset.appearance).toBe(matches?'dark':'light');
   expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#123456');
  }
 }
 expect(presetId('unknown')).toBe('classic');
});

const luminance=(hex:string)=>{const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
it('mantém texto legível e superfícies consistentes em todas as paletas',()=>{
 for(const preset of themePresets)for(const mode of ['light','dark']){
  applyTheme(mode,preset.id,preset.accent);
  const root=document.documentElement,surface=root.style.getPropertyValue('--surface'),text=root.style.getPropertyValue('--text');
  const ratio=(Math.max(luminance(text),luminance(surface))+.05)/(Math.min(luminance(text),luminance(surface))+.05);
  expect(ratio).toBeGreaterThanOrEqual(4.5);expect(root.dataset.palette).toBe(preset.id);expect(root.style.colorScheme).toBe(mode);
 }
 applyTheme('light','forest','#FFFFFF');expect(document.documentElement.style.getPropertyValue('--accent-text')).toBe('#000000');
});

it('cores de projeto são próprias e clientes mantêm sua personalização',()=>{
 const colors=[{client:'ACME',hex:'#123456'}],seeds={Projeto:217};
 expect(clientColor('ACME',colors)).toBe('#123456');expect(clientColor('Novo')).toMatch(/^hsl\(/);
 expect(projectColor('ACME','Projeto',colors,seeds)).toBe('hsl(217 65% 48%)');
 expect(projectColor('Outro','Projeto',[],seeds)).toBe(projectColor('ACME','Projeto',colors,seeds));
});
