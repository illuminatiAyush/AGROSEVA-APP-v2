import { create } from "zustand";

interface UserState {
  name: string;
  mobile: string;
  location: string;
  language: string;
  isGuest: boolean;
  biometricEnabled: boolean;

  setName: (name: string) => void;
  setMobile: (mobile: string) => void;
  setLocation: (location: string) => void;
  setLanguage: (lang: string) => void;
  setBiometric: (enabled: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: "Farmer",
  mobile: "+91 8652706901",
  location: "Mumbai, Maharashtra",
  language: "en",
  isGuest: true,
  biometricEnabled: false, // Default is off

  setName: (name) => set({ name }),
  setMobile: (mobile) => set({ mobile }),
  setLocation: (location) => set({ location }),
  setLanguage: (language) => set({ language }),
  setBiometric: (enabled) => set({ biometricEnabled: enabled }),
}));
