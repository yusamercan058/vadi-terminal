export type Asset = 'EURUSD' | 'GBPUSD' | 'XAUUSD' | 'BTCUSD' | 'ETHUSD';
export type ZoneStatus = 'FRESH' | 'TESTED' | 'BROKEN' | 'MISSED';
export type SessionType = 'ASIA' | 'LONDON' | 'NEWYORK' | 'CLOSE';
export type PageView = 'dashboard' | 'journal' | 'props';

export interface SMCZone {
  id: string;
  type: 'Bullish OB' | 'Bearish OB' | 'Bullish FVG' | 'Bearish FVG' | 'Unicorn Setup';
  priceTop: number;
  priceBottom: number;
  time: string; // Time string for display
  timestamp: number; // Unix timestamp for chart plotting
  status: ZoneStatus;
  retestTime?: string;
  score: number;
  confluence: string[];
}

export interface LiquidityLevel {
    price: number;
    label: string;
    color: string;
    lineStyle: number; // 0 solid, 1 dotted, 2 dashed
}

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
  size?: number; // 1 or 2
}

export interface Notification {
  id: number;
  time: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

export interface MarketBias {
  trend: 'Bullish' | 'Bearish' | 'Range';
  structure: 'BOS' | 'ChoCh' | 'Consolidation';
  premiumDiscount: 'Premium' | 'Discount' | 'Equilibrium';
  nextTarget: number;
  mtf: { m15: string; h1: string; h4: string };
  winRate: number;
  totalTrades: number;
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  atrValue: number;
  smtDivergence: 'Bullish SMT' | 'Bearish SMT' | 'None';
  dailyBias: 'Accumulation' | 'Manipulation' | 'Distribution';
  dxyCorrelation: 'Positive' | 'Negative' | 'Neutral';
  isNewsLocked?: boolean;
  asiaRange?: { high: number, low: number };
  midnightOpen?: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  trader: string;
  asset: string;
  type: string;
  entry: string;
  stop: string;
  target: string;
  note: string;
  status: 'OPEN' | 'WIN' | 'LOSS';
  pnl?: number;
  image?: string;
}

export interface PropFirm {
  name: string;
  logo: string;
  discount: string;
  code: string;
  maxAlloc: string;
  type: '1-Step' | '2-Step' | '3-Step' | 'Instant';
  endsIn: string;
  link: string;
}

export interface OpenPosition {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  lotSize: number;
  stopLoss: number;
  takeProfit: number;
  openTime: string;
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}