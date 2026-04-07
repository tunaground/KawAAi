import { create } from "zustand";

interface StatusState {
  message: string;
  setStatus: (msg: string) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  message: "Ready",
  setStatus: (message) => set({ message }),
}));

/** 컴포넌트 밖에서 사용 */
export function setStatus(msg: string) {
  useStatusStore.getState().setStatus(msg);
}
