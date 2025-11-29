import { MarketBias, Candle } from '../types';

/**
 * Detect structure breaks (BOS/ChoCh)
 */
export const detectStructureBreak = (
  currentBias: MarketBias | null,
  previousBias: MarketBias | null,
  candles: Candle[]
): MarketBias['structureBreak'] | null => {
  if (!currentBias || !previousBias) {
    return null;
  }

  // Detect BOS (Break of Structure)
  if (previousBias.structure !== 'BOS' && currentBias.structure === 'BOS') {
    const lastCandle = candles[candles.length - 1];
    return {
      type: 'BOS',
      price: lastCandle.close,
      time: lastCandle.time,
      timeframe: '15m', // Default, can be enhanced
    };
  }

  // Detect ChoCh (Change of Character)
  if (previousBias.structure !== 'ChoCh' && currentBias.structure === 'ChoCh') {
    const lastCandle = candles[candles.length - 1];
    return {
      type: 'ChoCh',
      price: lastCandle.close,
      time: lastCandle.time,
      timeframe: '15m',
    };
  }

  return null;
};

/**
 * Detect liquidity sweep
 */
export const detectLiquiditySweep = (
  candles: Candle[],
  lookback: number = 20
): MarketBias['liquiditySweep'] | null => {
  if (candles.length < lookback + 5) {
    return null;
  }

  const recent = candles.slice(-lookback);
  const current = candles[candles.length - 1];
  
  // Find recent high and low
  const high = Math.max(...recent.map(c => c.high));
  const low = Math.min(...recent.map(c => c.low));
  
  // Check if current candle swept the high/low and reversed
  const sweptHigh = current.high > high && current.close < high * 0.999;
  const sweptLow = current.low < low && current.close > low * 1.001;

  if (sweptHigh) {
    return {
      level: high,
      direction: 'UP',
      time: current.time,
    };
  }

  if (sweptLow) {
    return {
      level: low,
      direction: 'DOWN',
      time: current.time,
    };
  }

  return null;
};

