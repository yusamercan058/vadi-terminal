
import { SMCZone, MarketBias, Notification, Candle, ZoneStatus, ChartMarker, LiquidityLevel, Asset } from "../types";

const calculateZoneScore = (
    zoneType: string, 
    marketTrend: string, 
    h1Trend: string,
    h4Trend: string,
    hasDisplacement: boolean,
    hasFVG: boolean,
    hasSweep: boolean,
    isStructureBreak: boolean,
    premiumDiscountStatus: 'Premium' | 'Discount' | 'Equilibrium',
    smtStatus: string,
    hasInducement: boolean,
    candleTime: number,
    isMitigated: boolean,
    isInGoldenZone: boolean,
    historicalSuccessRate?: number
  ): { score: number, reasons: string[] } => {
    let score = 0; 
    const reasons: string[] = [];
  
    // 0. Mitigation Check (Critical for Accuracy)
    if (isMitigated) {
        score -= 30;
        reasons.push("⚠️ Bölge Test Edildi (Mitigated)");
    } else {
        score += 10;
        reasons.push("💎 Fresh (Taze) Bölge");
    }

    // 1. Fractal Trend Alignment (MTF)
    const isM15Aligned = (zoneType.includes('Bullish') && marketTrend === 'Bullish') || (zoneType.includes('Bearish') && marketTrend === 'Bearish');
    const isH1Aligned = (zoneType.includes('Bullish') && h1Trend === 'Bullish') || (zoneType.includes('Bearish') && h1Trend === 'Bearish');
    const isH4Aligned = (zoneType.includes('Bullish') && h4Trend === 'Bullish') || (zoneType.includes('Bearish') && h4Trend === 'Bearish');

    if (isM15Aligned && isH1Aligned && isH4Aligned) {
        score += 30;
        reasons.push("Tam MTF Uyumu (M15+H1+H4)");
    } else if (isM15Aligned && isH1Aligned) {
        score += 20;
        reasons.push("H1 Trend Uyumu");
    } else if (isM15Aligned) {
        score += 10;
        reasons.push("M15 Trend Uyumu");
    } else {
        // STRICTER FILTER
        if (!isStructureBreak) {
            score -= 30; 
            reasons.push("⚠️ Zıt Trend (MSS Yok - Tehlikeli)");
        } else {
            score -= 10;
            reasons.push("⚠️ Zıt Trend (MSS Onaylı)");
        }
    }
  
    // 2. ICT Specifics
    if (hasSweep) { score += 15; reasons.push("Likidite Temizliği (Sweep)"); }
    if (isStructureBreak) { score += 15; reasons.push("Market Yapısı Kırılımı (MSS)"); }
    if (hasDisplacement) { score += 10; reasons.push("Hacimli Kopuş (Displacement)"); }
    
    // 3. The Unicorn Criteria (OB + FVG overlap)
    if (hasFVG) { 
        score += 15; 
        reasons.push("FVG ile Kesişim (Unicorn)"); 
    }

    // 4. Premium / Discount Logic
    if (zoneType.includes('Bullish')) {
        if (premiumDiscountStatus === 'Discount') {
            score += 15;
            reasons.push("✅ Discount (Ucuz) Bölge");
        } else if (premiumDiscountStatus === 'Premium') {
            score -= 20; 
            reasons.push("❌ Premium Bölgede Alış (Riskli)");
        }
    } else if (zoneType.includes('Bearish')) {
        if (premiumDiscountStatus === 'Premium') {
            score += 15;
            reasons.push("✅ Premium (Pahalı) Bölge");
        } else if (premiumDiscountStatus === 'Discount') {
            score -= 20; 
            reasons.push("❌ Discount Bölgede Satış (Riskli)");
        }
    }

    // 5. GOLDEN ZONE (OTE)
    if (isInGoldenZone) {
        score += 20; // Increased score weight for OTE
        reasons.push("✨ Golden Zone (OTE 62-79%)");
    }

    // 6. TIME FACTOR (KILLZONES)
    const zoneDate = new Date(candleTime * 1000);
    const hour = zoneDate.getUTCHours();
    
    if ((hour >= 7 && hour < 10) || (hour >= 12 && hour < 15)) {
        score += 15;
        reasons.push("⏰ KILLZONE (Yüksek Olasılık)");
    }
    
    if (hasInducement) {
        score += 10;
        reasons.push("Teşvik (Inducement) Var");
    }
  
    if ((zoneType.includes('Bullish') && smtStatus.includes('Bullish')) || (zoneType.includes('Bearish') && smtStatus.includes('Bearish'))) {
        score += 5;
        reasons.push("SMT Onayı");
    }
    
    // 7. HISTORICAL SUCCESS RATE (if available)
    if (historicalSuccessRate !== undefined && historicalSuccessRate > 0) {
        // Add up to 15 points based on historical success
        const historicalBonus = (historicalSuccessRate / 100) * 15;
        score += historicalBonus;
        reasons.push(`📊 Historical: ${historicalSuccessRate.toFixed(0)}%`);
    }
  
    return { score: Math.max(0, Math.min(score, 100)), reasons };
};

/**
 * Improved Swing Low Detection with configurable lookback
 * Uses fractal structure for more accurate detection
 */
const isSwingLow = (candles: Candle[], index: number, lookback: number = 5) => {
    if (index < lookback || index > candles.length - lookback - 1) return false;
    
    const current = candles[index].low;
    let isLowest = true;
    
    // Check left side (previous candles)
    for (let i = index - lookback; i < index; i++) {
        if (candles[i].low <= current) {
            isLowest = false;
            break;
        }
    }
    
    // Check right side (future candles)
    if (isLowest) {
        for (let i = index + 1; i <= index + lookback; i++) {
            if (candles[i].low <= current) {
                isLowest = false;
                break;
            }
        }
    }
    
    // Additional validation: Check if it's a significant swing (not just noise)
    if (isLowest) {
        const avgRange = candles.slice(index - lookback, index + lookback + 1)
            .reduce((sum, c) => sum + (c.high - c.low), 0) / (lookback * 2 + 1);
        const swingDepth = Math.min(
            candles[index - 1].low - current,
            candles[index + 1].low - current
        );
        // Swing should be at least 30% of average range
        if (swingDepth < avgRange * 0.3) {
            return false;
        }
    }
    
    return isLowest;
};

/**
 * Improved Swing High Detection with configurable lookback
 * Uses fractal structure for more accurate detection
 */
const isSwingHigh = (candles: Candle[], index: number, lookback: number = 5) => {
    if (index < lookback || index > candles.length - lookback - 1) return false;
    
    const current = candles[index].high;
    let isHighest = true;
    
    // Check left side (previous candles)
    for (let i = index - lookback; i < index; i++) {
        if (candles[i].high >= current) {
            isHighest = false;
            break;
        }
    }
    
    // Check right side (future candles)
    if (isHighest) {
        for (let i = index + 1; i <= index + lookback; i++) {
            if (candles[i].high >= current) {
                isHighest = false;
                break;
            }
        }
    }
    
    // Additional validation: Check if it's a significant swing (not just noise)
    if (isHighest) {
        const avgRange = candles.slice(index - lookback, index + lookback + 1)
            .reduce((sum, c) => sum + (c.high - c.low), 0) / (lookback * 2 + 1);
        const swingHeight = Math.min(
            current - candles[index - 1].high,
            current - candles[index + 1].high
        );
        // Swing should be at least 30% of average range
        if (swingHeight < avgRange * 0.3) {
            return false;
        }
    }
    
    return isHighest;
};

export const analyzeMarketHistory = (candles: Candle[], h1Candles: Candle[], h4Candles: Candle[], historicalTrades?: any[]) => {
    const zones: SMCZone[] = [];
    const notifications: Notification[] = [];
    const markers: ChartMarker[] = [];
    const liquidityLevels: LiquidityLevel[] = [];

    let totalTrades = 0;
    let winningTrades = 0;
    
    if (!candles || candles.length < 100) return { zones: [], bias: null, notifications: [], markers: [], liquidityLevels: [] };
  
    // --- LIQUIDITY LEVELS (PDH/PDL) ---
    let pdh = -Infinity;
    let pdl = Infinity;
    
    const lastTime = candles[candles.length - 1].time; // Unix Seconds
    const daySeconds = 86400;
    const currentDayStart = Math.floor(lastTime / daySeconds) * daySeconds;
    const prevDayStart = currentDayStart - daySeconds;

    // --- ASIA RANGE & MIDNIGHT OPEN ---
    let asiaHigh = -Infinity;
    let asiaLow = Infinity;
    let midnightOpenPrice = 0;
    const asiaStart = currentDayStart; 
    const asiaEnd = currentDayStart + (6 * 3600); 

    let foundPrevDayData = false;
    
    for (const c of candles) {
        if (c.time >= prevDayStart && c.time < currentDayStart) {
            if (c.high > pdh) pdh = c.high;
            if (c.low < pdl) pdl = c.low;
            foundPrevDayData = true;
        }
        if (c.time >= asiaStart && c.time < asiaEnd) {
            if (c.high > asiaHigh) asiaHigh = c.high;
            if (c.low < asiaLow) asiaLow = c.low;
        }
        if (c.time >= currentDayStart && c.time < currentDayStart + 900) {
            if (midnightOpenPrice === 0) midnightOpenPrice = c.open;
        }
    }

    if (foundPrevDayData) {
        liquidityLevels.push({ price: pdh, label: 'PDH (Likidite)', color: '#3b82f6', lineStyle: 0 }); 
        liquidityLevels.push({ price: pdl, label: 'PDL (Likidite)', color: '#f97316', lineStyle: 0 }); 
    }
    if (asiaHigh !== -Infinity && asiaLow !== Infinity) {
        liquidityLevels.push({ price: asiaHigh, label: 'ASIA HIGH', color: '#8b5cf6', lineStyle: 2 });
        liquidityLevels.push({ price: asiaLow, label: 'ASIA LOW', color: '#8b5cf6', lineStyle: 2 });
    }
    if (midnightOpenPrice !== 0) {
        liquidityLevels.push({ price: midnightOpenPrice, label: 'NY MIDNIGHT OPEN', color: '#d946ef', lineStyle: 3 });
    }

    // --- ATR ---
    const calculateATR = (period: number) => {
        let atr = 0;
        const startIndex = candles.length - period - 1;
        for (let i = startIndex; i < candles.length; i++) {
            const tr = Math.max(
                candles[i].high - candles[i].low,
                Math.abs(candles[i].high - candles[i-1].close),
                Math.abs(candles[i].low - candles[i-1].close)
            );
            atr += tr;
        }
        return atr / period;
    };
    const atr14 = calculateATR(14);
  
    // --- IMPROVED TREND & BIAS CALCULATION (EMA-based) ---
    const calculateEMA = (candles: Candle[], period: number): number => {
        if (candles.length < period) return candles[candles.length - 1].close;
        const multiplier = 2 / (period + 1);
        let ema = candles.slice(-period).reduce((sum, c) => sum + c.close, 0) / period;
        for (let i = candles.length - period + 1; i < candles.length; i++) {
            ema = (candles[i].close * multiplier) + (ema * (1 - multiplier));
        }
        return ema;
    };
    
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const ema200 = calculateEMA(candles, 200);
    const currentClose = candles[candles.length - 1].close;
    
    // Improved trend calculation using EMA
    let trend: 'Bullish' | 'Bearish' | 'Range' = 'Range';
    if (currentClose > ema20 && ema20 > ema50 && ema50 > ema200) {
        trend = 'Bullish';
    } else if (currentClose < ema20 && ema20 < ema50 && ema50 < ema200) {
        trend = 'Bearish';
    } else {
        // Range or consolidation
        const priceRange = Math.max(...candles.slice(-50).map(c => c.high)) - Math.min(...candles.slice(-50).map(c => c.low));
        const priceChange = Math.abs(currentClose - candles[candles.length - 50].close);
        if (priceChange / priceRange < 0.3) {
            trend = 'Range';
        } else {
            trend = currentClose > candles[candles.length - 50].close ? 'Bullish' : 'Bearish';
        }
    }
    
    // Calculate trend strength (ADX-like)
    const calculateTrendStrength = (candles: Candle[], period: number = 14): number => {
        if (candles.length < period + 1) return 50;
        let plusDM = 0;
        let minusDM = 0;
        for (let i = candles.length - period; i < candles.length; i++) {
            const highDiff = candles[i].high - candles[i-1].high;
            const lowDiff = candles[i-1].low - candles[i].low;
            if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
            if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;
        }
        const avgRange = candles.slice(-period).reduce((sum, c) => sum + (c.high - c.low), 0) / period;
        const dx = avgRange > 0 ? (Math.abs(plusDM - minusDM) / avgRange) * 100 : 0;
        return Math.min(100, Math.max(0, dx));
    };
    
    const trendStrength = calculateTrendStrength(candles, 14);
    
    // Multi-timeframe trends with EMA
    const m15Trend = trend;
    const h1Trend = h1Candles.length > 20 ? 
        (h1Candles[h1Candles.length-1].close > calculateEMA(h1Candles, 20) ? 'Bullish' : 'Bearish') : trend;
    const h4Trend = h4Candles.length > 20 ? 
        (h4Candles[h4Candles.length-1].close > calculateEMA(h4Candles, 20) ? 'Bullish' : 'Bearish') : trend;
  
    let volatility: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (atr14 < 0.0010) volatility = 'LOW';
    else if (atr14 > 0.0025) volatility = 'HIGH';
  
    // Calculate SMT using real correlation pairs
    // Note: SMT calculation is async, but we'll use a synchronous fallback here
    // The actual SMT calculation is done in App.tsx after this function returns
    let smtDivergence: 'Bullish SMT' | 'Bearish SMT' | 'None' = 'None';
    
    // Fallback calculation (will be overridden by real SMT in App.tsx)
    if (trend === 'Bearish' && volatility === 'HIGH' && currentClose > candles[candles.length-5].high) smtDivergence = 'Bullish SMT';
    if (trend === 'Bullish' && volatility === 'HIGH' && currentClose < candles[candles.length-5].low) smtDivergence = 'Bearish SMT';
  
    const rangeLookback = 100;
    const recentHigh = Math.max(...candles.slice(-rangeLookback).map((c) => c.high));
    const recentLow = Math.min(...candles.slice(-rangeLookback).map((c) => c.low));
    const equilibrium = (recentHigh + recentLow) / 2;
    const pdStatus = currentClose > equilibrium ? 'Premium' : 'Discount';
    const nextTarget = trend === 'Bullish' ? recentHigh : recentLow; 
    
    // Golden Zone (OTE 62% - 79%) Check
    const range = recentHigh - recentLow;
    // OTE is a deep retracement. 
    // If Bullish, we want price to drop down to 62-79% pullback. 
    // Level is Low + (Range * (1-0.62)) = Low + 0.38 Range? No.
    // Fib tool 0 at Low, 1 at High. Retracement 0.618 is at Low + 0.618 Range? No, usually measures from swing start.
    // Standard: Price drops 61.8% OF THE RANGE. 
    // So target price = High - (Range * 0.618).
    
    // Correct OTE Levels (61.8% - 79% Retracement)
    const oteUpper = trend === 'Bullish' 
        ? recentHigh - (range * 0.618) 
        : recentLow + (range * 0.618);
        
    const oteLower = trend === 'Bullish'
        ? recentHigh - (range * 0.79)
        : recentLow + (range * 0.79);
    
    const hour = new Date().getUTCHours();
    let dailyBias: 'Accumulation' | 'Manipulation' | 'Distribution' = 'Accumulation';
    if (hour >= 7 && hour < 12) dailyBias = 'Manipulation'; 
    if (hour >= 12) dailyBias = 'Distribution';
    const isNewsLocked = (new Date().getMinutes() >= 45);
    let dxyCorrelation: 'Positive' | 'Negative' | 'Neutral' = 'Negative';

    let lastSwingHigh = -1;
    let lastSwingLow = -1;
    let structureTrend: 'Bullish' | 'Bearish' = trend === 'Range' ? 'Bullish' : trend;

    // --- MAIN ANALYSIS LOOP ---
    for (let i = 20; i < candles.length - 3; i++) {
      const current = candles[i];
      
      if (isSwingHigh(candles, i, 5)) lastSwingHigh = current.high;
      if (isSwingLow(candles, i, 5)) lastSwingLow = current.low;

      // 2. SWEEPS
      const sweptLevelHigh = [pdh, asiaHigh].find(l => current.high > l && current.high < l + atr14);
      const sweptLevelLow = [pdl, asiaLow].find(l => current.low < l && current.low > l - atr14);

      if (sweptLevelHigh && current.close < current.open) {
          const nearby = markers.find(m => Math.abs(m.time - current.time) < 1800);
          if (!nearby) {
             markers.push({ time: current.time, position: 'aboveBar', color: '#ec4899', shape: 'arrowDown', text: 'SWEEP', size: 2 });
          }
      }

      if (sweptLevelLow && current.close > current.open) {
          const nearby = markers.find(m => Math.abs(m.time - current.time) < 1800);
          if (!nearby) {
             markers.push({ time: current.time, position: 'belowBar', color: '#ec4899', shape: 'arrowUp', text: 'SWEEP', size: 2 });
          }
      }

      // 3. IMPROVED FVG DETECTION (5-7 candle lookback)
      // Bullish FVG: Gap between current high and future candle low
      let isBullishFVG = false;
      let bullishFVGTop = 0;
      let bullishFVGBottom = 0;
      
      // Check multiple future candles (up to 7 candles ahead)
      for (let lookahead = 2; lookahead <= 7 && i + lookahead < candles.length; lookahead++) {
          const futureCandle = candles[i + lookahead];
          if (futureCandle && current.high < futureCandle.low) {
              // Check if gap is significant
              const gapSize = futureCandle.low - current.high;
              if (gapSize > atr14 * 0.5) {
                  // Check if gap hasn't been filled
                  let isFilled = false;
                  for (let k = i + 1; k < i + lookahead; k++) {
                      if (candles[k].low <= current.high || candles[k].high >= futureCandle.low) {
                          isFilled = true;
                          break;
                      }
                  }
                  
                  if (!isFilled) {
                      isBullishFVG = true;
                      bullishFVGTop = futureCandle.low;
                      bullishFVGBottom = current.high;
                      break; // Use first valid FVG
                  }
              }
          }
      }
      
      if (isBullishFVG && i > candles.length - 50) {
          // Check if FVG has been filled in future candles
          let isFilled = false;
          for (let k = i + 1; k < candles.length; k++) {
              if (candles[k].low <= bullishFVGBottom || candles[k].high >= bullishFVGTop) {
                  isFilled = true;
                  break;
              }
          }
          
          if (!isFilled) {
              zones.push({
                  id: `BullFVG-${i}`, type: 'Bullish FVG',
                  priceTop: bullishFVGTop, priceBottom: bullishFVGBottom,
                  time: new Date(current.time * 1000).toLocaleTimeString(), timestamp: current.time,
                  status: 'FRESH', score: 70, confluence: ['Displacement', 'Imbalance']
              });
          }
      }
      
      // Bearish FVG: Gap between current low and future candle high
      let isBearishFVG = false;
      let bearishFVGTop = 0;
      let bearishFVGBottom = 0;
      
      for (let lookahead = 2; lookahead <= 7 && i + lookahead < candles.length; lookahead++) {
          const futureCandle = candles[i + lookahead];
          if (futureCandle && current.low > futureCandle.high) {
              const gapSize = current.low - futureCandle.high;
              if (gapSize > atr14 * 0.5) {
                  let isFilled = false;
                  for (let k = i + 1; k < i + lookahead; k++) {
                      if (candles[k].high >= current.low || candles[k].low <= futureCandle.high) {
                          isFilled = true;
                          break;
                      }
                  }
                  
                  if (!isFilled) {
                      isBearishFVG = true;
                      bearishFVGTop = current.low;
                      bearishFVGBottom = futureCandle.high;
                      break;
                  }
              }
          }
      }
      
      if (isBearishFVG && i > candles.length - 50) {
          let isFilled = false;
          for (let k = i + 1; k < candles.length; k++) {
              if (candles[k].high >= bearishFVGBottom || candles[k].low <= bearishFVGTop) {
                  isFilled = true;
                  break;
              }
          }
          
          if (!isFilled) {
              zones.push({
                  id: `BearFVG-${i}`, type: 'Bearish FVG',
                  priceTop: bearishFVGTop, priceBottom: bearishFVGBottom,
                  time: new Date(current.time * 1000).toLocaleTimeString(), timestamp: current.time,
                  status: 'FRESH', score: 70, confluence: ['Displacement', 'Imbalance']
              });
          }
      }

      // 4. STRUCTURE BREAKS
      if (lastSwingHigh !== -1 && current.close > lastSwingHigh && current.close > current.open) {
          if (current.close - lastSwingHigh > atr14 * 0.1) {
              const nearbyMarker = markers.find(m => Math.abs(m.time - current.time) < 900);
              if (!nearbyMarker) {
                  const isChoCh = structureTrend === 'Bearish';
                  markers.push({ time: current.time, position: 'aboveBar', color: isChoCh ? '#fbbf24' : '#22c55e', shape: 'arrowUp', text: isChoCh ? 'ChoCh' : 'BOS', size: isChoCh ? 2 : 1 });
                  if (isChoCh) structureTrend = 'Bullish';
                  lastSwingHigh = -1;
              }
          }
      }

      if (lastSwingLow !== -1 && current.close < lastSwingLow && current.close < current.open) {
          if (lastSwingLow - current.close > atr14 * 0.1) {
             const nearbyMarker = markers.find(m => Math.abs(m.time - current.time) < 900);
             if (!nearbyMarker) {
                 const isChoCh = structureTrend === 'Bullish';
                 markers.push({ time: current.time, position: 'belowBar', color: isChoCh ? '#fbbf24' : '#ef4444', shape: 'arrowDown', text: isChoCh ? 'ChoCh' : 'BOS', size: isChoCh ? 2 : 1 });
                 if (isChoCh) structureTrend = 'Bearish';
                 lastSwingLow = -1;
             }
          }
      }

      // 5. ORDER BLOCK
      const currentPd = current.close > equilibrium ? 'Premium' : 'Discount';
      
      // Check for Golden Zone overlap
      // Bullish: Price dropped into OTE (Between upper and lower bounds of retracement)
      // Bearish: Price rose into OTE
      const isInGoldenZone = trend === 'Bullish' 
          ? (current.low <= oteUpper && current.low >= oteLower)
          : (current.high >= oteUpper && current.high <= oteLower);

      // Bullish OB
      if (current.close < current.open) { 
          const nextCandles = candles.slice(i+1, i+4);
          const hasDisplacement = nextCandles.some(c => (c.close - c.open) > atr14 * 0.8 && c.close > current.high);
          
          if (hasDisplacement) {
              const lookbackLow = Math.min(...candles.slice(i-5, i).map(c => c.low));
              const hasSweep = current.low < lookbackLow;
              const hasUnicornFVG = nextCandles.some((c, idx) => {
                  const candleIdx = i + 1 + idx;
                  return candles[candleIdx+2] && c.high < candles[candleIdx+2].low;
              });

              const zoneTop = current.high; 
              const zoneBottom = current.low;
              
              let status: ZoneStatus = 'FRESH'; 
              let retestTime = undefined;
              let outcome = 'OPEN';
              let isMitigated = false;
              const tpPrice = zoneTop + ((zoneTop - zoneBottom) * 2);

              for (let k = i + 1; k < candles.length; k++) {
                  const future = candles[k];
                  if (future.close < zoneBottom) { status = 'BROKEN'; outcome='LOSS'; break; }
                  
                  // Check Mitigation
                  if (future.low <= zoneTop && future.low >= zoneBottom) {
                      isMitigated = true; // Touched
                      if (status === 'FRESH') { 
                          status = 'TESTED'; 
                          retestTime = new Date(future.time * 1000).toLocaleTimeString(); 
                      }
                  }
                  if (status === 'TESTED' && future.high >= tpPrice) { outcome = 'WIN'; break; }
              }

              // Calculate historical success rate for similar zones
              let historicalSuccessRate: number | undefined = undefined;
              if (historicalTrades && historicalTrades.length > 0) {
                  const similarTrades = historicalTrades.filter(t => {
                      // Filter by similar setup type and price proximity
                      const priceDiff = Math.abs((t.entryPrice || parseFloat(t.entry || '0')) - ((zoneTop + zoneBottom) / 2));
                      const priceRange = zoneTop - zoneBottom;
                      return priceDiff < priceRange * 2 && (t.type?.includes('Bullish') || t.setupType?.includes('Bullish'));
                  });
                  if (similarTrades.length > 0) {
                      const wins = similarTrades.filter(t => t.status === 'WIN').length;
                      historicalSuccessRate = (wins / similarTrades.length) * 100;
                  }
              }
              
              const { score, reasons } = calculateZoneScore('Bullish OB', trend, h1Trend, h4Trend, hasDisplacement, hasUnicornFVG, hasSweep, true, currentPd, smtDivergence, false, current.time, isMitigated, isInGoldenZone, historicalSuccessRate);

              if (outcome !== 'OPEN' && score >= 65) {
                  totalTrades++;
                  if (outcome === 'WIN') winningTrades++;
              }

              if ((status !== 'BROKEN' || i > candles.length - 20) && score > 60) {
                   zones.push({ 
                       id: `BullOB-${i}`, 
                       type: hasUnicornFVG ? 'Unicorn Setup' : 'Bullish OB', 
                       priceTop: zoneTop, 
                       priceBottom: zoneBottom, 
                       time: new Date(current.time * 1000).toLocaleTimeString(), 
                       timestamp: current.time,
                       status, retestTime, score, confluence: reasons 
                   });
              }
          }
      }

      // Bearish OB - Improved displacement detection
      if (current.close > current.open) { 
          const nextCandles = candles.slice(i+1, i+5); // Extended to 5 candles
          const hasDisplacement = nextCandles.some(c => {
              const bodySize = c.open - c.close;
              const bodyPercent = bodySize / c.open;
              return bodySize > atr14 * 0.8 && bodyPercent > 0.0005 && c.close < current.low;
          });
          
          if (hasDisplacement) {
              const lookbackHigh = Math.max(...candles.slice(Math.max(0, i-7), i).map(c => c.high));
              const hasSweep = current.high > lookbackHigh;
              
              // Improved Unicorn detection
              const hasUnicornFVG = nextCandles.some((c, idx) => {
                  const candleIdx = i + 1 + idx;
                  for (let fvgLookahead = 2; fvgLookahead <= 7 && candleIdx + fvgLookahead < candles.length; fvgLookahead++) {
                      const futureCandle = candles[candleIdx + fvgLookahead];
                      if (futureCandle && c.low > futureCandle.high) {
                          const gapSize = c.low - futureCandle.high;
                          if (gapSize > atr14 * 0.5) {
                              return true;
                          }
                      }
                  }
                  return false;
              });

              const zoneTop = current.high;
              const zoneBottom = current.low;
              
              let status: ZoneStatus = 'FRESH';
              let retestTime = undefined;
              let outcome = 'OPEN';
              let isMitigated = false;
              let testCount = 0;
              let lastTestTime: number | undefined = undefined;
              const tpPrice = zoneBottom - ((zoneTop - zoneBottom) * 2);
              const zoneAge = candles.length - i;

              for (let k = i + 1; k < candles.length; k++) {
                  const future = candles[k];
                  if (future.close > zoneTop) { status = 'BROKEN'; outcome='LOSS'; break; }
                  
                  if (future.high >= zoneBottom && future.high <= zoneTop) {
                      isMitigated = true;
                      testCount++;
                      lastTestTime = future.time;
                      if (status === 'FRESH') {
                          status = 'TESTED';
                          retestTime = new Date(future.time * 1000).toLocaleTimeString();
                      }
                  }
                  if (status === 'TESTED' && future.low <= tpPrice) { outcome = 'WIN'; break; }
              }

              // Calculate historical success rate for similar zones
              let historicalSuccessRate: number | undefined = undefined;
              if (historicalTrades && historicalTrades.length > 0) {
                  const similarTrades = historicalTrades.filter(t => {
                      const entryPrice = t.entryPrice || (t.entry ? parseFloat(t.entry) : 0);
                      const priceDiff = Math.abs(entryPrice - ((zoneTop + zoneBottom) / 2));
                      const priceRange = zoneTop - zoneBottom;
                      return priceDiff < priceRange * 2 && (t.type?.includes('Bearish') || t.setupType?.includes('Bearish'));
                  });
                  if (similarTrades.length > 0) {
                      const wins = similarTrades.filter(t => t.status === 'WIN').length;
                      historicalSuccessRate = (wins / similarTrades.length) * 100;
                  }
              }
              
              const { score, reasons } = calculateZoneScore('Bearish OB', trend, h1Trend, h4Trend, hasDisplacement, hasUnicornFVG, hasSweep, true, currentPd, smtDivergence, false, current.time, isMitigated, isInGoldenZone, historicalSuccessRate);

              if (outcome !== 'OPEN' && score >= 65) {
                  totalTrades++;
                  if (outcome === 'WIN') winningTrades++;
              }

              if ((status !== 'BROKEN' || i > candles.length - 20) && score > 60) {
                  zones.push({ 
                      id: `BearOB-${i}`, 
                      type: hasUnicornFVG ? 'Unicorn Setup' : 'Bearish OB', 
                      priceTop: zoneTop, 
                      priceBottom: zoneBottom, 
                      time: new Date(current.time * 1000).toLocaleTimeString(), 
                      timestamp: current.time,
                      status, 
                      retestTime, 
                      score, 
                      confluence: reasons,
                      age: zoneAge,
                      testCount: testCount,
                      lastTestTime: lastTestTime
                  });
              }
          }
      }
    }
  
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const bias: MarketBias = {
        trend, 
        structure: structureTrend === 'Bullish' ? (currentClose > lastSwingHigh ? 'BOS' : 'Consolidation') : (currentClose < lastSwingLow ? 'BOS' : 'Consolidation'),
        premiumDiscount: pdStatus, 
        nextTarget,
        mtf: { m15: m15Trend, h1: h1Trend, h4: h4Trend }, 
        winRate, 
        volatility, 
        dxyCorrelation, 
        smtDivergence, 
        dailyBias, 
        isNewsLocked, 
        totalTrades, 
        atrValue: atr14,
        asiaRange: (asiaHigh !== -Infinity) ? { high: asiaHigh, low: asiaLow } : undefined,
        midnightOpen: midnightOpenPrice || undefined,
        equilibrium
    };
  
    return { zones: zones.reverse().slice(0, 30), bias, notifications: notifications.reverse(), markers: markers.slice(-20), liquidityLevels };
};
