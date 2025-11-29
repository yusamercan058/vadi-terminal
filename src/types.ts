export type Asset = 'EURUSD' | 'GBPUSD' | 'XAUUSD' | 'BTCUSD' | 'US100';
export type ZoneStatus = 'FRESH' | 'TESTED' | 'BROKEN' | 'MISSED';
export type SessionType = 'ASIA' | 'LONDON' | 'NEWYORK' | 'CLOSE';
export type PageView = 'dashboard' | 'journal' | 'props' | 'resources' | 'news';

export interface SMCZone {
  id: string;
  type: string;
  priceTop: number;
  priceBottom: number;
  time: string;
  timestamp: number;
  status: ZoneStatus;
  score: number;
  confluence: string[];
  age?: number;
  testCount?: number;
  lastTestTime?: number;
  retestTime?: string;
  historicalSuccessRate?: number;
  successRate?: number;
}

export interface LiquidityLevel {
    price: number;
    label: string;
    color: string;
  lineStyle: number;
}

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle';
  text: string;
  size: number;
}

export interface Notification {
  id: string | number;
  time: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

export interface NewsEvent {
    id: string;
    time: string;
    currency: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
  forecast: string;
  previous: string;
}

export interface FXNews {
  id: string;
  time: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  previous: string;
  actual?: string;
  forecast: string;
  color: string;
}

export interface VideoResource {
    id: string;
    title: string;
    youtubeId: string;
    description?: string;
    category: 'Tutorial' | 'Analysis' | 'Strategy' | 'News' | 'Interview' | 'Market Analysis' | 'Trade Reviews' | 'Psychology' | 'Risk Management' | 'Technical Analysis' | 'Fundamental Analysis' | 'Trading Tools';
    duration?: string;
    addedDate?: string;
    rating?: number; // 1-5 stars
    tags?: string[];
    folder?: string;
    isFavorite?: boolean;
    notes?: string;
    highlights?: Array<{ timestamp: string; note: string }>;
    viewCount?: number;
    lastViewed?: string;
}

export interface ArticleResource {
    id: string;
    title: string;
    content?: string;
    url?: string;
    pdfUrl?: string;
    description?: string;
    category: VideoResource['category'];
    addedDate?: string;
    rating?: number;
    tags?: string[];
    folder?: string;
    isFavorite?: boolean;
    notes?: string;
    readProgress?: number; // 0-100
    views?: number; // View count
    lastViewed?: string; // Last viewed date
}

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    videoIds: string[];
    articleIds?: string[];
    createdDate: string;
    isPublic?: boolean;
    order?: number; // For custom ordering
    youtubePlaylistId?: string; // YouTube playlist ID if imported from YouTube
    youtubePlaylistUrl?: string; // Original YouTube playlist URL
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
  trendStrength?: number; // 0-100, ADX-like strength
  ema20?: number;
  ema50?: number;
  ema200?: number;
  smtDivergence: 'Bullish SMT' | 'Bearish SMT' | 'None';
  dailyBias: 'Accumulation' | 'Manipulation' | 'Distribution';
  dxyCorrelation: 'Positive' | 'Negative' | 'Neutral';
  isNewsLocked?: boolean;
  asiaRange?: { high: number, low: number };
  midnightOpen?: number;
  equilibrium?: number; // YENİ: Denge fiyatı
  // Market Structure Enhancements
  structureBreak?: {
    type: 'BOS' | 'ChoCh';
    price: number;
    time: number;
    timeframe: string;
  };
  htfStructure?: {
    h4: { trend: 'Bullish' | 'Bearish' | 'Range'; structure: 'BOS' | 'ChoCh' | 'Consolidation' };
    daily: { trend: 'Bullish' | 'Bearish' | 'Range'; structure: 'BOS' | 'ChoCh' | 'Consolidation' };
  };
  liquiditySweep?: {
    level: number;
    direction: 'UP' | 'DOWN';
    time: number;
  };
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
  exitPrice?: number;
  // Enhanced fields
  tags?: string[]; // Emotional, market condition, setup quality tags
  session?: 'ASIA' | 'LONDON' | 'NEWYORK' | 'CLOSE';
  riskReward?: number; // R:R ratio
  confidence?: number; // AI confidence score (0-10)
  images?: string[]; // Multiple screenshots
  voiceNote?: string; // Base64 encoded audio
  lessonsLearned?: string;
  marketCondition?: 'Trending' | 'Ranging' | 'Volatile' | 'Consolidation';
  emotionalState?: 'FOMO' | 'Revenge' | 'Confident' | 'Fear' | 'Calm' | 'Greedy';
  setupQuality?: 'High' | 'Medium' | 'Low';
  exitTime?: string;
  holdingTime?: number;
  tradeTemplate?: string; // Template used for this trade
  // Trade plan tracking
  tradePlan?: {
    entry: number;
    stop: number;
    target: number;
    riskReward: number;
    confidence: number;
    reasoning: string;
  };
  actualExecution?: {
    entry: number;
    stop: number;
    target: number;
    exit: number;
    riskReward: number;
    deviations: string[];
  };
}

export interface PropFirm {
  name: string;
  logo: string;
  discount: string;
  code: string;
  maxAlloc: string;
  type: string;
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
  timestamp: number;
  trailingStopEnabled?: boolean;
  trailingStopDistance?: number;
  breakEvenEnabled?: boolean;
  breakEvenTriggered?: boolean;
  timeBasedExit?: number;
  openTime?: number;
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface AIResponse {
  id: string;
  text: string;
  confidence: number;
}

export interface PerformanceMetrics {
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageRR: number;
  expectancy: number;
  consistencyScore: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  largestWin: number;
  largestLoss: number;
  sortinoRatio: number; // NEW
  averageWin?: number;
  averageLoss?: number;
  consecutiveWins?: number;
  consecutiveLosses?: number;
  calmarRatio: number; // NEW
  recoveryFactor: number; // NEW
  winLossRatio: number; // NEW
  maxConsecutiveWins: number; // NEW
  maxConsecutiveLosses: number; // NEW
}

export interface SetupPerformance {
  setupType: string;
  totalTrades: number;
  winRate: number;
  averageRR: number;
  totalProfit: number;
  successRate: number;
  avgRR?: number;
  profitFactor?: number;
}

export interface ConfirmationSignals {
  mtfAlignment: boolean;
  structureBreak: boolean;
  liquiditySweep: boolean;
  premiumDiscount: boolean;
  smtDivergence: boolean;
  overallScore: number;
  aiConfidence?: number;
  patternMatch?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  sessionMatch?: boolean;
}

export interface StructuredAIResponse {
  plan: string;
  entry: number;
  stop: number;
  target: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
  risks: string[];
  alternatives: string[];
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation?: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TraderProfile {
  tradingStyle: string;
  preferredSetups: string[];
  riskTolerance: 'Low' | 'Medium' | 'High';
  averageHoldTime: string;
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  preferredStyle?: string;
  winRate?: number;
  avgRR?: number;
  totalTrades?: number;
  favoriteAssets?: string[];
  favoriteSetups?: string[];
}

export interface BacktestConfig {
  strategy: Strategy;
  startDate: string;
  endDate: string;
  initialBalance: number;
  riskPerTrade: number;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  equityCurve: Array<{ date: string; equity: number }>;
  monthlyReturns: Array<{ month: string; return: number }>;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  entryRules: string[];
  exitRules: string[];
  filters: string[];
}

export interface NewsImpact {
  newsId: string;
  newsTime: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  priceBefore: number;
  priceAfter: number;
  priceChange: number;
  priceChangePercent: number;
  volatilityBefore: number;
  volatilityAfter: number;
}

export interface SessionPerformance {
  session: SessionType;
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  averageRR: number;
  bestHour?: number;
  worstHour?: number;
}

export interface TradePlanComparison {
  planned: {
    entry: number;
    stop: number;
    target: number;
    riskReward: number;
  };
  actual: {
    entry: number;
    stop: number;
    target: number;
    exit: number;
    riskReward: number;
  };
  deviations: string[];
  score: number; // 0-100, how well the plan was followed
}

export interface StructureBreak {
  type: 'BOS' | 'ChoCh';
  price: number;
  time: number;
  timeframe: string;
  direction: 'Bullish' | 'Bearish';
  strength: number; // 0-100
}

export interface VolumeProfileData {
  price: number;
  volume: number;
  poc?: boolean; // Point of Control
  valueArea?: boolean;
}

export interface AISetupAnalysis {
  score: number; // 1-10
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: number; // 0-100
}

export interface ZoneFeedback {
  zoneId: string;
  timestamp: number;
  accuracy: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
  userNote?: string;
  actualOutcome?: 'WIN' | 'LOSS' | 'PARTIAL';
  actualEntry?: number;
  actualExit?: number;
  actualRR?: number;
}

export interface UserAccuracyMetrics {
  totalFeedbacks: number;
  correctPredictions: number;
  incorrectPredictions: number;
  partialPredictions: number;
  overallAccuracy: number; // 0-100
  accuracyByZoneType: Record<string, number>;
  accuracyByScore: Record<string, number>; // e.g., "60-70", "70-80", etc.
  recentAccuracy: number; // Last 30 days
  improvementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface AILearningData {
  zoneId: string;
  zoneType: string;
  zoneScore: number;
  marketConditions: {
    trend: string;
    structure: string;
    premiumDiscount: string;
    smtDivergence: string;
  };
  aiConfidence: number;
  userFeedback: ZoneFeedback;
  timestamp: number;
}

export interface TradePattern {
  id: string;
  name?: string;
  description?: string;
  setupType?: string;
  setup?: string;
  entryConditions?: string[];
  exitConditions?: string[];
  successRate?: number;
  avgRR?: number;
  frequency?: number;
  similarity: number;
  marketCondition?: string;
  session?: string;
  outcome?: 'WIN' | 'LOSS';
  rr?: number;
  entryTime?: Date;
  exitTime?: Date;
  screenshot?: string;
  asset?: string;
}

export interface SMTData {
  strength: number;
  divergence: 'Bullish SMT' | 'Bearish SMT' | 'None';
  correlation: number;
  correlationTrend?: 'increasing' | 'decreasing' | 'stable';
  assetPrice?: number;
  pairPrice?: number;
  assetTrend?: 'Bullish' | 'Bearish' | 'Neutral';
  pairTrend?: 'Bullish' | 'Bearish' | 'Neutral';
  divergenceBars?: number;
  signalHistory?: Array<{
    timestamp: number;
    strength: number;
    divergence: 'Bullish SMT' | 'Bearish SMT' | 'None';
    outcome?: 'success' | 'failure';
  }>;
}
