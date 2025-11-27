import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Layers, Globe, ArrowUpRight, ArrowDownRight, 
  BarChart3, LayoutDashboard, Briefcase, 
  Ticket, EyeOff, MousePointerClick, Scale, Eye, Bot, Save, Copy, Sparkles, Loader2, Monitor, ScanEye, ToggleLeft, ToggleRight
} from 'lucide-react';

import { ASSET_CONFIG, MAX_DAILY_LOSS_PERCENT } from './constants';
import { Asset, PageView, SMCZone, MarketBias, Notification, OpenPosition, JournalEntry, Candle, ChartMarker, LiquidityLevel } from './types';
import { analyzeMarketHistory } from './services/marketService';
import { generateTradePlan } from './services/geminiService';

import SmartChart from './components/SmartChart';
import TradingViewWidget from './components/TradingViewWidget';
import AiChartHud from './components/AiChartHud';
import ExecutionPanel from './components/ExecutionPanel';
import NewsGuard from './components/NewsGuard';
import OrderBook from './components/OrderBook';
import PO3Visualizer from './components/PO3Visualizer';
import RiskCalculator from './components/RiskCalculator';
import ZoneInspector from './components/ZoneInspector';
import JournalPage from './components/JournalPage';
import PropFirmPage from './components/PropFirmPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [activeAsset, setActiveAsset] = useState<Asset>('EURUSD');
  const [viewMode, setViewMode] = useState<'smart' | 'classic'>('smart');
  
  // Chart Data State
  const [candles, setCandles] = useState<Candle[]>([]);
  const [zones, setZones] = useState<SMCZone[]>([]);
  const [markers, setMarkers] = useState<ChartMarker[]>([]);
  const [liquidityLevels, setLiquidityLevels] = useState<LiquidityLevel[]>([]);
  
  const [marketBias, setMarketBias] = useState<MarketBias | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'feed' | 'dom' | 'cot'>('active');
  const [consoleTab, setConsoleTab] = useState<'status' | 'journal'>('status');
  const [highProbFilter, setHighProbFilter] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [executionEnabled, setExecutionEnabled] = useState(true);
  const [showRiskCalc, setShowRiskCalc] = useState(false);
  
  const [savedTrades, setSavedTrades] = useState<JournalEntry[]>(() => {
      const saved = localStorage.getItem('smc_journal');
      return saved ? JSON.parse(saved) : [];
  });

  const [currentPrice, setCurrentPrice] = useState(0);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{id: string, text: string} | null>(null);
  const [focusedZone, setFocusedZone] = useState<SMCZone | null>(null);
  
  const [simPositions, setSimPositions] = useState<OpenPosition[]>([]);
  const [balance, setBalance] = useState(10000);
  const [equityStart] = useState(10000);
  const [isEquityLocked, setIsEquityLocked] = useState(false);
  const [timeToNews, setTimeToNews] = useState<string>('00:45:00');
  const [isNewsLocked, setIsNewsLocked] = useState(false);
  
  // Dynamic News Ticker State
  const [newsTicker, setNewsTicker] = useState<string[]>([]);
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);

  // Audio Context for alerts
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
        console.error("Audio play failed", e);
    }
  };

  // Check for new notifications to play sound
  useEffect(() => {
      if (notifications.length > 0) {
          const latest = notifications[0];
          if (latest.type === 'warning' || latest.type === 'success') {
             playAlertSound();
          }
      }
  }, [notifications]);

  // Simulated live feed and news ticker updates
  useEffect(() => {
      // 1. Price Ticker Simulation
      const interval = setInterval(() => {
          if (currentPrice > 0) {
              const change = (Math.random() - 0.5) * 0.0001;
              setCurrentPrice(prev => prev + change);
          }
      }, 1000);

      // 2. News Ticker Rotation
      const newsItems = [
          "⚠ DİKKAT: ABD CPI Verisi Bekleniyor (Yüksek Volatilite)",
          "Fed Başkanı Powell Konuşuyor: 'Faiz indirimi masada değil'",
          "ECB: Euro Bölgesi enflasyonu hedefin üzerinde",
          "Altın (XAUUSD) tüm zamanların en yükseğini test ediyor",
          "Petrol stoklarında beklenmedik düşüş",
          "Japonya Merkez Bankası (BoJ) müdahale sinyali verdi",
          "Bitcoin ETF girişleri rekor kırdı"
      ];
      setNewsTicker(newsItems);

      return () => clearInterval(interval);
  }, [currentPrice]);

  // Risk & News Monitoring
  useEffect(() => {
      const currentEquity = balance + simPositions.reduce((acc, pos) => acc + (currentPrice - pos.entryPrice) * pos.lotSize * 100000 * (pos.type === 'BUY' ? 1 : -1), 0);
      const drawdown = (equityStart - currentEquity) / equityStart * 100;
      if (drawdown >= MAX_DAILY_LOSS_PERCENT) setIsEquityLocked(true);

      const now = new Date();
      const mins = now.getMinutes();
      if (mins >= 45) { setIsNewsLocked(true); setTimeToNews(`00:${60-mins}:00`); } 
      else { setIsNewsLocked(false); setTimeToNews(`00:${45-mins}:00`); }
  }, [currentPrice, balance, simPositions, equityStart]);

  useEffect(() => { localStorage.setItem('smc_journal', JSON.stringify(savedTrades)); }, [savedTrades]);

  const runAnalysis = async () => {
    const config = ASSET_CONFIG[activeAsset];
    try {
        const [res15m, res1h, res4h] = await Promise.all([
            fetch(`https://api.binance.com/api/v3/klines?symbol=${config.apiSymbol}&interval=15m&limit=200`),
            fetch(`https://api.binance.com/api/v3/klines?symbol=${config.apiSymbol}&interval=1h&limit=100`),
            fetch(`https://api.binance.com/api/v3/klines?symbol=${config.apiSymbol}&interval=4h&limit=50`)
        ]);

        const [data15m, data1h, data4h] = await Promise.all([res15m.json(), res1h.json(), res4h.json()]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatCandles = (data: any[]) => data.map((d: any) => ({ time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) }));

        const candles15m = formatCandles(data15m);
        const candles1h = formatCandles(data1h);
        const candles4h = formatCandles(data4h);

        setCandles(candles15m); // Store for SmartChart
        setCurrentPrice(candles15m[candles15m.length - 1].close);
        
        const analysis = analyzeMarketHistory(candles15m, candles1h, candles4h);
        
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

    } catch (e) { 
        console.error("Analysis Error (CORS likely):", e); 
        setNotifications(prev => [{id: Math.random(), time: new Date().toLocaleTimeString(), title: "Veri Hatası", message: "Bağlantı kontrol ediliyor.", type: 'warning'}, ...prev]);
        setCurrentPrice(1.0850); 
    }
  };

  const handleGeneratePlan = async (zone: SMCZone) => {
    if (!aiEnabled) return;
    setIsAiLoading(true);
    setAiResponse(null);
    const plan = await generateTradePlan(activeAsset, zone, marketBias, liquidityLevels, currentPrice);
    setAiResponse({ id: zone.id, text: plan });
    setIsAiLoading(false);
  };

  const executeTrade = (type: 'BUY' | 'SELL', lot: number, sl: number, tp: number) => {
      const newTrade: OpenPosition = { id: Math.random().toString(36).substr(2, 9), asset: activeAsset, type, entryPrice: currentPrice, lotSize: lot, stopLoss: sl, takeProfit: tp, openTime: new Date().toLocaleTimeString() };
      setSimPositions(prev => [newTrade, ...prev]);
      alert(`${type} Emri Açıldı: ${lot} Lot @ ${currentPrice.toFixed(5)}`);
  };

  const closeTrade = (id: string, pnl: number) => {
      setBalance(prev => prev + pnl);
      setSimPositions(prev => prev.filter(p => p.id !== id));
  };

  const saveToJournal = (zone: SMCZone, planText: string) => {
      const entry: JournalEntry = { id: Math.random().toString(36).substr(2, 9), date: new Date().toLocaleString(), trader: 'AI Auto', asset: activeAsset, type: zone.type, entry: zone.priceTop.toString(), stop: "AI Plan", target: "AI Plan", note: planText, status: 'OPEN' };
      setSavedTrades(prev => [entry, ...prev]);
      alert("İşlem Günlüğe Kaydedildi!");
  };

  const addManualEntry = (entry: JournalEntry) => { setSavedTrades(prev => [entry, ...prev]); };
  const updateTradeStatus = (id: string, status: 'WIN' | 'LOSS') => { setSavedTrades(prev => prev.map(t => t.id === id ? { ...t, status } : t)); };

  useEffect(() => { runAnalysis(); const timer = setInterval(runAnalysis, 30000); return () => clearInterval(timer); }, [activeAsset]);
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("Kopyalandı!"); };
  const getScoreColor = (score: number) => score >= 80 ? 'text-purple-400 bg-purple-400/10' : score >= 50 ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10';

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-300 font-sans flex flex-col overflow-y-auto selection:bg-cyan-500/30">
      <RiskCalculator isOpen={showRiskCalc} onClose={() => setShowRiskCalc(false)} currentPrice={currentPrice} />

      {/* HEADER */}
      <header className="bg-[#0f1219] border-b border-slate-800 shrink-0 shadow-sm z-20 sticky top-0">
        <div className="flex justify-between items-center px-4 h-12">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><div className="bg-gradient-to-br from-indigo-500 to-cyan-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/20"><Layers className="w-5 h-5 text-white" /></div><div><h1 className="text-sm font-bold text-white tracking-tight leading-none">VADI</h1><span className="text-[9px] text-slate-500 font-mono tracking-widest">KURUMSAL TERMINAL</span></div></div>
                <div className="flex bg-slate-800 rounded p-1 gap-1">
                    <button onClick={() => setCurrentPage('dashboard')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'dashboard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><LayoutDashboard className="w-3 h-3" /> ANALİZ</button>
                    <button onClick={() => setCurrentPage('journal')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'journal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Briefcase className="w-3 h-3" /> GÜNLÜK</button>
                    <button onClick={() => setCurrentPage('props')} className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${currentPage === 'props' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Ticket className="w-3 h-3" /> FONLAR</button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <button onClick={() => setShowRiskCalc(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors text-cyan-400"><Scale className="w-3 h-3" /> <span className="hidden sm:inline">RİSK</span></button>
                 <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex bg-[#1a1f2b] rounded-md p-0.5 border border-slate-800">{Object.keys(ASSET_CONFIG).map((asset) => (<button key={asset} onClick={() => setActiveAsset(asset as Asset)} className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${activeAsset === asset ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>{asset}</button>))}</div>
                <div className="flex gap-1"><button onClick={() => setAiEnabled(!aiEnabled)} className={`p-1.5 rounded transition-colors ${aiEnabled ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-600'}`} title="AI GÖZÜ">{aiEnabled ? <ScanEye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button><button onClick={() => setExecutionEnabled(!executionEnabled)} className={`p-1.5 rounded transition-colors ${executionEnabled ? 'text-green-400 bg-green-900/20' : 'text-slate-600'}`} title="Al/Sat Paneli"><MousePointerClick className="w-5 h-5" /></button></div>
            </div>
        </div>
        
        {/* SCROLLING NEWS TICKER */}
        <div className="bg-[#0b0e14] border-t border-slate-800 py-1 px-4 flex items-center gap-4 text-[10px] overflow-hidden whitespace-nowrap relative">
             <div className="flex items-center gap-1 text-red-500 font-bold shrink-0 z-10 bg-[#0b0e14] pr-2"><Globe className="w-3 h-3" /> CANLI AKIŞ:</div>
             <div className="flex gap-8 animate-marquee text-slate-400 font-mono">
                <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-500"/> EURUSD {(1.0850 + (Math.random()*0.002)).toFixed(5)} (+0.12%)</span>
                <span className="flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-red-500"/> BTCUSD {(64200 + (Math.random()*100)).toFixed(0)} (-1.4%)</span>
                <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-500"/> XAUUSD {(2340 + (Math.random()*5)).toFixed(1)} (+0.5%)</span>
                <span className="text-slate-600">|</span>
                {newsTicker.map((news, i) => (
                    <span key={i} className="text-slate-300 font-bold mx-4">{news}</span>
                ))}
             </div>
        </div>
      </header>

      {currentPage === 'journal' ? (
          <JournalPage trades={savedTrades} onUpdateTrade={updateTradeStatus} onAddManual={addManualEntry} />
      ) : currentPage === 'props' ? (
          <PropFirmPage />
      ) : (
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 bg-[#090b10]">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 flex flex-col border-r border-slate-800 relative">
                <div className="h-[600px] relative bg-black group">
                    {/* TOP CONTROLS */}
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <div className="bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1 rounded text-xs font-mono text-slate-300 flex items-center gap-2 shadow-xl">
                            <Monitor className="w-3 h-3 text-cyan-400" />
                            <span>{ASSET_CONFIG[activeAsset].tvSymbol}</span>
                            <span className="text-slate-600">|</span>
                            <span className={marketBias?.trend === 'Bullish' ? 'text-green-400' : 'text-red-400'}>{marketBias?.trend === 'Bullish' ? 'YÜKSELİŞ' : 'DÜŞÜŞ'}</span>
                        </div>
                        <button 
                            onClick={() => setViewMode(prev => prev === 'smart' ? 'classic' : 'smart')}
                            className="bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1 rounded text-xs font-bold text-slate-300 flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"
                        >
                            {viewMode === 'smart' ? <ToggleRight className="w-4 h-4 text-cyan-400"/> : <ToggleLeft className="w-4 h-4 text-slate-500"/>}
                            {viewMode === 'smart' ? 'AI CHART' : 'TRADINGVIEW'}
                        </button>
                    </div>

                    {/* AI HUD OVERLAY */}
                    {aiEnabled && viewMode === 'smart' && <AiChartHud bias={marketBias} activeCount={zones.filter(z => z.status === 'FRESH').length} />}
                    {focusedZone && <ZoneInspector zone={focusedZone} onClose={() => setFocusedZone(null)} />}
                    
                    {/* CHART RENDER LOGIC */}
                    {viewMode === 'smart' ? (
                        <SmartChart data={candles} zones={zones} markers={markers} liquidityLevels={liquidityLevels} />
                    ) : (
                        <TradingViewWidget symbol={ASSET_CONFIG[activeAsset].tvSymbol} />
                    )}
                </div>
                
                <div className="h-72 border-t border-slate-800 bg-[#0f1219] flex flex-col shrink-0">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#151921] border-b border-slate-800">
                        <div className="flex gap-6 text-[10px] font-bold text-slate-500">
                            <button onClick={() => setConsoleTab('status')} className={`pb-2 -mb-2.5 border-b-2 transition-colors ${consoleTab === 'status' ? 'text-cyan-400 border-cyan-400' : 'border-transparent hover:text-slate-300'}`}>TERMİNAL LOGLARI</button>
                            <button onClick={() => setConsoleTab('journal')} className={`pb-2 -mb-2.5 border-b-2 transition-colors ${consoleTab === 'journal' ? 'text-cyan-400 border-cyan-400' : 'border-transparent hover:text-slate-300'}`}>AÇIK İŞLEMLER ({simPositions.length})</button>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-slate-400"><span>BAKİYE: <span className="text-white">${balance.toFixed(2)}</span></span><span>PNL: <span className={simPositions.length > 0 ? 'text-white' : 'text-slate-500'}>${simPositions.reduce((acc, pos) => acc + (currentPrice - pos.entryPrice) * pos.lotSize * 100000 * (pos.type === 'BUY' ? 1 : -1), 0).toFixed(2)}</span></span></div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-400 custom-scrollbar">
                        {consoleTab === 'status' ? (
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
                    
                    {/* NEWS GUARD WIDGET */}
                    <NewsGuard isLocked={isNewsLocked} timeToNews={timeToNews} />

                    <div className="flex items-center justify-between mb-3 mt-3">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><Activity className="w-3 h-3" /> YAPI & MTF</h2>
                        <div className="flex gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${marketBias?.mtf?.m15 === 'Bullish' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>15m</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${marketBias?.mtf?.h1 === 'Bullish' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>1H</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${marketBias?.mtf?.h4 === 'Bullish' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>4H</span>
                        </div>
                    </div>
                    
                    {/* EXECUTION PANEL */}
                    {executionEnabled && <ExecutionPanel price={currentPrice} onExecute={executeTrade} isLocked={isNewsLocked || isEquityLocked} reason={isEquityLocked ? "GÜNLÜK LİMİT AŞILDI" : "HABER KİLİDİ"} />}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 mt-3">
                        <span className="text-[10px] text-slate-400">Yüksek Olasılık Filtresi ({'>'}60)</span>
                        <button onClick={() => setHighProbFilter(!highProbFilter)} className={`w-8 h-4 rounded-full relative transition-colors ${highProbFilter ? 'bg-cyan-600' : 'bg-slate-700'}`}><div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${highProbFilter ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                    </div>
                </div>

                <div className="flex border-b border-slate-800 bg-[#0f1219]">
                    <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'active' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>AKTİF</button>
                    <button onClick={() => setActiveTab('cot')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'cot' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>SMT</button>
                    <button onClick={() => setActiveTab('dom')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'dom' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>DOM</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-cyan-500 text-cyan-400 bg-slate-800/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>GEÇMİŞ</button>
                </div>

                <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar bg-[#0b0e14] h-[600px] lg:h-[calc(100vh-350px)] min-h-[400px]">
                    {activeTab === 'cot' ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                             <BarChart3 className="w-12 h-12 mb-2 opacity-50"/>
                             <span className="text-xs">SMT Radarı Aktif</span>
                             <span className="text-[10px]">EURUSD / DXY Karşılaştırması</span>
                        </div>
                    ) : activeTab === 'dom' ? (<OrderBook price={currentPrice} />) : activeTab === 'feed' ? (
                        <div className="space-y-1.5">{notifications.map((notif, i) => (<div key={i} className="p-2 rounded border-l-2 text-[10px] bg-[#151921] border-slate-500"><div className="flex justify-between mb-0.5 opacity-70"><span className="font-bold text-slate-300">{notif.title}</span><span>{notif.time}</span></div><div className="text-slate-400">{notif.message}</div></div>))}</div>
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
                                <div className="flex justify-between items-center bg-[#0b0e14] p-1.5 rounded border border-slate-800/50">
                                    <div className="text-[10px] font-mono text-slate-400 flex gap-3"><span>Y: <span className="text-slate-200">{zone.priceTop.toFixed(5)}</span></span><span>D: <span className="text-slate-200">{zone.priceBottom.toFixed(5)}</span></span></div>
                                    {activeTab === 'active' && aiEnabled && (
                                        <button onClick={() => handleGeneratePlan(zone)} className="text-[9px] flex items-center gap-1 text-cyan-400 hover:text-white bg-cyan-900/20 hover:bg-cyan-600 px-2 py-1 rounded transition-all">{isAiLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />} AI</button>
                                    )}
                                </div>
                                {aiEnabled && aiResponse?.id === zone.id && (
                                    <div className="mt-2 bg-slate-800 p-2 rounded text-[10px] text-slate-300 border-l-2 border-cyan-500 animate-in fade-in">
                                        <div className="flex justify-between items-center mb-1">
                                            <strong className="text-cyan-400 flex items-center gap-1"><Bot className="w-3 h-3"/> AI Planı</strong>
                                            <div className="flex gap-2"><button onClick={() => saveToJournal(zone, aiResponse.text)} className="hover:text-green-400 flex items-center gap-1 text-slate-400"><Save className="w-3 h-3"/> Kaydet</button><button onClick={() => copyToClipboard(aiResponse.text)} className="hover:text-white flex items-center gap-1 text-slate-400"><Copy className="w-3 h-3"/> Kopyala</button></div>
                                        </div>
                                        <div className="whitespace-pre-wrap font-mono leading-relaxed opacity-80">{aiResponse.text}</div>
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