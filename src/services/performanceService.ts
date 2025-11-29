import { JournalEntry, PerformanceMetrics, SetupPerformance } from '../types';

/**
 * Calculate comprehensive performance metrics from trade journal
 */
export const calculatePerformanceMetrics = (trades: JournalEntry[]): PerformanceMetrics => {
  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  
  if (closedTrades.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      averageRR: 0,
      expectancy: 0,
      consistencyScore: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      recoveryFactor: 0,
      winLossRatio: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
    };
  }

  const winningTrades = closedTrades.filter(t => t.status === 'WIN');
  const losingTrades = closedTrades.filter(t => t.status === 'LOSS');
  
  const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  
  const winRate = (winningTrades.length / closedTrades.length) * 100;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
  
  // Calculate average R:R
  const rrs = closedTrades
    .filter(t => t.riskReward)
    .map(t => t.riskReward || 0);
  const averageRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  
  // Calculate expectancy
  const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
  const winProb = winRate / 100;
  const lossProb = 1 - winProb;
  const expectancy = (avgWin * winProb) - (avgLoss * lossProb);
  
  // Calculate Sharpe Ratio (simplified - using returns)
  const returns = closedTrades.map(t => (t.pnl || 0) / 10000); // Assuming $10k account
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Calculate max drawdown
  let equity = 10000; // Starting equity
  let peak = equity;
  let maxDrawdown = 0;
  
  closedTrades
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(trade => {
      equity += trade.pnl || 0;
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
  
  // Consistency Score (0-100): Based on win rate stability
  const monthlyGroups = closedTrades.reduce((acc, trade) => {
    const month = new Date(trade.date).toISOString().slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(trade);
    return acc;
  }, {} as Record<string, JournalEntry[]>);
  
  const monthlyWinRates = Object.values(monthlyGroups).map(monthTrades => {
    const wins = monthTrades.filter(t => t.status === 'WIN').length;
    return (wins / monthTrades.length) * 100;
  });
  
  const avgMonthlyWR = monthlyWinRates.reduce((a, b) => a + b, 0) / monthlyWinRates.length;
  const wrVariance = monthlyWinRates.reduce((sum, wr) => sum + Math.pow(wr - avgMonthlyWR, 2), 0) / monthlyWinRates.length;
  const consistencyScore = Math.max(0, 100 - Math.sqrt(wrVariance) * 2);
  
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => t.pnl || 0))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(t => t.pnl || 0))
    : 0;

  // Enhanced Metrics
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;
  
  // Sortino Ratio (only downside volatility)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0 
    ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length 
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? avgReturn / downsideStdDev : 0;
  
  // Calmar Ratio (annual return / max drawdown)
  const daysTrading = closedTrades.length > 0 
    ? (new Date(closedTrades[closedTrades.length - 1].date).getTime() - new Date(closedTrades[0].date).getTime()) / (1000 * 60 * 60 * 24)
    : 1;
  const annualReturn = daysTrading > 0 ? ((equity - 10000) / 10000) * (365 / daysTrading) : 0;
  const calmarRatio = maxDrawdown > 0 ? annualReturn / (maxDrawdown / 100) : 0;
  
  // Recovery Factor
  const recoveryFactor = maxDrawdown > 0 ? totalProfit / (10000 * maxDrawdown / 100) : 0;
  
  // Consecutive Wins/Losses
  let currentStreak = 0;
  let maxWins = 0;
  let maxLosses = 0;
  let currentType: 'WIN' | 'LOSS' | null = null;
  
  closedTrades
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(trade => {
      const tradeType = trade.status === 'WIN' ? 'WIN' : 'LOSS';
      if (tradeType === currentType) {
        currentStreak++;
      } else {
        if (currentType === 'WIN' && currentStreak > maxWins) maxWins = currentStreak;
        if (currentType === 'LOSS' && currentStreak > maxLosses) maxLosses = currentStreak;
        currentStreak = 1;
        currentType = tradeType;
      }
    });
  
  // Final streak check
  if (currentType === 'WIN' && currentStreak > maxWins) maxWins = currentStreak;
  if (currentType === 'LOSS' && currentStreak > maxLosses) maxLosses = currentStreak;
  
  // Current consecutive
  const lastTrade = closedTrades[closedTrades.length - 1];
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  if (lastTrade) {
    const lastType = lastTrade.status === 'WIN' ? 'WIN' : 'LOSS';
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      if (closedTrades[i].status === lastType) {
        if (lastType === 'WIN') consecutiveWins++;
        else consecutiveLosses++;
      } else break;
    }
  }

  return {
    winRate: Math.round(winRate * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    averageRR: Math.round(averageRR * 100) / 100,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalProfit,
    totalLoss,
    largestWin,
    largestLoss,
    // Enhanced
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    calmarRatio: Math.round(calmarRatio * 100) / 100,
    recoveryFactor: Math.round(recoveryFactor * 100) / 100,
    averageWin: Math.round(avgWin * 100) / 100,
    averageLoss: Math.round(avgLoss * 100) / 100,
    winLossRatio: Math.round(winLossRatio * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    consecutiveWins,
    consecutiveLosses,
    maxConsecutiveWins: maxWins,
    maxConsecutiveLosses: maxLosses,
  };
};

/**
 * Calculate setup-specific performance
 */
export const calculateSetupPerformance = (trades: JournalEntry[]): SetupPerformance[] => {
  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  const setupGroups = closedTrades.reduce((acc, trade) => {
    if (!acc[trade.type]) acc[trade.type] = [];
    acc[trade.type].push(trade);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  return Object.entries(setupGroups).map(([setupType, setupTrades]) => {
    const wins = setupTrades.filter(t => t.status === 'WIN');
    const losses = setupTrades.filter(t => t.status === 'LOSS');
    const winRate = (wins.length / setupTrades.length) * 100;
    
    const totalProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    
    const rrs = setupTrades
      .filter(t => t.riskReward)
      .map(t => t.riskReward || 0);
    const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
    
    return {
      setupType,
      totalTrades: setupTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      averageRR: Math.round(avgRR * 100) / 100,
      totalProfit,
      successRate: winRate,
      avgRR: Math.round(avgRR * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
    };
  }).sort((a, b) => b.successRate - a.successRate);
};

/**
 * Calculate equity curve data points
 */
export const calculateEquityCurve = (trades: JournalEntry[]): Array<{date: string, equity: number}> => {
  let equity = 10000; // Starting equity
  const curve: Array<{date: string, equity: number}> = [{ date: new Date().toISOString(), equity }];
  
  trades
    .filter(t => t.status !== 'OPEN')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(trade => {
      equity += trade.pnl || 0;
      curve.push({
        date: trade.date,
        equity: Math.max(0, equity), // Prevent negative equity
      });
    });
  
  return curve;
};

