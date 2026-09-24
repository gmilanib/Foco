import { describe,expect,it } from 'vitest';
import { accentText } from './accent';

describe('contraste da cor de destaque',()=>{
 it('usa texto escuro em cores claras e branco em cores escuras',()=>{
  expect(accentText('#facc15')).toBe('#000000');
  expect(accentText('#123456')).toBe('#ffffff');
 });
 it('mantém texto legível para valor inválido',()=>{
  expect(accentText('invalid')).toBe('#ffffff');
 });
});
