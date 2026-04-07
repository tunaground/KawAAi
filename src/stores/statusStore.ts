import { create } from "zustand";

interface StatusState {
  message: string;
  projectPath: string | null;
  lastSavedAt: string | null;
  setStatus: (msg: string) => void;
  setProjectPath: (path: string | null) => void;
  setLastSavedAt: (time: string | null) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  message: "Ready",
  projectPath: null,
  lastSavedAt: null,
  setStatus: (message) => set({ message }),
  setProjectPath: (projectPath) => set({ projectPath }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
}));

/** 컴포넌트 밖에서 사용 */
export function setStatus(msg: string) {
  useStatusStore.getState().setStatus(msg);
}

export function setProjectPath(path: string | null) {
  useStatusStore.getState().setProjectPath(path);
}

export function setLastSavedAt(time: string | null) {
  useStatusStore.getState().setLastSavedAt(time);
}

export function markSaved() {
  useStatusStore.getState().setLastSavedAt(new Date().toLocaleTimeString());
}
