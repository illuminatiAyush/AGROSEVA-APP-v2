// Weather Trend Service
// Fetches weather from OpenWeatherMap API and simulates 15-day trends

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY_PREFIX = 'WEATHER_TREND_CACHE_';
const LAST_CITY_KEY = 'LAST_USED_CITY';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export interface WeatherTrend {
  avgTemp: number;
  avgHumidity: number;
  rainfallTrend: 'low' | 'medium' | 'high';
  detectedCity: string;
  lastUpdated: number;
  isCached?: boolean;
}

const OPENWEATHER_API_KEY = '6abb975398125fee8071a0409efa9b3c';
const DEFAULT_CITY = 'Maharashtra,IN'; // Fallback city

/**
 * Fetch current weather from OpenWeatherMap API
 */
async function fetchCurrentWeather(city: string): Promise<{
  temp: number;
  humidity: number;
  rain: boolean;
  cityName: string;
}> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temp: data.main.temp,
      humidity: data.main.humidity,
      rain: data.weather?.[0]?.main === 'Rain' || data.rain !== undefined,
      cityName: data.name || city.split(',')[0],
    };
  } catch (error: any) {
    console.warn('Weather API fetch failed, using defaults:', error.message);
    // Return default values if API fails
    return {
      temp: 28,
      humidity: 60,
      rain: false,
      cityName: city.split(',')[0],
    };
  }
}

/**
 * Simulate 15-day weather trend based on current weather
 * Creates realistic variation around current values
 */
function simulateWeatherTrend(currentWeather: {
  temp: number;
  humidity: number;
  rain: boolean;
}): WeatherTrend {
  const { temp, humidity, rain } = currentWeather;
  
  // Simulate 15-day average with natural variation
  // Temperature: ±3°C variation
  const tempVariation = (Math.random() - 0.5) * 6;
  const avgTemp = Math.round((temp + tempVariation) * 10) / 10;
  
  // Humidity: ±10% variation
  const humidityVariation = (Math.random() - 0.5) * 20;
  const avgHumidity = Math.max(30, Math.min(90, Math.round(humidity + humidityVariation)));
  
  // Rainfall trend based on current rain status and humidity
  let rainfallTrend: 'low' | 'medium' | 'high';
  if (rain) {
    rainfallTrend = humidity > 70 ? 'high' : 'medium';
  } else {
    rainfallTrend = humidity > 65 ? 'medium' : 'low';
  }
  
  return {
    avgTemp,
    avgHumidity,
    rainfallTrend,
    detectedCity: currentWeather.cityName,
    lastUpdated: Date.now(),
  };
}

/**
 * Get cached weather trend for a specific city
 */
async function getCachedTrend(city: string): Promise<WeatherTrend | null> {
  try {
    const cacheKey = `${WEATHER_CACHE_KEY_PREFIX}${city}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const trend: WeatherTrend = JSON.parse(cached);
    const age = Date.now() - trend.lastUpdated;
    
    // Return cached if less than 6 hours old
    if (age < CACHE_DURATION) {
      return { ...trend, isCached: true };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache weather trend for a specific city
 */
async function cacheTrend(city: string, trend: WeatherTrend): Promise<void> {
  try {
    const cacheKey = `${WEATHER_CACHE_KEY_PREFIX}${city}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(trend));
    // Save last used city
    await AsyncStorage.setItem(LAST_CITY_KEY, city);
  } catch (error) {
    console.warn('Failed to cache weather trend:', error);
  }
}

/**
 * Get last used city from storage
 */
export async function getLastUsedCity(): Promise<string> {
  try {
    const lastCity = await AsyncStorage.getItem(LAST_CITY_KEY);
    return lastCity || '';
  } catch {
    return '';
  }
}

/**
 * Get weather trend (last 15 days simulation) for a specific city
 * Uses cached data if available and fresh, otherwise fetches new data
 */
export async function getWeatherTrend(city: string): Promise<WeatherTrend> {
  // Normalize city input (add country code if not present)
  const normalizedCity = city.trim() || DEFAULT_CITY;
  const apiCity = normalizedCity.includes(',') ? normalizedCity : `${normalizedCity},IN`;
  
  // Try to get cached data first
  const cached = await getCachedTrend(normalizedCity);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh weather data
  let currentWeather;
  try {
    currentWeather = await fetchCurrentWeather(apiCity);
  } catch (error) {
    // If API fails, try to use cached data even if old
    const oldCached = await getCachedTrend(normalizedCity);
    if (oldCached) {
      return { ...oldCached, isCached: true };
    }
    throw error;
  }
  
  // Simulate 15-day trend
  const trend = simulateWeatherTrend(currentWeather);
  
  // Cache the trend
  await cacheTrend(normalizedCity, trend);
  
  return trend;
}

