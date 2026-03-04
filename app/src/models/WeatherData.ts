// Weather Intelligence Data Models

export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage (0-100)
  rainfall: number; // mm
  windSpeed: number; // km/h
  timestamp: Date;
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  date: Date;
  temperature: number;
  humidity: number;
  rainfall: number;
  probability: number; // Rain probability (0-100)
}

export interface WeatherAlert {
  type: 'rain' | 'drought' | 'extreme_heat' | 'frost';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
}

