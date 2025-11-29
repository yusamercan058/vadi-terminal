import { Candle, SMTData } from '../types';
import { ASSET_CONFIG } from '../constants';
import { Asset } from '../types';

/**
 * Fetch correlation pair data (DXY or S&P500)
 */
const fetchCorrelationPair = async (pair: 'DXY' | 'SPX500'): Promise<Candle[]> => {
  try {
    // For DXY - use USD index
    if (pair === 'DXY') {
      // DXY is typically inverse of EURUSD, so we'll calculate it
      // In production, you'd fetch real DXY data from an API
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=EURUSDT&interval=15m&limit=200`);
      
      if (!response.ok) {
        throw new Error(`DXY verisi alınamadı: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('DXY verisi boş veya geçersiz');
      }
      
      return data.map((d: any[]) => ({
        time: d[0] / 1000,
        open: 1 / parseFloat(d[1]), // Inverse for DXY approximation
        high: 1 / parseFloat(d[3]),
        low: 1 / parseFloat(d[2]),
        close: 1 / parseFloat(d[4]),
      }));
    }
    
    // For S&P500 - use SPX data
    if (pair === 'SPX500') {
      // In production, use a real S&P500 API
      // For now, we'll use NAS100 as approximation
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=NAS100&interval=15m&limit=200`);
      
      if (!response.ok) {
        throw new Error(`S&P500 verisi alınamadı: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('S&P500 verisi boş veya geçersiz');
      }
      
      return data.map((d: any[]) => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]) * 0.1, // Approximate S&P500 from NAS100
        high: parseFloat(d[2]) * 0.1,
        low: parseFloat(d[3]) * 0.1,
        close: parseFloat(d[4]) * 0.1,
      }));
    }
    
    return [];
  } catch (error: any) {
    console.error('Error fetching correlation pair:', error);
    // Gerçek veri yoksa boş döndür, mock veri kullanma
    throw new Error(`Korelasyon çifti verisi alınamadı: ${error.message || 'Bilinmeyen hata'}`);
  }
};

/**
 * Calculate trend from candles
 */
const calculateTrend = (candles: Candle[], lookback: number = 20): 'Bullish' | 'Bearish' | 'Neutral' => {
  if (candles.length < lookback) return 'Neutral';
  
  const startPrice = candles[candles.length - lookback].close;
  const endPrice = candles[candles.length - 1].close;
  const change = ((endPrice - startPrice) / startPrice) * 100;
  
  if (change > 0.1) return 'Bullish';
  if (change < -0.1) return 'Bearish';
  return 'Neutral';
};

/**
 * Calculate correlation coefficient
 */
const calculateCorrelation = (assetCandles: Candle[], pairCandles: Candle[]): number => {
  if (assetCandles.length !== pairCandles.length || assetCandles.length < 20) {
    return 0;
  }
  
  const minLength = Math.min(assetCandles.length, pairCandles.length);
  const assetReturns = [];
  const pairReturns = [];
  
  for (let i = 1; i < minLength; i++) {
    const assetReturn = (assetCandles[i].close - assetCandles[i - 1].close) / assetCandles[i - 1].close;
    const pairReturn = (pairCandles[i].close - pairCandles[i - 1].close) / pairCandles[i - 1].close;
    assetReturns.push(assetReturn);
    pairReturns.push(pairReturn);
  }
  
  const assetMean = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length;
  const pairMean = pairReturns.reduce((a, b) => a + b, 0) / pairReturns.length;
  
  let numerator = 0;
  let assetVariance = 0;
  let pairVariance = 0;
  
  for (let i = 0; i < assetReturns.length; i++) {
    const assetDiff = assetReturns[i] - assetMean;
    const pairDiff = pairReturns[i] - pairMean;
    numerator += assetDiff * pairDiff;
    assetVariance += assetDiff * assetDiff;
    pairVariance += pairDiff * pairDiff;
  }
  
  const denominator = Math.sqrt(assetVariance * pairVariance);
  return denominator > 0 ? numerator / denominator : 0;
};

/**
 * Calculate SMT divergence
 */
export const calculateSMT = async (
  asset: Asset,
  assetCandles: Candle[]
): Promise<SMTData> => {
  const config = ASSET_CONFIG[asset];
  if (!config.smtPair) {
    // No correlation pair for this asset
    return {
      divergence: 'None',
      strength: 0,
      correlation: 0,
      correlationTrend: 'stable',
      assetPrice: assetCandles[assetCandles.length - 1].close,
      pairPrice: 0,
      assetTrend: 'Neutral',
      pairTrend: 'Neutral',
      divergenceBars: 0,
    };
  }
  
  // Fetch correlation pair data
  let pairCandles: Candle[] = [];
  try {
    pairCandles = await fetchCorrelationPair(config.smtPair as 'DXY' | 'SPX500');
  } catch (error: any) {
    // Gerçek veri yoksa hata fırlat, mock veri kullanma
    console.error('SMT correlation pair fetch error:', error);
    throw new Error(`SMT hesaplaması için gerekli veri alınamadı: ${error.message}`);
  }
  
  if (pairCandles.length === 0) {
    // Gerçek veri yoksa hata fırlat
    throw new Error(`${config.smtPair} verisi boş. SMT hesaplanamıyor.`);
  }
  
  // Align candles by timestamp
  const alignedCandles: Array<{ asset: Candle; pair: Candle }> = [];
  for (const assetCandle of assetCandles.slice(-50)) {
    const pairCandle = pairCandles.find(p => Math.abs(p.time - assetCandle.time) < 900); // Within 15 min
    if (pairCandle) {
      alignedCandles.push({ asset: assetCandle, pair: pairCandle });
    }
  }
  
  if (alignedCandles.length < 20) {
    return {
      divergence: 'None',
      strength: 0,
      correlation: 0,
      correlationTrend: 'stable',
      assetPrice: assetCandles[assetCandles.length - 1].close,
      pairPrice: pairCandles[pairCandles.length - 1]?.close || 0,
      assetTrend: calculateTrend(assetCandles),
      pairTrend: calculateTrend(pairCandles),
      divergenceBars: 0,
    };
  }
  
  // Calculate trends
  const assetTrend = calculateTrend(assetCandles);
  const pairTrend = calculateTrend(pairCandles);
  
  // Calculate correlation
  const correlation = calculateCorrelation(assetCandles, pairCandles);
  
  // Calculate correlation trend (rolling window)
  const recentCorrelation = calculateCorrelation(assetCandles.slice(-20), pairCandles.slice(-20));
  const previousCorrelation = calculateCorrelation(assetCandles.slice(-40, -20), pairCandles.slice(-40, -20));
  let correlationTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (Math.abs(recentCorrelation - previousCorrelation) > 0.1) {
    correlationTrend = recentCorrelation > previousCorrelation ? 'increasing' : 'decreasing';
  }
  
  // Calculate SMT divergence
  // SMT occurs when asset and pair move in opposite directions when they should move together
  // OR when they move together when they should move opposite
  
  let divergence: 'Bullish SMT' | 'Bearish SMT' | 'None' = 'None';
  let strength = 0;
  let divergenceBars = 0;
  
  // For EUR/GBP vs DXY (negative correlation):
  // - If DXY goes up, EUR/GBP should go down
  // - If DXY goes up but EUR/GBP also goes up = Bullish SMT (EUR strength)
  // - If DXY goes down but EUR/GBP also goes down = Bearish SMT (EUR weakness)
  
  // For US100 vs S&P500 (positive correlation):
  // - If S&P500 goes up, US100 should go up
  // - If S&P500 goes up but US100 goes down = Bearish SMT
  // - If S&P500 goes down but US100 goes up = Bullish SMT
  
  // IMPROVED DIVERGENCE DETECTION (20-30 candle period)
  const period = Math.min(30, Math.min(alignedCandles.length, pairCandles.length));
  const recentAssetCandles = alignedCandles.slice(-period);
  const recentPairCandles = pairCandles.slice(-period);
  
  if (recentAssetCandles.length < 20 || recentPairCandles.length < 20) {
    return {
      divergence: 'None',
      strength: 0,
      correlation: Math.round(correlation * 100) / 100,
      assetPrice: assetCandles[assetCandles.length - 1].close,
      pairPrice: pairCandles[pairCandles.length - 1]?.close || 0,
      assetTrend,
      pairTrend,
      divergenceBars: 0,
    };
  }
  
  // Calculate returns for divergence detection
  const assetReturns: number[] = [];
  const pairReturns: number[] = [];
  
  for (let i = 1; i < recentAssetCandles.length; i++) {
    const assetReturn = (recentAssetCandles[i].asset.close - recentAssetCandles[i-1].asset.close) / recentAssetCandles[i-1].asset.close;
    const pairReturn = (recentPairCandles[i].close - recentPairCandles[i-1].close) / recentPairCandles[i-1].close;
    assetReturns.push(assetReturn);
    pairReturns.push(pairReturn);
  }
  
  // Calculate expected correlation (based on pair type)
  const expectedCorrelationValue = config.smtPair === 'DXY' ? -0.8 : 0.9;
  
  // Calculate actual correlation over the period
  const actualCorrelation = calculateCorrelation(
    recentAssetCandles.map(c => c.asset),
    recentPairCandles
  );
  
  // Divergence detection: Compare actual vs expected correlation
  const correlationDiff = Math.abs(actualCorrelation - expectedCorrelationValue);
  const correlationThreshold = 0.3; // Significant difference threshold
  
  if (config.smtPair === 'DXY') {
    // Negative correlation expected (-0.8)
    // If actual is positive or less negative than expected = divergence
    if (actualCorrelation > expectedCorrelationValue + correlationThreshold) {
      // Asset and pair moving together when they shouldn't
      const assetTrendRecent = calculateTrend(recentAssetCandles.map(c => c.asset), 10);
      const pairTrendRecent = calculateTrend(recentPairCandles, 10);
      
      if (assetTrendRecent === 'Bullish' && pairTrendRecent === 'Bullish') {
        // Both bullish = Bullish SMT (asset strength)
        divergence = 'Bullish SMT';
        strength = Math.min(100, correlationDiff * 200);
        divergenceBars = period;
      } else if (assetTrendRecent === 'Bearish' && pairTrendRecent === 'Bearish') {
        // Both bearish = Bearish SMT (asset weakness)
        divergence = 'Bearish SMT';
        strength = Math.min(100, correlationDiff * 200);
        divergenceBars = period;
      }
    }
  } else if (config.smtPair === 'SPX500') {
    // Positive correlation expected (0.9)
    // If actual is negative or less positive than expected = divergence
    if (actualCorrelation < expectedCorrelationValue - correlationThreshold) {
      const assetTrendRecent = calculateTrend(recentAssetCandles.map(c => c.asset), 10);
      const pairTrendRecent = calculateTrend(recentPairCandles, 10);
      
      if (assetTrendRecent === 'Bearish' && pairTrendRecent === 'Bullish') {
        // Asset down, pair up = Bearish SMT
        divergence = 'Bearish SMT';
        strength = Math.min(100, correlationDiff * 200);
        divergenceBars = period;
      } else if (assetTrendRecent === 'Bullish' && pairTrendRecent === 'Bearish') {
        // Asset up, pair down = Bullish SMT
        divergence = 'Bullish SMT';
        strength = Math.min(100, correlationDiff * 200);
        divergenceBars = period;
      }
    }
  }
  
  // Calculate divergence strength more accurately
  if (divergence !== 'None') {
    // Use average return magnitude to calculate strength
    const avgAssetReturn = assetReturns.reduce((a, b) => a + Math.abs(b), 0) / assetReturns.length;
    const avgPairReturn = pairReturns.reduce((a, b) => a + Math.abs(b), 0) / pairReturns.length;
    const returnDiff = Math.abs(avgAssetReturn - avgPairReturn);
    strength = Math.min(100, (returnDiff * 10000) + (correlationDiff * 50));
  }
  
  return {
    divergence,
    strength: Math.round(strength),
    correlation: Math.round(correlation * 100) / 100,
    correlationTrend,
    assetPrice: assetCandles[assetCandles.length - 1].close,
    pairPrice: pairCandles[pairCandles.length - 1]?.close || 0,
    assetTrend,
    pairTrend,
    divergenceBars,
  };
};

/**
 * Calculate multi-asset SMT comparison
 */
export const calculateMultiAssetSMT = async (
  assets: Asset[],
  candlesMap: Map<Asset, Candle[]>
): Promise<Map<Asset, SMTData>> => {
  const results = new Map<Asset, SMTData>();
  
  for (const asset of assets) {
    const candles = candlesMap.get(asset);
    if (candles && candles.length > 0) {
      const smtData = await calculateSMT(asset, candles);
      results.set(asset, smtData);
    }
  }
  
  return results;
};

