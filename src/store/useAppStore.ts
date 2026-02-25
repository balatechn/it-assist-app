import { create } from 'zustand';

interface AppState {
    isGodModeActive: boolean;
    activeCompanyId: string | null;
    setGodMode: (active: boolean) => void;
    setActiveCompanyId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    isGodModeActive: false,
    activeCompanyId: null,
    setGodMode: (active) => set({ isGodModeActive: active }),
    setActiveCompanyId: (id) => set({ activeCompanyId: id }),
}));
