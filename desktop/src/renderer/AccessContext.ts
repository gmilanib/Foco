import { createContext,useContext } from 'react';
export const AccessContext=createContext(false);
export const usePrivateMode=()=>useContext(AccessContext);
