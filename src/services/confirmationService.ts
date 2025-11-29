import { SMCZone, MarketBias, LiquidityLevel, ConfirmationSignals, TradePattern } from '../types';
// Helper to get session context
const getSessionContext = () => {
  const hour = new Date().getUTCHours();
  if (hour >= 6 && hour < 10) return "LONDON OPEN";
  if (hour >= 10 && hour < 13) return "LUNCH TIME";
  if (hour >= 13 && hour < 17) return "NEW YORK OPEN";
  if (hour >= 21 || hour < 6) return "ASIA SESSION";
  return "SESSION CLOSE";
};

/**
 * Calculate confirmation signals for a zone
 */
export const calculateConfirmation = (
  zone: SMCZone,
  aiConfidence: number,
  similarPatterns: TradePattern[],
  marketBias: MarketBias | null,
  liquidityLevels: LiquidityLevel[],
  currentPrice: number
): ConfirmationSignals => {
  // AI Confidence (1-10 -> 0-100)
  const aiScore = (aiConfidence / 10) * 100;
  
  // Pattern Match (0-100)
  const patternScore = similarPatterns.length > 0
    ? similarPatterns[0].similarity
    : 0;
  
  // Risk Level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (zone.score >= 80) riskLevel = 'LOW';
  else if (zone.score < 50) riskLevel = 'HIGH';
  
  // MTF Alignment
  const mtfAlignment = marketBias 
    ? (marketBias.mtf.m15 === marketBias.trend && 
       marketBias.mtf.h1 === marketBias.trend)
    : false;
  
  // Liquidity Proximity (negative if too close)
  const nearbyLiq = liquidityLevels.find(l => 
    Math.abs(currentPrice - l.price) < (currentPrice * 0.002)
  );
  const liquiditySweep = !nearbyLiq; // Good if not too close
  
  // Session Match
  const session = getSessionContext();
  const sessionMatch = session.includes('LONDON') || session.includes('NEW YORK');
  
  // Calculate overall score
  let overallScore = 0;
  overallScore += aiScore * 0.3; // 30% weight
  overallScore += patternScore * 0.25; // 25% weight
  overallScore += (riskLevel === 'LOW' ? 100 : riskLevel === 'MEDIUM' ? 60 : 30) * 0.2; // 20% weight
  overallScore += (mtfAlignment ? 100 : 50) * 0.15; // 15% weight
  overallScore += (liquiditySweep ? 100 : 50) * 0.05; // 5% weight
  overallScore += (sessionMatch ? 100 : 50) * 0.05; // 5% weight
  
  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    aiConfidence,
    patternMatch: patternScore,
    riskLevel,
    mtfAlignment,
    structureBreak: false, // TODO: Calculate from marketBias
    liquiditySweep,
    premiumDiscount: false, // TODO: Calculate from marketBias
    smtDivergence: false, // TODO: Calculate from marketBias
    sessionMatch,
    overallScore: Math.round(overallScore),
  };
};

/**
 * Get confirmation badge color
 */
export const getConfirmationColor = (score: number) => {
  if (score >= 80) return 'bg-green-500/20 text-green-400 border-green-500/50';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  return 'bg-red-500/20 text-red-400 border-red-500/50';
};

/**
 * Get confirmation label
 */
export const getConfirmationLabel = (score: number) => {
  if (score >= 80) return '✅ YÜKSEK ONAY';
  if (score >= 60) return '⚠️ ORTA ONAY';
  return '❌ DÜŞÜK ONAY';
};

