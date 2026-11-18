import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { dataDirectory, concealWindow } = require('./platform.cjs');
const { mavenCommand } = require('../scripts/maven.cjs');

describe('compatibilidade Windows e Fedora', () => {
  it('preserva o caminho de dados do Windows', () => {
    expect(dataDirectory({platform:'win32',env:{},appData:'C:\\Users\\Ana\\AppData\\Roaming'}))
      .toBe('C:\\Users\\Ana\\AppData\\Roaming\\foco-java\\data');
  });
  it('usa XDG absoluto no Linux e ignora XDG relativo', () => {
    const base={platform:'linux',home:'/home/ana'};
    expect(dataDirectory({...base,env:{}})).toBe('/home/ana/.local/share/foco-java/data');
    expect(dataDirectory({...base,env:{XDG_DATA_HOME:'/dados pessoais'}})).toBe('/dados pessoais/foco-java/data');
    expect(dataDirectory({...base,env:{XDG_DATA_HOME:'relativo'}})).toBe('/home/ana/.local/share/foco-java/data');
    expect(dataDirectory({...base,env:{FOCO_DATA_DIR:'/backup/foco',XDG_DATA_HOME:'/dados'}})).toBe('/backup/foco');
  });
  it.each(['linux','win32'])('mantém acesso à janela sem bandeja em %s', (platform) => {
    const window={hide:vi.fn(),minimize:vi.fn()};
    concealWindow(window,platform,undefined);
    expect(window.minimize).toHaveBeenCalledOnce();
    expect(window.hide).not.toHaveBeenCalled();
  });
  it('minimiza no Linux mesmo quando a bandeja aceita o ícone', () => {
    const window={hide:vi.fn(),minimize:vi.fn()};
    concealWindow(window,'linux',{isDestroyed:()=>false});
    expect(window.minimize).toHaveBeenCalledOnce();
    concealWindow(window,'win32',{isDestroyed:()=>false});
    expect(window.hide).toHaveBeenCalledOnce();
  });
  it('seleciona o wrapper Maven de cada sistema', () => {
    expect(mavenCommand('linux',['test'])).toEqual({command:'sh',args:['./mvnw','test']});
    expect(mavenCommand('win32',['-DskipTests','package'])).toEqual({command:'cmd.exe',args:['/d','/s','/c','mvnw.cmd','-DskipTests','package']});
  });
});
