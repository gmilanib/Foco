import '@testing-library/jest-dom/vitest';
import { beforeEach,vi } from 'vitest';
if(typeof HTMLDialogElement.prototype.showModal!=='function'){
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
}
Object.defineProperty(window,'foco',{configurable:true,value:{
  appInfo:vi.fn().mockResolvedValue({version:'1.12.0',channel:'New',platform:'win32',java:'java',dataDirectory:'data',logDirectory:'logs'}),
  request:vi.fn().mockResolvedValue([]),importFolder:vi.fn().mockResolvedValue(null),chooseFolder:vi.fn().mockResolvedValue(null),openErrorLogs:vi.fn().mockResolvedValue(''),
  showOverlay:vi.fn(),closeOverlay:vi.fn(),hideWindow:vi.fn(),updateTimer:vi.fn(),onTimer:vi.fn().mockReturnValue(()=>{}),
}});

beforeEach(()=>localStorage.clear());
