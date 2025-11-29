import { OpenPosition } from '../types';

/**
 * Calculate trailing stop price
 */
export const calculateTrailingStop = (
  position: OpenPosition,
  currentPrice: number,
  trailingDistance: number // in pips
): number => {
  if (!position.trailingStopEnabled || !position.trailingStopDistance) {
    return position.stopLoss;
  }

  const pipValue = 0.0001; // For major pairs
  const distance = trailingDistance * pipValue;
  
  if (position.type === 'BUY') {
    // For long positions, trailing stop moves up only
    const newStop = currentPrice - distance;
    return newStop > position.stopLoss ? newStop : position.stopLoss;
  } else {
    // For short positions, trailing stop moves down only
    const newStop = currentPrice + distance;
    return newStop < position.stopLoss ? newStop : position.stopLoss;
  }
};

/**
 * Check if break-even should be triggered
 */
export const shouldTriggerBreakEven = (
  position: OpenPosition,
  currentPrice: number,
  breakEvenTrigger: number // R multiple (e.g., 1R = 1.0)
): boolean => {
  if (!position.breakEvenEnabled || position.breakEvenTriggered) {
    return false;
  }

  const risk = Math.abs(position.entryPrice - position.stopLoss);
  const profit = position.type === 'BUY' 
    ? currentPrice - position.entryPrice 
    : position.entryPrice - currentPrice;

  return profit >= risk * breakEvenTrigger;
};

/**
 * Calculate partial close levels
 */
export const calculatePartialClose = (
  position: OpenPosition,
  currentPrice: number,
  partialLevels: Array<{ price: number; percent: number }>
): { shouldClose: boolean; closePercent: number } => {
  if (!partialLevels || partialLevels.length === 0) {
    return { shouldClose: false, closePercent: 0 };
  }

  for (const level of partialLevels) {
    if (position.type === 'BUY' && currentPrice >= level.price) {
      return { shouldClose: true, closePercent: level.percent };
    }
    if (position.type === 'SELL' && currentPrice <= level.price) {
      return { shouldClose: true, closePercent: level.percent };
    }
  }

  return { shouldClose: false, closePercent: 0 };
};

/**
 * Check if time-based exit should trigger
 */
export const shouldTimeBasedExit = (
  position: OpenPosition,
  currentTime: Date
): boolean => {
  if (!position.timeBasedExit) {
    return false;
  }

  const openTime = new Date(position.openTime ?? position.timestamp);
  const hoursElapsed = (currentTime.getTime() - openTime.getTime()) / (1000 * 60 * 60);
  
  return hoursElapsed >= position.timeBasedExit;
};

