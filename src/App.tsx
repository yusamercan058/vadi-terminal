import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Activity, Layers, Globe, ArrowUpRight, ArrowDownRight, 
  BarChart3, LayoutDashboard, Briefcase, 
  Ticket, EyeOff, MousePointerClick, Scale, Eye, Bot, Save, Copy, Sparkles, Loader2, Monitor, ScanEye, ToggleLeft, ToggleRight, Clock, Trophy, Percent, TrendingUp, CheckCircle2, Video, Newspaper, TrendingDown, MessageCircle, Camera, Image as ImageIcon, X, Target
} from 'lucide-react';

import { ASSET_CONFIG, MAX_DAILY_LOSS_PERCENT } from './constants';
import { Asset, PageView, SMCZone, MarketBias, Notification, OpenPosition, JournalEntry, Candle, ChartMarker, LiquidityLevel, AIResponse } from './types';
import { analyzeMarketHistory } from './services/marketService';
import { generateTradePlan } from './services/geminiService';
import { getMarketTicker, updateMarketTicker, MarketTickerItem } from './services/marketTickerService';
import { checkSetupAlerts, checkRiskAlerts, checkEntryExitAlerts } from './services/alertService';
import { streamAIResponse, getStructuredAnalysis, generateWithContext, buildTraderProfile, analyzeChartImage } from './services/advancedGeminiService';
import { calculateConfirmation } from './services/confirmationService';
import { findSimilarPatterns } from './services/patternService';

import SmartChart from './components/SmartChart';
import TradingViewWidget from './components/TradingViewWidget';
import AiChartHud from './components/AiChartHud';
import ExecutionPanel from './components/ExecutionPanel';
import OrderBook from './components/OrderBook';
import PO3Visualizer from './components/PO3Visualizer';
import RiskCalculator from './components/RiskCalculator';
import RiskHeatMap from './components/RiskHeatMap';
import ZoneInspector from './components/ZoneInspector';
import PatternRecognition from './components/PatternRecognition';
import AlertSystem from './components/AlertSystem';
import ConfirmationBadge from './components/ConfirmationBadge';
import AIConversation from './components/AIConversation';
import PerformanceDashboard from './components/PerformanceDashboard';
import JournalPage from './components/JournalPage';
import PropFirmPage from './components/PropFirmPage';
import ResourcesPage from './components/ResourcesPage';
import NewsPage from './components/NewsPage';
import SessionAnalytics from './components/SessionAnalytics';
import TradePlanTracker from './components/TradePlanTracker';
import StructureBreakAlerts from './components/StructureBreakAlerts';
import TradeReplay from './components/TradeReplay';
import VolumeProfile from './components/VolumeProfile';
import NewsImpactTracker from './components/NewsImpactTracker';
import BacktestingPanel from './components/BacktestingPanel';
import AITradeReview from './components/AITradeReview';
import AISetupScorer from './components/AISetupScorer';
import { calculateSMT } from './services/smtService';
import SMTPanel from './components/SMTPanel';
import AccuracyMetricsDashboard from './components/AccuracyMetricsDashboard';
import { logger } from './utils/logger';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [activeAsset, setActiveAsset] = useState<Asset>('EURUSD');
  const [viewMode, setViewMode] = useState<'smart' | 'classic'>('smart');
  const [tvInterval, setTvInterval] = useState("15"); 
  const [smartInterval, setSmartInterval] = useState<'5m' | '15m' | '1h' | '2h' | '4h' | '1d'>('15m'); 
  
  // Chart Data State
  const [candles, setCandles] = useState<Candle[]>([]);
  const [zones, setZones] = useState<SMCZone[]>([]);
  const [markers, setMarkers] = useState<ChartMarker[]>([]);
  const [liquidityLevels, setLiquidityLevels] = useState<LiquidityLevel[]>([]);
  
  const [marketBias, setMarketBias] = useState<MarketBias | null>(null);
  const [previousMarketBias, setPreviousMarketBias] = useState<MarketBias | null>(null);
  const [smtData, setSmtData] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alertNotifications, setAlertNotifications] = useState<Notification[]>([]);
  const [selectedTradeForReplay, setSelectedTradeForReplay] = useState<JournalEntry | null>(null);
  const [showBacktesting, setShowBacktesting] = useState(false);
  const [showAccuracyMetrics, setShowAccuracyMetrics] = useState(false);
  const [selectedTradeForReview, setSelectedTradeForReview] = useState<JournalEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'feed' | 'dom' | 'cot'>('active');
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'status' | 'journal'>('status');
  const [highProbFilter, setHighProbFilter] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [executionEnabled, setExecutionEnabled] = useState(true);
  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  
  const [savedTrades, setSavedTrades] = useState<JournalEntry[]>(() => {
      const saved = localStorage.getItem('smc_journal');
      return saved ? JSON.parse(saved) : [];
  });

  const [currentPrice, setCurrentPrice] = useState(0);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [focusedZone, setFocusedZone] = useState<SMCZone | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [structuredResponse, setStructuredResponse] = useState<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);
  
  const [simPositions, setSimPositions] = useState<OpenPosition[]>([]);
  const [balance, setBalance] = useState(10000);
  const [equityStart] = useState(10000);
  const [isEquityLocked, setIsEquityLocked] = useState(false);
  
  // Market Ticker State
  const [marketTicker, setMarketTicker] = useState<MarketTickerItem[]>([]);

  // MTF Labels State
  const [mtfLabels, setMtfLabels] = useState({ main: '15m', h1: '1H', h2: '4H' });

  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlertSound = () => {
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
        logger.error("Audio play failed", e);
    }
  };

  useEffect(() => {
      if (notifications.length > 0) {
          const latest = notifications[0];
          if (latest.type === 'warning' || latest.type === 'success') {
             playAlertSound();
          }
      }
  }, [notifications]);

  useEffect(() => {
      // Initialize market ticker
      const initialTicker = getMarketTicker();
      setMarketTicker(initialTicker);
      
      // Update ticker every 5 seconds
      const tickerInterval = setInterval(() => {
          setMarketTicker(prev => updateMarketTicker(prev));
      }, 5000);
      
      return () => clearInterval(tickerInterval);
  }, []);

  useEffect(() => {
      const interval = setInterval(() => {
          if (currentPrice > 0) {
              const change = (Math.random() - 0.5) * 0.0001;
              setCurrentPrice(prev => prev + change);
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [currentPrice]);

  useEffect(() => {
      const currentEquity = balance + simPositions.reduce((acc, pos) => acc + (currentPrice - pos.entryPrice) * pos.lotSize * 100000 * (pos.type === 'BUY' ? 1 : -1), 0);
      const drawdown = (equityStart - currentEquity) / equityStart * 100;
      if (drawdown >= MAX_DAILY_LOSS_PERCENT) setIsEquityLocked(true);
  }, [currentPrice, balance, simPositions, equityStart]);

  useEffect(() => { localStorage.setItem('smc_journal', JSON.stringify(savedTrades)); }, [savedTrades]);

  const runAnalysis = async () => {
    setIsChartLoading(true);
    const config = ASSET_CONFIG[activeAsset];
    try {
        let intervalMain = '15m';
        let intervalH1 = '1h';
        let intervalH4 = '4h';

        let lH1 = '1H';
        let lH2 = '4H';

        switch(smartInterval) {
            case '5m': 
                intervalMain = '5m'; intervalH1 = '15m'; intervalH4 = '1h'; 
                lH1 = '15m'; lH2 = '1H';
                break;
            case '15m': 
                intervalMain = '15m'; intervalH1 = '1h'; intervalH4 = '4h'; 
                lH1 = '1H'; lH2 = '4H';
                break;
            case '1h': 
                intervalMain = '1h'; intervalH1 = '4h'; intervalH4 = '1d'; 
                lH1 = '4H'; lH2 = '1D';
                break;
            case '2h': 
                intervalMain = '2h'; intervalH1 = '8h'; intervalH4 = '1d'; 
                lH1 = '8H'; lH2 = '1D';
                break;
            case '4h': 
                intervalMain = '4h'; intervalH1 = '12h'; intervalH4 = '1d'; 
                lH1 = '12H'; lH2 = '1D';
                break;
            case '1d': 
                intervalMain = '1d'; intervalH1 = '3d'; intervalH4 = '1w'; 
                lH1 = '3D'; lH2 = '1W';
                break;
        }
        setMtfLabels({ main: smartInterval, h1: lH1, h2: lH2 });

        const [resMain, resH1, resH4] = await Promise.all([
            fetch(`https://api.binance.com/api/v3/klines?symbol=${config.apiSymbol}&interval=${intervalMain}&limit=200`),
            fetch(`https://api.binance.com/api/v3/klines?symbol=${config.apiSymbol}&interval=${intervalH1}&limit=100`),
            fetch(`https://api.binance.com/api/v3/klines?symbol=${config.apiSymbol}&interval=${intervalH4}&limit=50`)
        ]);

        // HTTP hata kontrolü
        if (!resMain.ok || !resH1.ok || !resH4.ok) {
            const errorStatus = !resMain.ok ? resMain.status : !resH1.ok ? resH1.status : resH4.status;
            throw new Error(`API hatası: ${errorStatus} - ${resMain.statusText || resH1.statusText || resH4.statusText}`);
        }

        const [dataMain, dataH1, dataH4] = await Promise.all([resMain.json(), resH1.json(), resH4.json()]);
        
        // Veri kontrolü
        if (!dataMain || !Array.isArray(dataMain) || dataMain.length === 0) {
            throw new Error(`${activeAsset} için veri bulunamadı. Lütfen asset sembolünü kontrol edin.`);
        }
        
        if (!dataH1 || !Array.isArray(dataH1) || dataH1.length === 0) {
            throw new Error(`${activeAsset} için H1 verisi bulunamadı.`);
        }
        
        if (!dataH4 || !Array.isArray(dataH4) || dataH4.length === 0) {
            throw new Error(`${activeAsset} için H4 verisi bulunamadı.`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatCandles = (data: any[]) => data.map((d: any) => ({ time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) }));

        const candlesMain = formatCandles(dataMain);
        const candlesH1 = formatCandles(dataH1);
        const candlesH4 = formatCandles(dataH4);

        setCandles(candlesMain); 
        setCurrentPrice(candlesMain[candlesMain.length - 1].close);
        
        // Get historical trades for success rate calculation
        const savedTrades = JSON.parse(localStorage.getItem('smc_journal') || '[]');
        const analysis = analyzeMarketHistory(candlesMain, candlesH1, candlesH4, savedTrades);
        
        // Calculate SMT data for visualization
        try {
            const smtResult = await calculateSMT(activeAsset, candlesMain);
            setSmtData(smtResult);
        } catch (error) {
            logger.error('SMT calculation error:', error);
        }
        
        setZones(analysis.zones);
        setMarkers(analysis.markers);
        setLiquidityLevels(analysis.liquidityLevels);
        setMarketBias(analysis.bias);
        
        setNotifications(prev => {
            const existingIds = new Set(prev.map(p => p.time + p.title));
            const newNotifs = analysis.notifications.filter(n => !existingIds.has(n.time + n.title));
            if (newNotifs.length > 0) {
                 if (newNotifs.some(n => n.type === 'warning')) playAlertSound();
            }
            return [...newNotifs, ...prev].slice(0, 30);
        });

        // Check for alerts
        const setupAlerts = checkSetupAlerts(analysis.zones, []);
        const riskAlerts = checkRiskAlerts(simPositions, savedTrades, balance, []);
        const entryAlerts = checkEntryExitAlerts(analysis.zones, currentPrice, []);
        const allAlerts = [...setupAlerts, ...riskAlerts, ...entryAlerts];
        if (allAlerts.length > 0) {
            setAlertNotifications(prev => {
                const existingIds = new Set(prev.map(a => a.id));
                const newAlerts = allAlerts.filter(a => !existingIds.has(a.id));
                return [...newAlerts, ...prev].slice(0, 20);
            });
        }

    } catch (e: any) { 
        // Error logged via notification system 
        
        // Gerçek veri yoksa hata göster, mock veri kullanma
        const errorMessage = e?.message || 'Bilinmeyen hata';
        const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('CORS');
        const isApiError = e?.status || e?.response?.status;
        
        // Verileri temizle
        setCandles([]);
        setCurrentPrice(0);
        setZones([]);
        setMarkers([]);
        setLiquidityLevels([]);
        setMarketBias(null);
        setSmtData(null);
        
        // Kullanıcıya hata bildir
        setNotifications(prev => [{
            id: Math.random().toString(),
            time: new Date().toLocaleTimeString('tr-TR'),
            title: "⚠️ Veri Yükleme Hatası",
            message: isNetworkError 
                ? `İnternet bağlantısı veya API erişim sorunu. Lütfen bağlantınızı kontrol edin. (${activeAsset})`
                : isApiError
                ? `API hatası (${isApiError}). Lütfen daha sonra tekrar deneyin.`
                : `Veri yüklenemedi: ${errorMessage}. Lütfen sayfayı yenileyin.`,
            type: 'error' as const
        }, ...prev].slice(0, 5));
        
    } finally {
        setTimeout(() => setIsChartLoading(false), 500); 
    }
  };

  const handleAnalyzeScreenshot = async (zone: SMCZone, imageFile: File) => {
    if (!aiEnabled) return;
    setIsAnalyzingImage(true);
    setImageAnalysisResult(null);
    setFocusedZone(zone);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        // Build context
        const context = `
Bu bir ${activeAsset} grafik ekran görüntüsü. Lütfen şu setup'ı analiz et:

SETUP BİLGİLERİ:
- Tip: ${zone.type}
- Skor: ${zone.score}/100
- Fiyat Aralığı: ${zone.priceBottom.toFixed(5)} - ${zone.priceTop.toFixed(5)}
- Mevcut Fiyat: ${currentPrice.toFixed(5)}
- Confluence: ${zone.confluence.join(', ')}
- Trend: ${marketBias?.trend || 'Bilinmiyor'}

Grafikte şunları analiz et:
1. Price Action (Mum formasyonları, yapı)
2. Zone'un geçerliliği (test edilmiş mi, kırılmış mı?)
3. Likidite seviyeleri (stop hunt potansiyeli)
4. Entry timing (şu an giriş için uygun mu?)
5. Risk/Reward potansiyeli
6. IPDA mantığı (Premium/Discount durumu)

Detaylı, profesyonel bir analiz yap ve Türkçe yanıt ver.
        `;

        const analysis = await analyzeChartImage(base64Image, context, zone, currentPrice);
        setImageAnalysisResult(analysis);
        setIsAnalyzingImage(false);
      };
      reader.readAsDataURL(imageFile);
    } catch (error: any) {
      setImageAnalysisResult(`⚠️ HATA: ${error.message || 'Screenshot analizi başarısız'}`);
      setIsAnalyzingImage(false);
    }
  };

  const handleGeneratePlan = useCallback(async (zone: SMCZone, useStreaming: boolean = false) => {
    if (!aiEnabled) return;
    setIsAiLoading(true);
    setAiResponse(null);
    setStreamingText('');
    setStructuredResponse(null);
    setImageAnalysisResult(null);
    setFocusedZone(zone); // Set focused zone for context

    try {
      // Build trader profile for context memory
      const traderProfile = savedTrades.length > 0 
        ? buildTraderProfile(savedTrades)
        : null;
      
      // Try structured analysis first
      const structured = await getStructuredAnalysis(
        activeAsset,
        zone,
        marketBias,
        liquidityLevels,
        currentPrice
      );
      setStructuredResponse(structured);

      if (useStreaming) {
        // Use streaming for better UX
        const prompt = `Bu setup için detaylı işlem planı oluştur: ${zone.type}, Skor: ${zone.score}/100`;
        
        await streamAIResponse(
          prompt,
          (chunk) => {
            setStreamingText(prev => prev + chunk);
          },
          (fullText) => {
            const confidenceMatch = fullText.match(/\[CONFIDENCE:([\d.]+)\]/);
            const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : structured.confidence;
            const cleanPlan = fullText.replace(/\[CONFIDENCE:[\d.]+\]/, '');
            
            setAiResponse({ 
              id: zone.id, 
              text: cleanPlan || structured.reasoning, 
              confidence 
            });
    setIsAiLoading(false);
          }
        );
      } else {
        // Use context memory if trader profile exists
        let plan: string;
        if (traderProfile && savedTrades.length > 0) {
          const contextPrompt = `
            Bu setup için işlem planı oluştur:
            - Setup: ${zone.type}
            - Skor: ${zone.score}/100
            - Asset: ${activeAsset}
            - Fiyat: ${currentPrice}
          `;
          plan = await generateWithContext(
            contextPrompt,
            traderProfile,
            savedTrades.slice(0, 10)
          );
        } else {
          // Regular plan generation
          plan = await generateTradePlan(activeAsset, zone, marketBias, liquidityLevels, currentPrice);
        }
        
        // Parse confidence score from response
        const confidenceMatch = plan.match(/\[CONFIDENCE:([\d.]+)\]/);
        const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : structured.confidence;
        const cleanPlan = plan.replace(/\[CONFIDENCE:[\d.]+\]/, '');
        
        setAiResponse({ 
          id: zone.id, 
          text: cleanPlan || structured.reasoning, 
          confidence: confidence || structured.confidence 
        });
        setIsAiLoading(false);
      }
    } catch (error: any) {
      setAiResponse({ 
        id: zone.id, 
        text: `⚠️ HATA: ${error.message || 'Plan oluşturulamadı'}`,
        confidence: 0
      });
    setIsAiLoading(false);
    }
  }, [activeAsset, marketBias, liquidityLevels, currentPrice, savedTrades, aiEnabled]);

  const executeTrade = useCallback((type: 'BUY' | 'SELL', lot: number, sl: number, tp: number) => {
      const newTrade: OpenPosition = { id: Math.random().toString(36).substr(2, 9), asset: activeAsset, type, entryPrice: currentPrice, lotSize: lot, stopLoss: sl, takeProfit: tp, timestamp: Date.now() };
      setSimPositions(prev => [newTrade, ...prev]);
      const notificationType: 'success' = 'success';
      setNotifications(prev => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        title: '✅ İşlem Açıldı',
        message: `${type} Emri: ${lot} Lot @ ${currentPrice.toFixed(5)}`,
        type: notificationType
      }, ...prev].slice(0, 5));
  }, [activeAsset, currentPrice]);

  const closeTrade = useCallback((id: string, pnl: number) => {
      setBalance(prev => prev + pnl);
      setSimPositions(prev => prev.filter(p => p.id !== id));
      const notificationType: 'success' | 'error' = pnl >= 0 ? 'success' : 'error';
      setNotifications(prev => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        title: pnl >= 0 ? '✅ İşlem Kapandı' : '❌ İşlem Kapandı',
        message: `PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
        type: notificationType
      }, ...prev].slice(0, 5));
  }, []);

  const saveToJournal = (zone: SMCZone, planText: string) => {
      const entry: JournalEntry = { id: Math.random().toString(36).substr(2, 9), date: new Date().toLocaleString(), trader: 'AI Auto', asset: activeAsset, type: zone.type, entry: zone.priceTop.toString(), stop: "AI Plan", target: "AI Plan", note: planText, status: 'OPEN' };
      setSavedTrades(prev => [entry, ...prev]);
      alert("İşlem Günlüğe Kaydedildi!");
  };

  const addManualEntry = (entry: JournalEntry) => { setSavedTrades(prev => [entry, ...prev]); };
  const updateTradeStatus = (id: string, status: 'WIN' | 'LOSS') => { setSavedTrades(prev => prev.map(t => t.id === id ? { ...t, status } : t)); };

  useEffect(() => { runAnalysis(); const timer = setInterval(runAnalysis, 30000); return () => clearInterval(timer); }, [activeAsset, smartInterval]); 
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("Kopyalandı!"); };
  const getScoreColor = (score: number) => score >= 80 ? 'text-purple-400 bg-purple-400/10' : score >= 50 ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10';

  const tvTimeframes = [
      { label: '3m', val: '3' },
      { label: '5m', val: '5' },
      { label: '15m', val: '15' },
      { label: '1H', val: '60' },
      { label: '2H', val: '120' },
      { label: '4H', val: '240' },
  ];

  const smartTimeframes = ['5m', '15m', '1h', '2h', '4h', '1d'];

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-300 font-sans flex flex-col overflow-y-auto selection:bg-cyan-500/30">
      <RiskCalculator isOpen={showRiskCalc} onClose={() => setShowRiskCalc(false)} currentPrice={currentPrice} />
      {showPerformanceDashboard && savedTrades.length > 0 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPerformanceDashboard(false)}>
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-green-400" /> Performance Dashboard</h2>
              <button onClick={() => setShowPerformanceDashboard(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <PerformanceDashboard trades={savedTrades} />
            <div className="mt-6">
              <SessionAnalytics trades={savedTrades} />
            </div>
          </div>
        </div>
      )}

      {/* Structure Break Alerts */}
      {marketBias && previousMarketBias && (
        <StructureBreakAlerts
          marketBias={marketBias}
          previousBias={previousMarketBias}
          onAlert={(notification) => {
            setNotifications(prev => [notification, ...prev].slice(0, 30));
            playAlertSound();
          }}
        />
      )}

      {/* Trade Replay Modal */}
      {selectedTradeForReplay && (
        <TradeReplay
          trade={selectedTradeForReplay}
          candles={candles}
          onClose={() => setSelectedTradeForReplay(null)}
        />
      )}

      {/* Backtesting Panel */}
      <BacktestingPanel
        trades={savedTrades}
        isOpen={showBacktesting}
        onClose={() => setShowBacktesting(false)}
        activeAsset={activeAsset}
        onNotification={(notif) => setNotifications(prev => [notif, ...prev].slice(0, 5))}
      />

      {/* Accuracy Metrics Dashboard */}
      <AccuracyMetricsDashboard
        isOpen={showAccuracyMetrics}
        onClose={() => setShowAccuracyMetrics(false)}
      />

      {/* AI Trade Review Modal */}
      {selectedTradeForReview && (
        <AITradeReview
          trade={selectedTradeForReview}
          isOpen={true}
          onClose={() => setSelectedTradeForReview(null)}
        />
      )}

      {/* HEADER */}
      <header className="bg-[#0f1219] border-b border-slate-800 shrink-0 shadow-sm z-20 sticky top-0">
        <div className="flex justify-between items-center px-4 h-12">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><div className="bg-gradient-to-br from-indigo-500 to-cyan-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/20"><Layers className="w-5 h-5 text-white" /></div><div><h1 className="text-sm font-bold text-white tracking-tight leading-none">VADI</h1><span className="text-[9px] text-slate-500 font-mono tracking-widest">KURUMSAL TERMINAL</span></div></div>
                <div className="flex bg-slate-800 rounded p-1 gap-1">
                    <button onClick={() => setCurrentPage('dashboard')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'dashboard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><LayoutDashboard className="w-3 h-3" /> ANALİZ</button>
                    <button onClick={() => setCurrentPage('journal')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'journal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Briefcase className="w-3 h-3" /> GÜNLÜK</button>
                    <button onClick={() => setCurrentPage('resources')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'resources' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Video className="w-3 h-3" /> KAYNAK</button>
                    <button onClick={() => setCurrentPage('news')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'news' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Newspaper className="w-3 h-3" /> HABERLER</button>
                    <button onClick={() => setCurrentPage('props')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'props' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Ticket className="w-3 h-3" /> FONLAR</button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <button onClick={() => setShowRiskCalc(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-cyan-400"><Scale className="w-3 h-3" /> <span className="hidden sm:inline">RİSK</span></button>
                 <button onClick={() => setShowPerformanceDashboard(true)} disabled={savedTrades.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-green-400"><BarChart3 className="w-3 h-3" /> <span className="hidden sm:inline">PERFORMANS</span></button>
                 <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex bg-[#1a1f2b] rounded-md p-0.5 border border-slate-800">{Object.keys(ASSET_CONFIG).map((asset) => (<button key={asset} onClick={() => setActiveAsset(asset as Asset)} className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${activeAsset === asset ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>{asset}</button>))}</div>
                
                <div className="flex gap-1">
                    <button 
                        onClick={() => setShowConversation(true)} 
                        className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${showConversation ? 'text-purple-400 bg-purple-900/20 border border-purple-500/50' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/10'}`} 
                        title="AI ile Sohbet"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="hidden sm:inline text-[10px] font-bold">AI SOHBET</span>
                    </button>
                    <button onClick={() => setAiEnabled(!aiEnabled)} className={`p-1.5 rounded transition-colors ${aiEnabled ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-600'}`} title="AI GÖZÜ">{aiEnabled ? <ScanEye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                    <button onClick={() => setExecutionEnabled(!executionEnabled)} className={`p-1.5 rounded transition-colors ${executionEnabled ? 'text-green-400 bg-green-900/20' : 'text-slate-600'}`} title="Al/Sat Paneli"><MousePointerClick className="w-5 h-5" /></button>
                </div>
            </div>
        </div>
        
        {/* MARKET TICKER */}
        <div className="bg-[#0b0e14] border-t border-slate-800 py-1 px-4 flex items-center gap-4 text-[10px] overflow-hidden whitespace-nowrap relative h-8">
             <div className="flex items-center gap-1 text-slate-400 font-bold shrink-0 z-10 bg-[#0b0e14] pr-2 border-r border-slate-800 mr-2">
                <TrendingUp className="w-3 h-3 text-cyan-500" /> PİYASA
             </div>
             <div className="flex gap-6 animate-marquee text-slate-400 font-mono items-center">
                {marketTicker.length > 0 ? marketTicker.map((item, i) => {
                    const formatPrice = (price: number, symbol: string): string => {
                        if (symbol.includes('JPY')) return price.toFixed(2);
                        if (symbol.includes('XAU') || symbol.includes('XAG')) return price.toFixed(2);
                        if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toFixed(0);
                        return price.toFixed(5);
                    };
                    
                    const formatChange = (change: number, symbol: string): string => {
                        if (symbol.includes('JPY') || symbol.includes('XAU') || symbol.includes('XAG') || symbol.includes('BTC') || symbol.includes('ETH')) {
                            return change.toFixed(2);
                        }
                        return change.toFixed(2);
                    };
                    
                    return (
                    <div key={i} className="flex items-center gap-2 border-r border-slate-800 pr-4 last:border-0">
                            <span className="font-bold text-white">{item.symbol}</span>
                            <span className="text-slate-300">{formatPrice(item.price, item.symbol)}</span>
                            <div className={`flex items-center gap-1 ${item.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {item.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span className="font-bold">
                                    {item.isPositive ? '+' : ''}{formatChange(item.change, item.symbol)}%
                                </span>
                    </div>
                    </div>
                    );
                }) : (
                    <span className="text-slate-500">Piyasa verileri yükleniyor...</span>
                )}
             </div>
        </div>
      </header>

      {currentPage === 'journal' ? (
          <JournalPage trades={savedTrades} onUpdateTrade={updateTradeStatus} onAddManual={addManualEntry} onReplayTrade={setSelectedTradeForReplay} />
      ) : currentPage === 'resources' ? (
          <ResourcesPage />
      ) : currentPage === 'news' ? (
          <NewsPage />
      ) : currentPage === 'props' ? (
          <PropFirmPage />
      ) : (
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 bg-[#090b10]">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 flex flex-col border-r border-slate-800 relative">
                
                <div className="h-[600px] relative bg-black group overflow-hidden">
                    
                    {/* --- FLOAT CONTROL DOCK (INSIDE CHART) --- */}
                    <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 pointer-events-auto">
                         <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-200 shadow-xl w-fit">
                            <Monitor className="w-4 h-4 text-cyan-400" />
                            <span>{ASSET_CONFIG[activeAsset].tvSymbol}</span>
                            <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ml-2 ${marketBias?.trend === 'Bullish' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                {marketBias?.trend === 'Bullish' ? 'YÜKSELİŞ' : 'DÜŞÜŞ'}
                            </div>
                         </div>

                         {/* Mode Toggle */}
                         <button 
                            onClick={() => setViewMode(prev => prev === 'smart' ? 'classic' : 'smart')}
                            className="bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all w-fit"
                        >
                            {viewMode === 'smart' ? <ToggleRight className="w-4 h-4 text-cyan-400"/> : <ToggleLeft className="w-4 h-4 text-slate-500"/>}
                            {viewMode === 'smart' ? 'AI CHART' : 'TRADINGVIEW'}
                        </button>
                    </div>


                    {/* LOADING OVERLAY */}
                    {isChartLoading && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                            <div className="text-cyan-400 font-bold text-sm tracking-widest animate-pulse">ANALİZ GÜNCELLENİYOR...</div>
                            <div className="text-slate-500 text-xs font-mono mt-1">{smartInterval} Verileri İşleniyor</div>
                        </div>
                    )}

                    {/* AI HUD OVERLAY */}
                    {aiEnabled && viewMode === 'smart' && <AiChartHud bias={marketBias} activeCount={zones.filter(z => z.status === 'FRESH').length} aiResponse={aiResponse} />}
                    
                    
                    {/* CHART RENDER LOGIC */}
                    {viewMode === 'smart' ? (
                        <SmartChart 
                            data={candles} 
                            zones={zones} 
                            markers={markers} 
                            liquidityLevels={liquidityLevels}
                            positions={simPositions}
                            equilibrium={marketBias?.equilibrium}
                        />
                    ) : (
                        <TradingViewWidget symbol={ASSET_CONFIG[activeAsset].tvSymbol} interval={tvInterval} />
                    )}
                </div>
                
                <div className="h-72 border-t border-slate-800 bg-[#0f1219] flex flex-col shrink-0">
                    <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#151921] border-b border-slate-800 gap-y-2">
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500">
                            <button onClick={() => setConsoleTab('status')} className={`pb-2 -mb-2.5 border-b-2 transition-colors ${consoleTab === 'status' ? 'text-cyan-400 border-cyan-400' : 'border-transparent hover:text-slate-300'}`}>TERMİNAL LOGLARI</button>
                            <button onClick={() => setConsoleTab('journal')} className={`pb-2 -mb-2.5 border-b-2 transition-colors ${consoleTab === 'journal' ? 'text-cyan-400 border-cyan-400' : 'border-transparent hover:text-slate-300'}`}>AÇIK İŞLEMLER ({simPositions.length})</button>
                            <button 
                                onClick={() => setShowConversation(true)} 
                                className={`pb-2 -mb-2.5 border-b-2 transition-colors flex items-center gap-2 ${showConversation ? 'text-purple-400 border-purple-400' : 'border-transparent hover:text-purple-300'}`}
                            >
                                <MessageCircle className="w-3 h-3" />
                                AI SOHBET
                            </button>
                            <button 
                                onClick={() => setShowBacktesting(true)} 
                                className={`pb-2 -mb-2.5 border-b-2 transition-colors flex items-center gap-2 ${showBacktesting ? 'text-purple-400 border-purple-400' : 'border-transparent hover:text-purple-300'}`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Backtesting
                            </button>
                            <button
                                onClick={() => setShowAccuracyMetrics(true)} 
                                className={`pb-2 -mb-2.5 border-b-2 transition-colors flex items-center gap-2 ${showAccuracyMetrics ? 'text-cyan-400 border-cyan-400' : 'border-transparent hover:text-cyan-300'}`}
                            >
                                <Target className="w-3 h-3" />
                                DOĞRULUK
                            </button>
                            <button 
                                onClick={() => {
                                    // Önce FRESH zone'u ara, yoksa en yüksek skorlu zone'u al
                                    const freshZone = zones.find(z => z.status === 'FRESH');
                                    const bestZone = freshZone || zones.sort((a, b) => b.score - a.score)[0];
                                    if (bestZone) {
                                        setFocusedZone(bestZone);
                                        setExecutionEnabled(true); // Execution panel'i aç ki scorer görünsün
                                    } else {
                                        // Zone yoksa kullanıcıya bilgi ver
                                        setNotifications(prev => [{
                                            id: Date.now(),
                                            time: new Date().toLocaleTimeString(),
                                            title: '⚠️ Zone Bulunamadı',
                                            message: 'Setup score için önce bir zone oluşması gerekiyor.',
                                            type: 'warning'
                                        }, ...prev]);
                                    }
                                }} 
                                disabled={zones.length === 0}
                                className={`pb-2 -mb-2.5 border-b-2 transition-colors flex items-center gap-2 ${focusedZone ? 'text-cyan-400 border-cyan-400' : 'border-transparent hover:text-cyan-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <Sparkles className="w-3 h-3" />
                                SETUP SCORE {zones.length > 0 && zones.filter(z => z.status === 'FRESH').length > 0 && <span className="text-[8px] bg-cyan-500 text-black px-1 rounded">NEW</span>}
                            </button>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-slate-400"><span>BAKİYE: <span className="text-white">${balance.toFixed(2)}</span></span><span>PNL: <span className={simPositions.length > 0 ? 'text-white' : 'text-slate-500'}>${simPositions.reduce((acc, pos) => acc + (currentPrice - pos.entryPrice) * pos.lotSize * 100000 * (pos.type === 'BUY' ? 1 : -1), 0).toFixed(2)}</span></span></div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-400 custom-scrollbar relative">
                        {showConversation ? (
                            <div className="absolute inset-0 bg-[#0f1219] z-10">
                                <AIConversation 
                                    initialContext={
                                        focusedZone 
                                            ? `Bu setup hakkında: ${focusedZone.type}, Skor: ${focusedZone.score}/100` 
                                            : aiResponse 
                                                ? 'AI planı hakkında sorular sorabilirsiniz.' 
                                                : 'Trading hakkında sorularınızı sorabilirsiniz.'
                                    }
                                    onClose={() => setShowConversation(false)}
                                />
                            </div>
                        ) : consoleTab === 'status' ? (
                            <>
                                <div className="flex items-start gap-2 mb-1"><span className="text-green-500">[{new Date().toLocaleTimeString()}]</span><span>Sistem Hazır. Veri: <span className="text-cyan-500">BINANCE (DIRECT) + SMART CHART</span></span></div>
                                {notifications.slice(0, 5).map((n, i) => (<div key={i} className="flex items-start gap-2 mb-1"><span className={n.type === 'success' ? 'text-green-500' : n.type === 'error' ? 'text-red-500' : 'text-blue-500'}>[{n.time}]</span><span>{n.title}: {n.message}</span></div>))}
                            </>
                        ) : (
                            <table className="w-full text-left">
                                <thead><tr className="text-slate-500 border-b border-slate-700"><th>Varlık</th><th>Yön</th><th>Giriş</th><th>Anlık</th><th>PnL</th><th>İşlem</th></tr></thead>
                                <tbody>
                                    {simPositions.map(pos => {
                                        const pnl = (currentPrice - pos.entryPrice) * pos.lotSize * 100000 * (pos.type === 'BUY' ? 1 : -1);
                                        return (
                                            <tr key={pos.id} className="border-b border-slate-800"><td className="py-2">{pos.asset}</td><td className={pos.type === 'BUY' ? 'text-green-400' : 'text-red-400'}>{pos.type}</td><td>{pos.entryPrice.toFixed(5)}</td><td>{currentPrice.toFixed(5)}</td><td className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>${pnl.toFixed(2)}</td><td><button onClick={() => closeTrade(pos.id, pnl)} className="text-red-500 hover:text-white bg-red-900/20 px-2 py-1 rounded">KAPAT</button></td></tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-4 flex flex-col border-l border-slate-800 bg-[#0f1219]">
                
                <div className="p-4 border-b border-slate-800 bg-[#12151d]">
                    <PO3Visualizer phase={marketBias?.dailyBias || 'Accumulation'} openPrice={currentPrice * 0.999} currentPrice={currentPrice} />
                    
                    {/* --- NEW TIMEFRAME SELECTOR PANEL (Replaces NewsGuard) --- */}
                    <div className="bg-[#1a1f2b] p-3 rounded border border-slate-700 mb-3 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                             <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-500"/> ZAMAN DİLİMİ (AI)</div>
                             <div className="text-[9px] font-mono text-cyan-500">{smartInterval.toUpperCase()}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {smartTimeframes.map(tf => (
                                <button 
                                    key={tf} 
                                    onClick={() => setSmartInterval(tf as any)} 
                                    className={`py-2 rounded text-[10px] font-bold border transition-all ${
                                        smartInterval === tf 
                                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-900/30 scale-105' 
                                        : 'bg-[#0f1219] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                                    }`}
                                >
                                    {tf.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Volume Profile */}
                    {candles.length > 0 && (
                        <div className="mb-3">
                            <VolumeProfile candles={candles} currentPrice={currentPrice} />
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-3 mt-3">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><Activity className="w-3 h-3" /> YAPI & MTF ({smartInterval.toUpperCase()})</h2>
                        <div className="flex gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${marketBias?.mtf?.m15 === 'Bullish' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>{mtfLabels.main}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${marketBias?.mtf?.h1 === 'Bullish' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>{mtfLabels.h1}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${marketBias?.mtf?.h4 === 'Bullish' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>{mtfLabels.h2}</span>
                        </div>
                    </div>
                    
                    {/* EXECUTION PANEL */}
                    {executionEnabled && (
                        <div>
                            <ExecutionPanel price={currentPrice} onExecute={executeTrade} isLocked={isEquityLocked} reason={isEquityLocked ? "GÜNLÜK LİMİT AŞILDI" : ""} />
                        </div>
                    )}
                    
                    {/* AI Setup Scorer & Zone Inspector - Show when a zone is focused (independent of execution panel) */}
                    {focusedZone && (
                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                                <AISetupScorer
                                    setup={{
                                        type: focusedZone.type,
                                        asset: activeAsset,
                                        entry: focusedZone.priceTop,
                                        stop: focusedZone.priceTop * 0.999,
                                        target: focusedZone.priceTop * 1.003,
                                        marketBias: marketBias?.trend,
                                        session: marketBias ? 'LONDON' : undefined,
                                        confidence: focusedZone.score / 10,
                                    }}
                                />
                            </div>
                            <div>
                                <ZoneInspector 
                                    zone={focusedZone} 
                                    onClose={() => setFocusedZone(null)}
                                    marketBias={marketBias}
                                    aiConfidence={aiResponse?.confidence || 0}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* RISK HEAT MAP */}
                    {(simPositions.length > 0 || savedTrades.filter(t => t.status === 'OPEN').length > 0) && (
                        <div className="mt-3 bg-[#1a1f2b] border border-slate-700 rounded p-3">
                            <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-red-400" />
                                Risk Heat Map
                            </h3>
                            <RiskHeatMap 
                                positions={simPositions} 
                                trades={savedTrades} 
                                balance={balance} 
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 mt-3">
                        <span className="text-[10px] text-slate-400">Yüksek Olasılık Filtresi ({'>'}60)</span>
                        <button onClick={() => setHighProbFilter(!highProbFilter)} className={`w-8 h-4 rounded-full relative transition-colors ${highProbFilter ? 'bg-cyan-600' : 'bg-slate-700'}`}><div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${highProbFilter ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                    </div>
                </div>

                <div className="flex border-b border-slate-800 bg-[#0f1219]">
                    <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'active' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>AKTİF</button>
                    <button onClick={() => {
                        setActiveTab('cot');
                        // Load SMT data when tab is clicked if not already loaded
                        if ((!smtData || smtData.strength === undefined) && candles.length > 0) {
                            calculateSMT(activeAsset, candles).then(setSmtData).catch(err => {
                                logger.error('SMT calculation error:', err);
                            });
                        }
                    }} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'cot' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>SMT</button>
                    <button onClick={() => setActiveTab('dom')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'dom' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>DOM</button>
                    <button onClick={() => setActiveTab('feed')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors flex items-center justify-center gap-1 ${activeTab === 'feed' ? 'border-yellow-500 text-yellow-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <Activity className="w-3 h-3" />
                        ALERTLER
                        {alertNotifications.length > 0 && (
                            <span className="bg-yellow-500 text-black text-[8px] px-1 rounded-full font-bold">{alertNotifications.length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>GEÇMİŞ</button>
                </div>

                <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar bg-[#0b0e14] h-[600px] lg:h-[calc(100vh-350px)] min-h-[400px]">
                    {activeTab === 'cot' ? (
                        <div className="p-4">
                            <SMTPanel
                                activeAsset={activeAsset}
                                candles={candles}
                                onAlert={(alert) => {
                                    const notificationType: 'error' | 'warning' | 'info' = alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info';
                                    setAlertNotifications(prev => [{
                                        id: alert.id,
                                        time: new Date(alert.timestamp).toLocaleTimeString('tr-TR'),
                                        title: `SMT Uyarısı: ${alert.asset}`,
                                        message: alert.message,
                                        type: notificationType,
                                    }, ...prev].slice(0, 20));
                                }}
                            />
                                 </div>
                    ) : activeTab === 'dom' ? (<OrderBook price={currentPrice} />) : activeTab === 'feed' ? (
                        <div className="space-y-2">
                            <AlertSystem 
                                notifications={alertNotifications} 
                                onNotificationsChange={setAlertNotifications}
                                onPlaySound={playAlertSound}
                            />
                            <div className="mt-4">
                                <h3 className="text-xs font-bold text-gray-400 mb-2">Sistem Bildirimleri</h3>
                                <div className="space-y-1.5">
                                    {notifications.map((notif, i) => (
                                        <div key={i} className="p-2 rounded border-l-2 text-[10px] bg-[#151921] border-slate-500">
                                            <div className="flex justify-between mb-0.5 opacity-70">
                                                <span className="font-bold text-slate-300">{notif.title}</span>
                                                <span>{notif.time}</span>
                                            </div>
                                            <div className="text-slate-400">{notif.message}</div>
                                 </div>
                                    ))}
                                     </div>
                                            </div>
                                     </div>
                    ) : (
                        zones.filter(z => activeTab === 'active' ? z.status === 'FRESH' || z.status === 'TESTED' : z.status !== 'FRESH').filter(z => !highProbFilter || z.score >= 60).map((zone, idx) => (
                            <div key={idx} className="bg-[#151921] border border-slate-800 p-2 rounded hover:border-slate-700 transition-colors group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1 h-4 rounded-full ${zone.type.includes('Bullish') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`text-[10px] font-bold ${zone.type.includes('Bullish') ? 'text-green-400' : 'text-red-400'}`}>{zone.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {zone.score >= 70 && (
                                            <button onClick={() => setFocusedZone(zone)} className="text-cyan-400 hover:text-white p-1 rounded bg-cyan-900/20 hover:bg-cyan-600 transition-colors" title="Grafikte Göster"><Eye className="w-3 h-3" /></button>
                                        )}
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${getScoreColor(zone.score)}`}>PUAN: {zone.score}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-wrap mb-2">{zone.confluence.slice(0, 3).map((conf, i) => (<span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded border border-slate-700">{conf}</span>))}</div>
                                
                                {/* IMPROVED ACTIVE CARD DETAILS - GOLDEN ZONE & RR */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-[#0b0e14] p-1.5 rounded border border-slate-800 flex items-center justify-between text-[9px]">
                                        <span className="text-slate-500 flex items-center gap-1"><Scale className="w-3 h-3"/> R:R</span>
                                        <span className="text-white font-mono font-bold">1:3.5</span>
                                    </div>
                                    <div className={`p-1.5 rounded border flex items-center justify-between text-[9px] ${zone.confluence.some(c => c.includes('Golden')) ? 'bg-amber-900/20 border-amber-500/50' : 'bg-[#0b0e14] border-slate-800'}`}>
                                        <span className={`flex items-center gap-1 ${zone.confluence.some(c => c.includes('Golden')) ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                                            {zone.confluence.some(c => c.includes('Golden')) ? <Trophy className="w-3 h-3"/> : <Percent className="w-3 h-3"/>} 
                                            Golden Zone
                                        </span>
                                        {zone.confluence.some(c => c.includes('Golden')) && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-[#0b0e14] p-1.5 rounded border border-slate-800/50">
                                    <div className="text-[10px] font-mono text-slate-400 flex gap-3"><span>Y: <span className="text-slate-200">{zone.priceTop.toFixed(5)}</span></span><span>D: <span className="text-slate-200">{zone.priceBottom.toFixed(5)}</span></span></div>
                                    {activeTab === 'active' && aiEnabled && (
                                        <div className="flex gap-1.5">
                                            <label className="text-[9px] flex items-center gap-1 text-purple-400 hover:text-white bg-purple-900/20 hover:bg-purple-600 px-2 py-1 rounded transition-all cursor-pointer">
                                                {isAnalyzingImage ? <Loader2 className="w-3 h-3 animate-spin"/> : <Camera className="w-3 h-3" />}
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleAnalyzeScreenshot(zone, file);
                                                    }}
                                                />
                                                <span className="hidden sm:inline">Screenshot</span>
                                            </label>
                                        <button onClick={() => handleGeneratePlan(zone)} className="text-[9px] flex items-center gap-1 text-cyan-400 hover:text-white bg-cyan-900/20 hover:bg-cyan-600 px-2 py-1 rounded transition-all">{isAiLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />} AI</button>
                                        </div>
                                    )}
                                </div>
                                {/* Confirmation Badge */}
                                {activeTab === 'active' && aiResponse?.id === zone.id && aiResponse.confidence && (
                                    <div className="mt-2">
                                        {(() => {
                                            const similarPatterns = savedTrades.length > 0 
                                                ? findSimilarPatterns(zone, savedTrades, 3)
                                                : [];
                                            const confirmation = calculateConfirmation(
                                                zone,
                                                aiResponse.confidence || 5,
                                                similarPatterns,
                                                marketBias,
                                                liquidityLevels,
                                                currentPrice
                                            );
                                            return <ConfirmationBadge signals={confirmation} showDetails={true} />;
                                        })()}
                                    </div>
                                )}

                                {/* Screenshot Analysis Result */}
                                {imageAnalysisResult && focusedZone?.id === zone.id && (
                                    <div className="mt-2 bg-slate-800 p-2 rounded text-[10px] text-slate-300 border-l-2 border-purple-500 animate-in fade-in">
                                        <div className="flex justify-between items-center mb-1">
                                            <strong className="text-purple-400 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Screenshot Analizi</strong>
                                            <div className="flex gap-2">
                                                <button onClick={() => copyToClipboard(imageAnalysisResult)} className="hover:text-white flex items-center gap-1 text-slate-400"><Copy className="w-3 h-3"/> Kopyala</button>
                                                <button onClick={() => setImageAnalysisResult(null)} className="hover:text-red-400 flex items-center gap-1 text-slate-400">✕</button>
                                            </div>
                                        </div>
                                        <div className="mt-2 whitespace-pre-wrap text-slate-300 leading-relaxed">{imageAnalysisResult}</div>
                                    </div>
                                )}

                                {aiEnabled && aiResponse?.id === zone.id && (
                                    <div className="mt-2 bg-slate-800 p-2 rounded text-[10px] text-slate-300 border-l-2 border-cyan-500 animate-in fade-in">
                                        <div className="flex justify-between items-center mb-1">
                                            <strong className="text-cyan-400 flex items-center gap-1"><Bot className="w-3 h-3"/> AI Planı</strong>
                                            <div className="flex gap-2">
                                                <button onClick={() => saveToJournal(zone, aiResponse.text)} className="hover:text-green-400 flex items-center gap-1 text-slate-400"><Save className="w-3 h-3"/> Kaydet</button>
                                                <button onClick={() => copyToClipboard(aiResponse.text)} className="hover:text-white flex items-center gap-1 text-slate-400"><Copy className="w-3 h-3"/> Kopyala</button>
                                        </div>
                                        </div>
                                        
                                        {/* Structured Response */}
                                        {structuredResponse && (
                                            <div className="mb-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                                                <div className="grid grid-cols-3 gap-2 text-[9px] mb-2">
                                                    {structuredResponse.entry && (
                                                        <div>
                                                            <span className="text-slate-500">Entry:</span>
                                                            <span className="text-green-400 font-mono ml-1">{structuredResponse.entry.toFixed(5)}</span>
                                                        </div>
                                                    )}
                                                    {structuredResponse.stop && (
                                                        <div>
                                                            <span className="text-slate-500">Stop:</span>
                                                            <span className="text-red-400 font-mono ml-1">{structuredResponse.stop.toFixed(5)}</span>
                                                        </div>
                                                    )}
                                                    {structuredResponse.target && (
                                                        <div>
                                                            <span className="text-slate-500">Target:</span>
                                                            <span className="text-blue-400 font-mono ml-1">{structuredResponse.target.toFixed(5)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 text-[9px]">
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        structuredResponse.riskLevel === 'LOW' ? 'bg-green-500/20 text-green-400' :
                                                        structuredResponse.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        Risk: {structuredResponse.riskLevel}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        structuredResponse.recommendation === 'STRONG' ? 'bg-green-500/20 text-green-400' :
                                                        structuredResponse.recommendation === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {structuredResponse.recommendation}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Streaming or Regular Text */}
                                        <div className="whitespace-pre-wrap font-mono leading-relaxed opacity-80">
                                            {streamingText || aiResponse.text}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Pattern Recognition */}
                                {activeTab === 'active' && savedTrades.length > 0 && (
                                    <div className="mt-2 bg-slate-800/50 p-2 rounded border border-slate-700">
                                        <PatternRecognition currentZone={zone} trades={savedTrades} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
          </main>
      )}
    </div>
  );
}