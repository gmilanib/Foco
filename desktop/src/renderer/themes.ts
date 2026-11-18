import { accentText } from './accent';

export const themePresets=[
 {id:'classic',name:'Azul',accent:'#2563EB'},
 {id:'forest',name:'Floresta',accent:'#16836B'},
 {id:'sand',name:'Areia',accent:'#A16207'},
 {id:'violet',name:'Violeta',accent:'#7C3AED'},
 {id:'slate',name:'Grafite',accent:'#64748B'},
 {id:'christmas',name:'Natal',accent:'#B52F42'},
 {id:'aero',name:'Frutiger Aero',accent:'#087FA6'},
] as const;
export type ThemePreset=typeof themePresets[number]['id'];
export function presetId(value:string):ThemePreset{return themePresets.find(p=>p.id===value)?.id??'classic';}
const light={canvas:'#F6F7F9',surface:'#FFFFFF',subtle:'#F0F2F5',line:'#E1E5EB',text:'#202B3B',muted:'#5E6D80'};
const dark={canvas:'#10151E',surface:'#1A2230',subtle:'#151D29',line:'#344154',text:'#E8EDF5',muted:'#A4B1C4'};
const palettes:Record<ThemePreset,{light:typeof light;dark:typeof dark}>={
 classic:{light,dark},
 forest:{light:{canvas:'#F2F7F4',surface:'#FFFFFF',subtle:'#EAF2ED',line:'#D5E4DB',text:'#1C342B',muted:'#557064'},dark:{canvas:'#101C18',surface:'#192B24',subtle:'#14241D',line:'#365346',text:'#E5F1E9',muted:'#A3BFB0'}},
 sand:{light:{canvas:'#F8F5EF',surface:'#FFFDFA',subtle:'#F2ECE2',line:'#E4DACA',text:'#3B3024',muted:'#786A59'},dark:{canvas:'#211C16',surface:'#2C251D',subtle:'#261F18',line:'#534636',text:'#F4EBDD',muted:'#C4B49F'}},
 violet:{light:{canvas:'#F6F4FA',surface:'#FFFFFF',subtle:'#F0ECF7',line:'#E2DBEE',text:'#30243D',muted:'#726280'},dark:{canvas:'#181321',surface:'#261E33',subtle:'#20192B',line:'#493957',text:'#EEE7F6',muted:'#BAAACB'}},
 slate:{light:{canvas:'#F4F5F6',surface:'#FFFFFF',subtle:'#ECEFF2',line:'#DCE1E6',text:'#26313B',muted:'#616E7B'},dark:{canvas:'#121619',surface:'#20262C',subtle:'#1A2025',line:'#3D4853',text:'#EDF1F4',muted:'#ABB6C1'}},
 christmas:{light:{canvas:'#EAF2ED',surface:'#FFFCF4',subtle:'#F1EDE0',line:'#C9D7C9',text:'#203C31',muted:'#55685A'},dark:{canvas:'#0C201B',surface:'#17352C',subtle:'#102A23',line:'#3D6253',text:'#FFF3D9',muted:'#B8CDBC'}},
 aero:{light:{canvas:'#DDF3FA',surface:'#F5FCFF',subtle:'#E0F1F7',line:'#A6CCDB',text:'#123E52',muted:'#406679'},dark:{canvas:'#071F30',surface:'#103447',subtle:'#0B293A',line:'#366679',text:'#E4F9FF',muted:'#A3CEDC'}},
};
export function applyTheme(theme:string,preset:ThemePreset,accent:string){
 const root=document.documentElement;
 const isDark=theme==='dark'||theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches;
 root.dataset.theme=theme;root.dataset.palette=preset;root.style.colorScheme=isDark?'dark':'light';
 root.dataset.appearance=isDark?'dark':'light';
 for(const [name,value] of Object.entries(palettes[preset][isDark?'dark':'light']))root.style.setProperty(`--${name}`,value);
 root.style.setProperty('--accent',accent);root.style.setProperty('--accent-text',accentText(accent));
}
