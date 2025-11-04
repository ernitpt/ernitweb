// Utility functions for the Ernit app

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const generateClaimCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const calculateProgressPercentage = (current: number, target: number): number => {
  return Math.min((current / target) * 100, 100);
};

export const getProgressStage = (percentage: number): 'early' | 'mid' | 'late' | 'reveal' => {
  if (percentage <= 33) return 'early';
  if (percentage <= 66) return 'mid';
  if (percentage < 100) return 'late';
  return 'reveal';
};

export const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    adventure: 'Adventure',
    relaxation: 'Relaxation',
    'food-culture': 'Food & Culture',
    'romantic-getaway': 'Romantic Getaway',
    'foreign-trip': 'Foreign Trip',
  };
  return categoryMap[category] || category;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateClaimCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};
