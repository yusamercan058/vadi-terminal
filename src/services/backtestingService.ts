import { BacktestConfig, BacktestResult, Strategy } from '../types/backtesting';
import { JournalEntry, Candle, Asset, SMCZone } from '../types';
import { analyzeMarketHistory } from './marketService';
import { ASSET_CONFIG } from '../constants';

/**
 * Fetch historical candle data from Binance API
 */
const fetchHistoricalData = async (
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<Candle[]> => {
  const allCandles: Candle[] = [];
  let currentStartTime = startTime;

  // Binance API limit: 1000 candles per request
  while (currentStartTime < endTime) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${currentStartTime * 1000}&endTime=${endTime * 1000}&limit=1000`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data || !Array.isArray(data) || data.length === 0) {
        break; // No more data
      }

      const candles = data.map((d: any[]) => ({
        time: d[0] / 1000, // Convert to seconds
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }));

      allCandles.push(...candles);

      // Update start time for next batch
      if (candles.length < 1000) {
        break; // Last batch
      }
      currentStartTime = candles[candles.length - 1].time + 1;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  return allCandles.sort((a, b) => a.time - b.time);
};

/**
 * Convert interval string to Binance interval
 */
const getBinanceInterval = (interval: string): string => {
  const mapping: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
  };
  return mapping[interval] || '15m';
};

/**
 * Execute a trade based on zone and strategy rules
 */
const executeTrade = (
  zone: SMCZone,
  currentPrice: number,
  strategy: Strategy,
  balance: number,
  riskPerTrade: number
): { entry: number; stop: number; target: number; lotSize: number } | null => {
  // Check entry rules
  const entryPrice = (zone.priceTop + zone.priceBottom) / 2;
  const zoneRange = zone.priceTop - zone.priceBottom;
  
  // Calculate stop and target based on zone
  let stop: number;
  let target: number;
  
  if (zone.type.includes('Bullish')) {
    stop = zone.priceBottom - zoneRange * 0.1; // 10% below zone
    target = entryPrice + zoneRange * 2; // 2R target
  } else {
    stop = zone.priceTop + zoneRange * 0.1; // 10% above zone
    target = entryPrice - zoneRange * 2; // 2R target
  }

  // Check strategy filters
  const minRR = strategy.entryRules.find(r => r.includes('R:R'))?.match(/(\d+\.?\d*)/)?.[1];
  if (minRR) {
    const risk = Math.abs(entryPrice - stop);
    const reward = Math.abs(target - entryPrice);
    const rr = risk > 0 ? reward / risk : 0;
    if (rr < parseFloat(minRR)) {
      return null; // Doesn't meet minimum R:R
    }
  }

  // Check zone score
  if (zone.score < 60) {
    return null; // Zone score too low
  }

  // Calculate position size
  const riskAmount = balance * (riskPerTrade / 100);
  const riskPerUnit = Math.abs(entryPrice - stop);
  const lotSize = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;

  return { entry: entryPrice, stop, target, lotSize };
};

/**
 * Run backtest with real historical data
 */
export const runBacktest = async (
  config: BacktestConfig,
  strategy: Strategy,
  asset: Asset = 'EURUSD'
): Promise<BacktestResult> => {
  const assetConfig = ASSET_CONFIG[asset];
  if (!assetConfig) {
    throw new Error(`Asset ${asset} not configured`);
  }

  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const startTime = Math.floor(startDate.getTime() / 1000);
  const endTime = Math.floor(endDate.getTime() / 1000);

  // Fetch historical data
  const interval = getBinanceInterval(config.timeframes[0] || '15m');
  const candles = await fetchHistoricalData(
    assetConfig.apiSymbol,
    interval,
    startTime,
    endTime
  );

  if (candles.length < 100) {
    throw new Error('Insufficient historical data for backtesting');
  }

  // Fetch H1 and H4 data for MTF analysis
  const h1Candles = await fetchHistoricalData(
    assetConfig.apiSymbol,
    '1h',
    startTime,
    endTime
  );
  const h4Candles = await fetchHistoricalData(
    assetConfig.apiSymbol,
    '4h',
    startTime,
    endTime
  );

  // Initialize backtest state
  let balance = config.initialBalance;
  const equityCurve: Array<{ date: string; equity: number }> = [
    { date: config.startDate, equity: balance }
  ];
  const trades: Array<{
    entry: number;
    exit: number;
    entryTime: string;
    exitTime: string;
    pnl: number;
    rr: number;
    zoneId: string;
    zoneType: string;
  }> = [];

  const openPositions: Array<{
    entry: number;
    stop: number;
    target: number;
    lotSize: number;
    entryTime: number;
    zoneId: string;
    zoneType: string;
  }> = [];

  // Analyze market in chunks to simulate real-time analysis
  const chunkSize = 200; // Analyze 200 candles at a time
  let peak = balance;
  let maxDrawdown = 0;

  for (let i = chunkSize; i < candles.length; i += 50) {
    const chunkEnd = Math.min(i, candles.length);
    const chunkCandles = candles.slice(0, chunkEnd);
    const chunkH1 = h1Candles.filter(c => c.time <= chunkCandles[chunkCandles.length - 1].time);
    const chunkH4 = h4Candles.filter(c => c.time <= chunkCandles[chunkCandles.length - 1].time);

    // Analyze market to find zones
    const analysis = analyzeMarketHistory(chunkCandles, chunkH1, chunkH4, []);
    const currentPrice = chunkCandles[chunkCandles.length - 1].close;
    const currentTime = chunkCandles[chunkCandles.length - 1].time;

    // Check for new entry signals
    if (openPositions.length < config.maxOpenPositions) {
      for (const zone of analysis.zones) {
        // Only trade fresh zones
        if (zone.status === 'FRESH' || zone.status === 'TESTED') {
          const trade = executeTrade(zone, currentPrice, strategy, balance, config.riskPerTrade);
          if (trade && !openPositions.find(p => p.zoneId === zone.id)) {
            openPositions.push({
              ...trade,
              entryTime: currentTime,
              zoneId: zone.id,
              zoneType: zone.type,
            });
          }
        }
      }
    }

    // Check open positions for exit
    const positionsToClose: number[] = [];
    for (let j = 0; j < openPositions.length; j++) {
      const pos = openPositions[j];
      const currentCandle = chunkCandles[chunkCandles.length - 1];

      // Check stop loss
      if (pos.zoneType.includes('Bullish')) {
        if (currentCandle.low <= pos.stop) {
          // Stop loss hit
          const pnl = (pos.stop - pos.entry) * pos.lotSize;
          balance += pnl;
          const risk = Math.abs(pos.entry - pos.stop);
          const rr = risk > 0 ? Math.abs(pnl) / (risk * pos.lotSize) : 0;
          
          trades.push({
            entry: pos.entry,
            exit: pos.stop,
            entryTime: new Date(pos.entryTime * 1000).toISOString(),
            exitTime: new Date(currentTime * 1000).toISOString(),
            pnl,
            rr: -rr,
            zoneId: pos.zoneId,
            zoneType: pos.zoneType,
          });
          positionsToClose.push(j);
        } else if (currentCandle.high >= pos.target) {
          // Take profit hit
          const pnl = (pos.target - pos.entry) * pos.lotSize;
          balance += pnl;
          const risk = Math.abs(pos.entry - pos.stop);
          const rr = risk > 0 ? Math.abs(pnl) / (risk * pos.lotSize) : 0;
          
          trades.push({
            entry: pos.entry,
            exit: pos.target,
            entryTime: new Date(pos.entryTime * 1000).toISOString(),
            exitTime: new Date(currentTime * 1000).toISOString(),
            pnl,
            rr,
            zoneId: pos.zoneId,
            zoneType: pos.zoneType,
          });
          positionsToClose.push(j);
        }
      } else {
        // Bearish position
        if (currentCandle.high >= pos.stop) {
          // Stop loss hit
          const pnl = (pos.entry - pos.stop) * pos.lotSize;
          balance += pnl;
          const risk = Math.abs(pos.entry - pos.stop);
          const rr = risk > 0 ? Math.abs(pnl) / (risk * pos.lotSize) : 0;
          
          trades.push({
            entry: pos.entry,
            exit: pos.stop,
            entryTime: new Date(pos.entryTime * 1000).toISOString(),
            exitTime: new Date(currentTime * 1000).toISOString(),
            pnl,
            rr: -rr,
            zoneId: pos.zoneId,
            zoneType: pos.zoneType,
          });
          positionsToClose.push(j);
        } else if (currentCandle.low <= pos.target) {
          // Take profit hit
          const pnl = (pos.entry - pos.target) * pos.lotSize;
          balance += pnl;
          const risk = Math.abs(pos.entry - pos.stop);
          const rr = risk > 0 ? Math.abs(pnl) / (risk * pos.lotSize) : 0;
          
          trades.push({
            entry: pos.entry,
            exit: pos.target,
            entryTime: new Date(pos.entryTime * 1000).toISOString(),
            exitTime: new Date(currentTime * 1000).toISOString(),
            pnl,
            rr,
            zoneId: pos.zoneId,
            zoneType: pos.zoneType,
          });
          positionsToClose.push(j);
        }
      }
    }

    // Remove closed positions
    for (let j = positionsToClose.length - 1; j >= 0; j--) {
      openPositions.splice(positionsToClose[j], 1);
    }

    // Update equity curve
    if (i % 50 === 0 || i >= candles.length - 1) {
      equityCurve.push({
        date: new Date(currentTime * 1000).toISOString(),
        equity: balance,
      });

      // Update drawdown
      if (balance > peak) peak = balance;
      const drawdown = ((peak - balance) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }

  // Close any remaining positions at end
  for (const pos of openPositions) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const pnl = pos.zoneType.includes('Bullish')
      ? (exitPrice - pos.entry) * pos.lotSize
      : (pos.entry - exitPrice) * pos.lotSize;
    balance += pnl;
    const risk = Math.abs(pos.entry - pos.stop);
    const rr = risk > 0 ? Math.abs(pnl) / (risk * pos.lotSize) : 0;

    trades.push({
      entry: pos.entry,
      exit: exitPrice,
      entryTime: new Date(pos.entryTime * 1000).toISOString(),
      exitTime: new Date(candles[candles.length - 1].time * 1000).toISOString(),
      pnl,
      rr: pnl > 0 ? rr : -rr,
      zoneId: pos.zoneId,
      zoneType: pos.zoneType,
    });
  }

  // Calculate metrics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const totalTrades = trades.length;
  const winningTradesCount = winningTrades.length;
  const losingTradesCount = losingTrades.length;
  const winRate = totalTrades > 0 ? (winningTradesCount / totalTrades) * 100 : 0;

  const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

  // Calculate Sharpe Ratio
  const returns = trades.map(t => t.pnl / config.initialBalance);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  // Sortino Ratio
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? avgReturn / downsideStdDev : 0;

  const finalBalance = balance;
  const returnPercent = ((finalBalance - config.initialBalance) / config.initialBalance) * 100;

  return {
    totalTrades,
    winningTrades: winningTradesCount,
    losingTrades: losingTradesCount,
    winRate: Math.round(winRate * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalLoss: Math.round(totalLoss * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    finalBalance: Math.round(finalBalance * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    equityCurve,
    trades,
  };
};

/**
 * Walk-Forward Analysis: Test strategy on multiple periods
 */
export const runWalkForwardAnalysis = async (
  config: BacktestConfig,
  strategy: Strategy,
  asset: Asset,
  optimizationPeriods: number = 4
): Promise<{
  periods: Array<{
    period: string;
    result: BacktestResult;
  }>;
  averageMetrics: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    returnPercent: number;
  };
}> => {
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const periodDays = totalDays / optimizationPeriods;

  const periods: Array<{ period: string; result: BacktestResult }> = [];

  for (let i = 0; i < optimizationPeriods; i++) {
    const periodStart = new Date(startDate.getTime() + i * periodDays * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(startDate.getTime() + (i + 1) * periodDays * 24 * 60 * 60 * 1000);

    const periodConfig: BacktestConfig = {
      ...config,
      startDate: periodStart.toISOString().split('T')[0],
      endDate: periodEnd.toISOString().split('T')[0],
    };

    try {
      const result = await runBacktest(periodConfig, strategy, asset);
      periods.push({
        period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
        result,
      });
    } catch (error) {
      console.error(`Error in walk-forward period ${i + 1}:`, error);
    }
  }

  // Calculate average metrics
  const avgWinRate = periods.reduce((sum, p) => sum + p.result.winRate, 0) / periods.length;
  const avgProfitFactor = periods.reduce((sum, p) => sum + p.result.profitFactor, 0) / periods.length;
  const avgMaxDrawdown = periods.reduce((sum, p) => sum + p.result.maxDrawdown, 0) / periods.length;
  const avgReturn = periods.reduce((sum, p) => sum + p.result.returnPercent, 0) / periods.length;

  return {
    periods,
    averageMetrics: {
      winRate: Math.round(avgWinRate * 100) / 100,
      profitFactor: Math.round(avgProfitFactor * 100) / 100,
      maxDrawdown: Math.round(avgMaxDrawdown * 100) / 100,
      returnPercent: Math.round(avgReturn * 100) / 100,
    },
  };
};

/**
 * Monte Carlo Simulation: Randomize trade sequence to test robustness
 */
export const runMonteCarloSimulation = async (
  baseResult: BacktestResult,
  simulations: number = 1000
): Promise<{
  simulations: Array<{
    finalBalance: number;
    maxDrawdown: number;
    winRate: number;
  }>;
  statistics: {
    medianFinalBalance: number;
    worstCaseFinalBalance: number;
    bestCaseFinalBalance: number;
    probabilityOfProfit: number;
    averageMaxDrawdown: number;
  };
}> => {
  const simulationsResults: Array<{
    finalBalance: number;
    maxDrawdown: number;
    winRate: number;
  }> = [];

  for (let i = 0; i < simulations; i++) {
    // Shuffle trades randomly
    const shuffledTrades = [...baseResult.trades].sort(() => Math.random() - 0.5);

    // Recalculate equity curve
    let balance = baseResult.trades[0]?.entry ? 10000 : 10000; // Use initial balance
    let peak = balance;
    let maxDrawdown = 0;
    let winningCount = 0;

    for (const trade of shuffledTrades) {
      balance += trade.pnl;
      if (balance > peak) peak = balance;
      const drawdown = ((peak - balance) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      if (trade.pnl > 0) winningCount++;
    }

    const winRate = shuffledTrades.length > 0 ? (winningCount / shuffledTrades.length) * 100 : 0;

    simulationsResults.push({
      finalBalance: balance,
      maxDrawdown,
      winRate,
    });
  }

  // Calculate statistics
  const finalBalances = simulationsResults.map(s => s.finalBalance).sort((a, b) => a - b);
  const medianFinalBalance = finalBalances[Math.floor(finalBalances.length / 2)];
  const worstCaseFinalBalance = finalBalances[0];
  const bestCaseFinalBalance = finalBalances[finalBalances.length - 1];
  const probabilityOfProfit = (simulationsResults.filter(s => s.finalBalance > 10000).length / simulations) * 100;
  const averageMaxDrawdown = simulationsResults.reduce((sum, s) => sum + s.maxDrawdown, 0) / simulations;

  return {
    simulations: simulationsResults,
    statistics: {
      medianFinalBalance: Math.round(medianFinalBalance * 100) / 100,
      worstCaseFinalBalance: Math.round(worstCaseFinalBalance * 100) / 100,
      bestCaseFinalBalance: Math.round(bestCaseFinalBalance * 100) / 100,
      probabilityOfProfit: Math.round(probabilityOfProfit * 100) / 100,
      averageMaxDrawdown: Math.round(averageMaxDrawdown * 100) / 100,
    },
  };
};

/**
 * Create a strategy from journal entries (learn from past trades)
 */
export const createStrategyFromJournal = (trades: JournalEntry[]): Strategy => {
  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  const winningTrades = closedTrades.filter(t => t.status === 'WIN');
  
  // Analyze winning patterns
  const commonSetups = winningTrades.reduce((acc, trade) => {
    acc[trade.type] = (acc[trade.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bestSetup = Object.entries(commonSetups)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bullish OB';

  const avgRR = winningTrades
    .filter(t => t.riskReward)
    .reduce((sum, t) => sum + (t.riskReward || 0), 0) / winningTrades.length || 2.0;

  return {
    id: `strategy_${Date.now()}`,
    name: `Learned from ${closedTrades.length} trades`,
    description: `Strategy based on ${bestSetup} setup with avg R:R of ${avgRR.toFixed(2)}`,
    entryRules: [
      `Setup type: ${bestSetup}`,
      `Minimum R:R: ${avgRR.toFixed(2)}`,
      'AI confidence > 7',
    ],
    exitRules: [
      'Take profit at target',
      'Stop loss at entry if 1R profit reached',
    ],
    filters: [
      'Session: LONDON or NEWYORK',
      'Market structure: BOS or ChoCh',
    ],
  };
};
