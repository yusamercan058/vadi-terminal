import { NewsImpact } from '../types/newsImpact';
import { Candle } from '../types';

/**
 * Calculate news impact on price
 */
export const calculateNewsImpact = (
  newsTime: Date,
  candles: Candle[],
  symbol: string
): NewsImpact | null => {
  if (candles.length < 10) {
    return null;
  }

  const newsTimestamp = newsTime.getTime();
  
  // Find candles before and after news
  const beforeCandles = candles.filter(c => c.time < newsTimestamp).slice(-5);
  const afterCandles = candles.filter(c => c.time >= newsTimestamp).slice(0, 10);

  if (beforeCandles.length === 0 || afterCandles.length === 0) {
    return null;
  }

  const priceBefore = beforeCandles[beforeCandles.length - 1].close;
  const priceAfter = afterCandles[afterCandles.length - 1].close;
  const priceChange = priceAfter - priceBefore;
  const priceChangePercent = (priceChange / priceBefore) * 100;

  // Calculate volatility (ATR approximation)
  const beforeATR = calculateATR(beforeCandles);
  const afterATR = calculateATR(afterCandles);

  // Find max move
  let maxMove = 0;
  let maxMoveTime = 0;
  afterCandles.forEach(candle => {
    const move = Math.max(
      Math.abs(candle.high - priceBefore),
      Math.abs(candle.low - priceBefore)
    );
    if (move > maxMove) {
      maxMove = move;
      maxMoveTime = candle.time;
    }
  });

  const timeToMaxMove = (maxMoveTime - newsTimestamp) / (1000 * 60); // minutes

  // Determine direction
  let movementDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  if (priceChangePercent > 0.1) movementDirection = 'UP';
  else if (priceChangePercent < -0.1) movementDirection = 'DOWN';

  // Impact score (0-100)
  const volatilityChange = afterATR > 0 ? (afterATR - beforeATR) / beforeATR : 0;
  const impactScore = Math.min(100, Math.abs(priceChangePercent) * 10 + Math.abs(volatilityChange) * 20);

  return {
    newsId: '', // Should be passed from news event
    symbol,
    priceBefore,
    priceAfter,
    priceChange,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
    volatilityBefore: beforeATR,
    volatilityAfter: afterATR,
    movementDirection,
    maxMove,
    timeToMaxMove: Math.round(timeToMaxMove),
    impactScore: Math.round(impactScore),
  };
};

/**
 * Calculate ATR (Average True Range)
 */
const calculateATR = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period) {
    return 0;
  }

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trs.push(tr);
  }

  const atr = trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  return atr;
};

