import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
if(typeof HTMLDialogElement.prototype.showModal!=='function'){
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
}
Object.defineProperty(window,'foco',{configurable:true,value:{
  request:vi.fn().mockResolvedValue([]),importFolder:vi.fn().mockResolvedValue(null),chooseFolder:vi.fn().mockResolvedValue(null),
  showOverlay:vi.fn(),closeOverlay:vi.fn(),hideWindow:vi.fn(),updateTimer:vi.fn(),onTimer:vi.fn().mockReturnValue(()=>{}),
}});
