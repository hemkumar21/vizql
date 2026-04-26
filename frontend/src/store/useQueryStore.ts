import { create } from "zustand";
import type { ChatMessage, QueryResult, SchemaTable } from "@/types";

interface QueryStore {
  conversationId: string | undefined;
  setConversationId: (id: string) => void;
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  activeResult: QueryResult | null;
  setActiveResult: (r: QueryResult) => void;
  history: QueryResult[];
  addHistory: (r: QueryResult) => void;
  schema: SchemaTable[];
  setSchema: (s: SchemaTable[]) => void;
  isDark: boolean;
  toggleDark: () => void;
  isQuerying: boolean;
  setIsQuerying: (v: boolean) => void;
}

export const useQueryStore = create<QueryStore>((set) => ({
  conversationId: undefined,
  setConversationId: (id) => set({ conversationId: id }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  clearMessages: () => set({ messages: [], conversationId: undefined }),

  activeResult: null,
  setActiveResult: (r) => set({ activeResult: r }),

  history: [],
  addHistory: (r) =>
    set((s) => ({ history: [r, ...s.history].slice(0, 20) })),

  schema: [],
  setSchema: (s) => set({ schema: s }),

  isDark: false,
  toggleDark: () =>
    set((s) => {
      const next = !s.isDark;
      document.documentElement.classList.toggle("dark", next);
      return { isDark: next };
    }),

  isQuerying: false,
  setIsQuerying: (v) => set({ isQuerying: v }),
}));