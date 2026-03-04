// Validation utility functions

export const validateSoilMoisture = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

export const validatePH = (value: number): boolean => {
  return value >= 0 && value <= 14;
};

export const validateNPK = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

export const validateTemperature = (value: number): boolean => {
  return value >= -50 && value <= 60;
};

export const validateHumidity = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

