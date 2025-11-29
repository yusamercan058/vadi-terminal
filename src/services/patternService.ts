import { JournalEntry, TradePattern, SMCZone } from '../types';

/**
 * Find similar patterns from trade history
 */
export const findSimilarPatterns = (
  currentZone: SMCZone,
  trades: JournalEntry[],
  limit: number = 5
): TradePattern[] => {
  const closedTrades = trades.filter(t => t.status !== 'OPEN' && t.status !== 'LOSS');
  
  // Calculate similarity score for each trade
  const patterns: TradePattern[] = closedTrades
    .map(trade => {
      let similarity = 0;
      
      // Setup type match
      if (trade.type === currentZone.type) similarity += 30;
      else if (trade.type.includes('OB') && currentZone.type.includes('OB')) similarity += 15;
      else if (trade.type.includes('FVG') && currentZone.type.includes('FVG')) similarity += 15;
      
      // Asset match
      // We'll compare asset later if needed
      
      // Score similarity (normalized)
      const tradeScore = 50; // Default if not available
      const scoreDiff = Math.abs(currentZone.score - tradeScore);
      similarity += Math.max(0, 20 - (scoreDiff / 5));
      
      // Outcome bonus
      if (trade.status === 'WIN') similarity += 20;
      if (trade.riskReward && trade.riskReward >= 2) similarity += 10;
      
      return {
        id: trade.id,
        setup: trade.type,
        marketCondition: 'Unknown', // Could be enhanced
        session: extractSession(trade.date),
        outcome: trade.status === 'WIN' ? 'WIN' : 'LOSS',
        rr: trade.riskReward || 0,
        entryTime: new Date(trade.date),
        exitTime: trade.exitTime ? new Date(trade.exitTime) : new Date(trade.date),
        screenshot: trade.image,
        asset: trade.asset,
        similarity,
      } as TradePattern;
    })
    .filter(p => p.similarity > 20) // Minimum similarity threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return patterns;
};

/**
 * Extract session from date string
 */
const extractSession = (dateStr: string): string => {
  const date = new Date(dateStr);
  const hour = date.getUTCHours();
  
  if (hour >= 0 && hour < 7) return 'ASIA';
  if (hour >= 7 && hour < 12) return 'LONDON';
  if (hour >= 12 && hour < 21) return 'NEW YORK';
  return 'CLOSE';
};

/**
 * Calculate pattern success rate
 */
export const calculatePatternSuccessRate = (
  setupType: string,
  trades: JournalEntry[]
): { winRate: number; totalTrades: number; avgRR: number } => {
  const relevantTrades = trades.filter(t => 
    t.type === setupType && t.status !== 'OPEN'
  );
  
  if (relevantTrades.length === 0) {
    return { winRate: 0, totalTrades: 0, avgRR: 0 };
  }
  
  const wins = relevantTrades.filter(t => t.status === 'WIN').length;
  const winRate = (wins / relevantTrades.length) * 100;
  
  const rrs = relevantTrades
    .filter(t => t.riskReward)
    .map(t => t.riskReward || 0);
  const avgRR = rrs.length > 0 
    ? rrs.reduce((a, b) => a + b, 0) / rrs.length 
    : 0;
  
  return {
    winRate: Math.round(winRate * 100) / 100,
    totalTrades: relevantTrades.length,
    avgRR: Math.round(avgRR * 100) / 100,
  };
};

/**
 * Get pattern recommendations based on history
 */
export const getPatternRecommendations = (
  currentZone: SMCZone,
  trades: JournalEntry[]
): {
  recommendation: 'STRONG' | 'MODERATE' | 'WEAK';
  reason: string;
  similarPatterns: TradePattern[];
} => {
  const similarPatterns = findSimilarPatterns(currentZone, trades, 3);
  const patternStats = calculatePatternSuccessRate(currentZone.type, trades);
  
  let recommendation: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
  let reason = '';
  
  if (similarPatterns.length === 0) {
    recommendation = 'WEAK';
    reason = 'Geçmişte benzer pattern bulunamadı';
  } else {
    const avgSimilarity = similarPatterns.reduce((sum, p) => sum + p.similarity, 0) / similarPatterns.length;
    const winRate = (similarPatterns.filter(p => p.outcome === 'WIN').length / similarPatterns.length) * 100;
    
    if (avgSimilarity >= 60 && winRate >= 60 && patternStats.winRate >= 60) {
      recommendation = 'STRONG';
      reason = `Benzer pattern'lerde %${winRate.toFixed(0)} başarı oranı. Geçmişte ${patternStats.totalTrades} işlemde %${patternStats.winRate.toFixed(0)} win rate.`;
    } else if (avgSimilarity >= 40 && winRate >= 50) {
      recommendation = 'MODERATE';
      reason = `Benzer pattern'lerde %${winRate.toFixed(0)} başarı oranı. Dikkatli yaklaş.`;
    } else {
      recommendation = 'WEAK';
      reason = `Benzer pattern'lerde düşük başarı oranı (%${winRate.toFixed(0)}). Risk yüksek.`;
    }
  }
  
  return {
    recommendation,
    reason,
    similarPatterns,
  };
};

