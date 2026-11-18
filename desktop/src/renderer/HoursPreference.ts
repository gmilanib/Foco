import { createContext,useContext } from 'react';
import type { HoursMode } from './hoursBasis';

export const HoursPreference=createContext<HoursMode>('rounded');
export const useHoursPreference=()=>useContext(HoursPreference);
