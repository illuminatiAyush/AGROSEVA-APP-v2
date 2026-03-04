import { create } from "zustand";

interface UserState {
  name: string;
  language: string;
  isGuest: boolean;

  setName: (name: string) => void;
  setLanguage: (lang: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: "Farmer",
  language: "en",
  isGuest: true,

  setName: (name) => set({ name }),
  setLanguage: (language) => set({ language }),
}));
