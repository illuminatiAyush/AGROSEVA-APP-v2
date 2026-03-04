// Formatting utility functions

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatVolume = (liters: number): string => {
  if (liters >= 1000) {
    return `${(liters / 1000).toFixed(2)}kL`;
  }
  return `${liters.toFixed(0)}L`;
};

export const formatWeight = (kg: number): string => {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)}t`;
  }
  return `${kg.toFixed(2)}kg`;
};

