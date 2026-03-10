// Offline Storage Service using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';

class StorageService {
  // Generic get method
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  // Generic set method
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  // Remove item
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  // Clear all storage
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  // Specific methods for app data
  async getSoilData() {
    return this.get(STORAGE_KEYS.SOIL_DATA);
  }

  async setSoilData(data: any) {
    return this.set(STORAGE_KEYS.SOIL_DATA, data);
  }

  async getWeatherData() {
    return this.get(STORAGE_KEYS.WEATHER_DATA);
  }

  async setWeatherData(data: any) {
    return this.set(STORAGE_KEYS.WEATHER_DATA, data);
  }

  async getRecommendations() {
    return this.get(STORAGE_KEYS.RECOMMENDATIONS);
  }

  async setRecommendations(data: any) {
    return this.set(STORAGE_KEYS.RECOMMENDATIONS, data);
  }

  async getResourceUsage() {
    return this.get(STORAGE_KEYS.RESOURCE_USAGE);
  }

  async setResourceUsage(data: any) {
    return this.set(STORAGE_KEYS.RESOURCE_USAGE, data);
  }

  async getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS);
  }

  async setSettings(data: any) {
    return this.set(STORAGE_KEYS.SETTINGS, data);
  }

  async getLanguage() {
    return this.get<string>(STORAGE_KEYS.LANGUAGE);
  }

  async setLanguage(language: string) {
    return this.set(STORAGE_KEYS.LANGUAGE, language);
  }
}

export const storageService = new StorageService();

