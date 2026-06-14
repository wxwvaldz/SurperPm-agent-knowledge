import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  discussTopicId: number | null;
  setDiscussTopicId: (id: number | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  discussTopicId: null,
  setDiscussTopicId: (id) => set({ discussTopicId: id }),
}));
