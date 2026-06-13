import { create } from "zustand";

interface SkillStore {
  /** 当前选中的文件路径 */
  selectedFilePath: string | null;
  /** 正在编辑的文件路径 */
  editingFilePath: string | null;
  /** 树节点展开状态集合 */
  expandedPaths: Set<string>;

  // actions
  selectFile: (path: string) => void;
  toggleExpand: (path: string) => void;
  startEdit: (path: string) => void;
  cancelEdit: () => void;
  reset: () => void;
}

const initialState = {
  selectedFilePath: null as string | null,
  editingFilePath: null as string | null,
  expandedPaths: new Set<string>(),
};

export const useSkillStore = create<SkillStore>((set) => ({
  ...initialState,

  selectFile: (path) =>
    set({ selectedFilePath: path, editingFilePath: null }),

  toggleExpand: (path) =>
    set((s) => {
      const next = new Set(s.expandedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedPaths: next };
    }),

  startEdit: (path) => set({ editingFilePath: path }),

  cancelEdit: () => set({ editingFilePath: null }),

  reset: () => set(initialState),
}));
