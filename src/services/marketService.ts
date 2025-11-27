import { SMCZone, MarketBias, Notification, Candle, ZoneStatus, ChartMarker, LiquidityLevel } from "../types";

const calculateZoneScore = (
    zoneType: string, 
    marketTrend: string, 
    h1Trend: string,
    h4Trend: string,
    hasDisplacement: boolean,
    hasFVG: boolean,
    hasSweep: boolean,
    isStructureBreak: boolean,
    isPremiumDiscount: boolean,
    smtStatus: string,
    hasInducement: boolean
  ): { score: number, reasons: string[] } => {
    let score = 0; 
    const reasons: string[] = [];
  
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
        score -= 25; // Heavy penalty for counter-trend
        reasons.push("⚠️ Zıt Trend (Counter-Trade)");
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

    if (isPremiumDiscount) { score += 10; reasons.push("Ucuzluk/Pahalılık Bölgesi"); }
    
    if (hasInducement) {
        score += 10;
        reasons.push("Teşvik (Inducement) Var");
    }
  
    if ((zoneType.includes('Bullish') && smtStatus.includes('Bullish')) || (zoneType.includes('Bearish') && smtStatus.includes('Bearish'))) {
        score += 5;
        reasons.push("SMT Onayı");
    }
  
    return { score: Math.max(0, Math.min(score, 100)), reasons };
};

const isSwingLow = (candles: Candle[], index: number) => {
    if (index < 2 || index > candles.length - 3) return false;
    const current = candles[index].low;
    return current < candles[index-1].low && current < candles[index-2].low && 
           current < candles[index+1].low && current < candles[index+2].low;
};

const isSwingHigh = (candles: Candle[], index: number) => {
    if (index < 2 || index > candles.length - 3) return false;
    const current = candles[index].high;
    return current > candles[index-1].high && current > candles[index-2].high && 
           current > candles[index+1].high && current > candles[index+2].high;
};

export const analyzeMarketHistory = (candles: Candle[], h1Candles: Candle[], h4Candles: Candle[]) => {
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
    
    // Calculate start of current day (UTC 00:00)
    const currentDayStart = Math.floor(lastTime / daySeconds) * daySeconds;
    const prevDayStart = currentDayStart - daySeconds;

    // --- ASIA RANGE & MIDNIGHT OPEN LOGIC ---
    let asiaHigh = -Infinity;
    let asiaLow = Infinity;
    let midnightOpenPrice = 0;
    
    // Asia Range (approx 00:00 - 06:00 UTC)
    const asiaStart = currentDayStart; 
    const asiaEnd = currentDayStart + (6 * 3600); 

    let foundPrevDayData = false;
    
    for (const c of candles) {
        // PDH/PDL
        if (c.time >= prevDayStart && c.time < currentDayStart) {
            if (c.high > pdh) pdh = c.high;
            if (c.low < pdl) pdl = c.low;
            foundPrevDayData = true;
        }

        // Asia Range Calculation (Current Day)
        if (c.time >= asiaStart && c.time < asiaEnd) {
            if (c.high > asiaHigh) asiaHigh = c.high;
            if (c.low < asiaLow) asiaLow = c.low;
        }

        // Midnight Open
        if (c.time >= currentDayStart && c.time < currentDayStart + 900) { // First 15m candle of day
            if (midnightOpenPrice === 0) midnightOpenPrice = c.open;
        }
    }

    if (foundPrevDayData) {
        liquidityLevels.push({ price: pdh, label: 'PDH (Likidite)', color: '#3b82f6', lineStyle: 0 }); 
        liquidityLevels.push({ price: pdl, label: 'PDL (Likidite)', color: '#f97316', lineStyle: 0 }); 
    }

    // Add Asia Levels to chart if valid
    if (asiaHigh !== -Infinity && asiaLow !== Infinity) {
        liquidityLevels.push({ price: asiaHigh, label: 'ASIA HIGH', color: '#8b5cf6', lineStyle: 2 });
        liquidityLevels.push({ price: asiaLow, label: 'ASIA LOW', color: '#8b5cf6', lineStyle: 2 });
    }
    
    // Add Midnight Open
    if (midnightOpenPrice !== 0) {
        liquidityLevels.push({ price: midnightOpenPrice, label: 'NY MIDNIGHT OPEN', color: '#d946ef', lineStyle: 3 });
    }

    // --- ATR CALCULATION ---
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
  
    // --- TREND & BIAS ---
    const currentClose = candles[candles.length - 1].close;
    const trend = currentClose > candles[candles.length - 50].open ? 'Bullish' : 'Bearish';
    const m15Trend = trend;
    
    const h1Trend = h1Candles.length > 20 ? (h1Candles[h1Candles.length-1].close > h1Candles[h1Candles.length-20].open ? 'Bullish' : 'Bearish') : trend;
    const h4Trend = h4Candles.length > 20 ? (h4Candles[h4Candles.length-1].close > h4Candles[h4Candles.length-20].open ? 'Bullish' : 'Bearish') : trend;
  
    let volatility: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (atr14 < 0.0010) volatility = 'LOW';
    else if (atr14 > 0.0025) volatility = 'HIGH';
  
    let smtDivergence: 'Bullish SMT' | 'Bearish SMT' | 'None' = 'None';
    if (trend === 'Bearish' && volatility === 'HIGH' && currentClose > candles[candles.length-5].high) smtDivergence = 'Bullish SMT';
    if (trend === 'Bullish' && volatility === 'HIGH' && currentClose < candles[candles.length-5].low) smtDivergence = 'Bearish SMT';
  
    const recentHigh = Math.max(...candles.slice(-50).map((c) => c.high));
    const recentLow = Math.min(...candles.slice(-50).map((c) => c.low));
    const eq = (recentHigh + recentLow) / 2;
    const pdStatus = currentClose > eq ? 'Premium' : 'Discount';
    const nextTarget = trend === 'Bullish' ? recentHigh : recentLow; 
    
    const hour = new Date().getUTCHours();
    let dailyBias: 'Accumulation' | 'Manipulation' | 'Distribution' = 'Accumulation';
    if (hour >= 7 && hour < 12) dailyBias = 'Manipulation'; 
    if (hour >= 12) dailyBias = 'Distribution';
    const isNewsLocked = (new Date().getMinutes() >= 45);
    let dxyCorrelation: 'Positive' | 'Negative' | 'Neutral' = 'Negative';

    let lastSwingHigh = -1;
    let lastSwingLow = -1;
    let structureTrend: 'Bullish' | 'Bearish' = trend;

    // --- MAIN ANALYSIS LOOP ---
    for (let i = 20; i < candles.length - 3; i++) {
      const current = candles[i];
      
      // 1. UPDATE SWING POINTS
      if (isSwingHigh(candles, i)) lastSwingHigh = current.high;
      if (isSwingLow(candles, i)) lastSwingLow = current.low;

      // 2. MANIPULATION DETECTION
      const sweptLevelHigh = [pdh, asiaHigh].find(l => current.high > l && current.high < l + atr14);
      const sweptLevelLow = [pdl, asiaLow].find(l => current.low < l && current.low > l - atr14);

      if (sweptLevelHigh && current.close < current.open) {
          const nearby = markers.find(m => Math.abs(m.time - current.time) < 1800);
          if (!nearby) {
             markers.push({ time: current.time, position: 'aboveBar', color: '#ec4899', shape: 'arrowDown', text: 'SWEEP', size: 2 });
             if (i > candles.length - 10) notifications.push({id: Math.random(), time: new Date(current.time * 1000).toLocaleTimeString(), title: "LİKİDİTE AVI", message: "PDH/Asia High temizlendi.", type: 'warning'});
          }
      }

      if (sweptLevelLow && current.close > current.open) {
          const nearby = markers.find(m => Math.abs(m.time - current.time) < 1800);
          if (!nearby) {
             markers.push({ time: current.time, position: 'belowBar', color: '#ec4899', shape: 'arrowUp', text: 'SWEEP', size: 2 });
             if (i > candles.length - 10) notifications.push({id: Math.random(), time: new Date(current.time * 1000).toLocaleTimeString(), title: "LİKİDİTE AVI", message: "PDL/Asia Low temizlendi.", type: 'warning'});
          }
      }

      // 3. FVG DETECTION
      const isBullishFVG = candles[i+2] && current.high < candles[i+2].low;
      const isBearishFVG = candles[i+2] && current.low > candles[i+2].high;

      if (isBullishFVG) {
          if ((candles[i+2].low - current.high) > atr14 * 0.5) {
             if (i > candles.length - 50) {
                 zones.push({
                     id: `BullFVG-${i}`, type: 'Bullish FVG',
                     priceTop: candles[i+2].low, priceBottom: current.high,
                     time: new Date(current.time * 1000).toLocaleTimeString(), timestamp: current.time,
                     status: 'FRESH', score: 70, confluence: ['Displacement', 'Imbalance']
                 });
             }
          }
      }
      if (isBearishFVG) {
          if ((current.low - candles[i+2].high) > atr14 * 0.5) {
            if (i > candles.length - 50) {
                zones.push({
                    id: `BearFVG-${i}`, type: 'Bearish FVG',
                    priceTop: current.low, priceBottom: candles[i+2].high,
                    time: new Date(current.time * 1000).toLocaleTimeString(), timestamp: current.time,
                    status: 'FRESH', score: 70, confluence: ['Displacement', 'Imbalance']
                });
            }
          }
      }

      // 4. STRUCTURE BREAKS (BOS / ChoCh)
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

      // 5. ORDER BLOCK LOGIC
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
              const tpPrice = zoneTop + ((zoneTop - zoneBottom) * 2);

              for (let k = i + 1; k < candles.length; k++) {
                  const future = candles[k];
                  if (future.close < zoneBottom) { status = 'BROKEN'; outcome='LOSS'; break; }
                  if (future.low <= zoneTop && future.low >= zoneBottom && status === 'FRESH') { 
                      status = 'TESTED'; 
                      retestTime = new Date(future.time * 1000).toLocaleTimeString(); 
                  }
                  if (status === 'TESTED' && future.high >= tpPrice) { outcome = 'WIN'; break; }
              }

              const { score, reasons } = calculateZoneScore('Bullish OB', trend, h1Trend, h4Trend, hasDisplacement, hasUnicornFVG, hasSweep, true, current.low < eq, smtDivergence, false);

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

      // Bearish OB
      if (current.close > current.open) { 
          const nextCandles = candles.slice(i+1, i+4);
          const hasDisplacement = nextCandles.some(c => (c.open - c.close) > atr14 * 0.8 && c.close < current.low);
          
          if (hasDisplacement) {
              const lookbackHigh = Math.max(...candles.slice(i-5, i).map(c => c.high));
              const hasSweep = current.high > lookbackHigh;
              const hasUnicornFVG = nextCandles.some((c, idx) => {
                  const candleIdx = i + 1 + idx;
                  return candles[candleIdx+2] && c.low > candles[candleIdx+2].high;
              });

              const zoneTop = current.high;
              const zoneBottom = current.low;
              
              let status: ZoneStatus = 'FRESH';
              let retestTime = undefined;
              let outcome = 'OPEN';
              const tpPrice = zoneBottom - ((zoneTop - zoneBottom) * 2);

              for (let k = i + 1; k < candles.length; k++) {
                  const future = candles[k];
                  if (future.close > zoneTop) { status = 'BROKEN'; outcome='LOSS'; break; }
                  if (future.high >= zoneBottom && future.high <= zoneTop && status === 'FRESH') {
                      status = 'TESTED';
                      retestTime = new Date(future.time * 1000).toLocaleTimeString();
                  }
                  if (status === 'TESTED' && future.low <= tpPrice) { outcome = 'WIN'; break; }
              }

              const { score, reasons } = calculateZoneScore('Bearish OB', trend, h1Trend, h4Trend, hasDisplacement, hasUnicornFVG, hasSweep, true, current.high > eq, smtDivergence, false);

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
                      status, retestTime, score, confluence: reasons 
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
        midnightOpen: midnightOpenPrice || undefined
    };
  
    return { zones: zones.reverse().slice(0, 30), bias, notifications: notifications.reverse(), markers: markers.slice(-20), liquidityLevels };
};