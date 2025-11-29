import { Candle } from '../types';
import { VolumeProfileData } from '../types/orderFlow';

/**
 * Calculate Volume Profile from candles
 * Note: Real volume data requires tick data, this is a simplified version
 */
export const calculateVolumeProfile = (
  candles: Candle[],
  pricePrecision: number = 5
): VolumeProfileData => {
  if (candles.length === 0) {
    return {
      poc: 0,
      valueAreaHigh: 0,
      valueAreaLow: 0,
      totalVolume: 0,
      profile: [],
    };
  }

  // Use price range and approximate volume from price action
  const prices = candles.flatMap(c => [c.high, c.low, c.open, c.close]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Create price buckets
  const bucketSize = (maxPrice - minPrice) / 50; // 50 buckets
  const buckets = new Map<number, number>();

  candles.forEach(candle => {
    // Approximate volume from price range and volatility
    const range = candle.high - candle.low;
    const body = Math.abs(candle.close - candle.open);
    const volume = range * body * 1000; // Simplified volume approximation

    // Distribute volume across price levels
    const levels = Math.max(1, Math.floor(range / (bucketSize / 10)));
    for (let i = 0; i <= levels; i++) {
      const price = candle.low + (candle.high - candle.low) * (i / levels);
      const bucket = Math.round(price / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + volume / (levels + 1));
    }
  });

  // Convert to array and sort
  const profile = Array.from(buckets.entries())
    .map(([price, volume]) => ({ price: Math.round(price * Math.pow(10, pricePrecision)) / Math.pow(10, pricePrecision), volume }))
    .sort((a, b) => b.volume - a.volume);

  // POC is highest volume
  const poc = profile[0]?.price || 0;

  // Value Area (70% of volume)
  const totalVolume = profile.reduce((sum, p) => sum + p.volume, 0);
  const valueAreaVolume = totalVolume * 0.7;
  let accumulatedVolume = 0;
  let valueAreaHigh = poc;
  let valueAreaLow = poc;

  profile.forEach(p => {
    if (accumulatedVolume < valueAreaVolume) {
      accumulatedVolume += p.volume;
      if (p.price > valueAreaHigh) valueAreaHigh = p.price;
      if (p.price < valueAreaLow) valueAreaLow = p.price;
    }
  });

  return {
    poc,
    valueAreaHigh,
    valueAreaLow,
    totalVolume,
    profile: profile.sort((a, b) => a.price - b.price),
  };
};

