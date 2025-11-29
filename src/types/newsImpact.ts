// News Impact Tracking Types
export interface NewsEvent {
  id: string;
  time: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  previous?: string;
  actual?: string;
  forecast?: string;
}

export interface NewsImpact {
  newsId: string;
  symbol: string;
  priceBefore: number;
  priceAfter: number;
  priceChange: number;
  priceChangePercent: number;
  volatilityBefore: number; // ATR
  volatilityAfter: number;
  movementDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  maxMove: number;
  timeToMaxMove: number; // minutes
  impactScore: number; // 0-100
}

