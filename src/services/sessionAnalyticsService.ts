import { JournalEntry, SessionType } from '../types';
import { SessionPerformance, HourlyPerformance } from '../types/sessionAnalytics';

/**
 * Get session from date
 */
const getSession = (date: string): SessionType => {
  const hour = new Date(date).getUTCHours();
  if (hour >= 0 && hour < 7) return 'ASIA';
  if (hour >= 7 && hour < 12) return 'LONDON';
  if (hour >= 12 && hour < 21) return 'NEWYORK';
  return 'CLOSE';
};

/**
 * Calculate session-based performance
 */
export const calculateSessionPerformance = (trades: JournalEntry[]): SessionPerformance[] => {
  const sessionMap = new Map<SessionType, JournalEntry[]>();
  
  trades.forEach(trade => {
    const session = trade.session || getSession(trade.date);
    if (!sessionMap.has(session)) {
      sessionMap.set(session, []);
    }
    sessionMap.get(session)!.push(trade);
  });

  return Array.from(sessionMap.entries()).map(([session, sessionTrades]) => {
    const closedTrades = sessionTrades.filter(t => t.status !== 'OPEN');
    const winningTrades = closedTrades.filter(t => t.status === 'WIN');
    const losingTrades = closedTrades.filter(t => t.status === 'LOSS');
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    
    const rrs = closedTrades
      .filter(t => t.riskReward)
      .map(t => t.riskReward || 0);
    const averageRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
    
    // Best/Worst Hour
    const hourlyStats = new Map<number, { wins: number; total: number; pnl: number }>();
    closedTrades.forEach(trade => {
      const hour = new Date(trade.date).getUTCHours();
      const existing = hourlyStats.get(hour) || { wins: 0, total: 0, pnl: 0 };
      existing.total++;
      if (trade.status === 'WIN') existing.wins++;
      existing.pnl += trade.pnl || 0;
      hourlyStats.set(hour, existing);
    });
    
    let bestHour = 0;
    let worstHour = 0;
    let bestWR = 0;
    let worstWR = 100;
    
    hourlyStats.forEach((stats, hour) => {
      const wr = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
      if (wr > bestWR) { bestWR = wr; bestHour = hour; }
      if (wr < worstWR) { worstWR = wr; worstHour = hour; }
    });
    
    // Average holding time
    const holdingTimes = closedTrades
      .filter(t => t.holdingTime)
      .map(t => t.holdingTime || 0);
    const avgHoldingTime = holdingTimes.length > 0 
      ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length 
      : 0;

    return {
      session,
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalLoss: Math.round(totalLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      averageRR: Math.round(averageRR * 100) / 100,
      bestHour,
      worstHour,
      avgHoldingTime: Math.round(avgHoldingTime),
    };
  }).sort((a, b) => b.winRate - a.winRate);
};

/**
 * Calculate hourly performance
 */
export const calculateHourlyPerformance = (trades: JournalEntry[]): HourlyPerformance[] => {
  const hourlyMap = new Map<number, JournalEntry[]>();
  
  trades.forEach(trade => {
    const hour = new Date(trade.date).getUTCHours();
    if (!hourlyMap.has(hour)) {
      hourlyMap.set(hour, []);
    }
    hourlyMap.get(hour)!.push(trade);
  });

  return Array.from(hourlyMap.entries())
    .map(([hour, hourTrades]) => {
      const closedTrades = hourTrades.filter(t => t.status !== 'OPEN');
      const winningTrades = closedTrades.filter(t => t.status === 'WIN');
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
      
      const rrs = closedTrades
        .filter(t => t.riskReward)
        .map(t => t.riskReward || 0);
      const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
      
      const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

      return {
        hour,
        totalTrades: closedTrades.length,
        winRate: Math.round(winRate * 100) / 100,
        avgRR: Math.round(avgRR * 100) / 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
      };
    })
    .sort((a, b) => a.hour - b.hour);
};

