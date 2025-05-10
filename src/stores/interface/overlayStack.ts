import { create } from "zustand";

type OverlayType = "volume" | "subtitle" | "speed" | null;

export interface OverlayStackState {
  currentOverlay: OverlayType;
  setCurrentOverlay: (overlay: OverlayType) => void;
}

export const useOverlayStack = create<OverlayStackState>((set) => ({
  currentOverlay: null,
  setCurrentOverlay: (overlay) => set({ currentOverlay: overlay }),
}));
