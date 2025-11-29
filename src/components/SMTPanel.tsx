import React, { useState, useEffect } from 'react';
import { Scale, TrendingUp, TrendingDown, AlertTriangle, History, BarChart3, Activity, CheckCircle2, X, RefreshCw, Bell, BellOff } from 'lucide-react';
import { Asset, SMTData } from '../types';
import { calculateSMT, calculateMultiAssetSMT } from '../services/smtService';
import { ASSET_CONFIG } from '../constants';
import { Candle } from '../types';

interface SMTHistoryEntry {
    timestamp: number;
    asset: Asset;
    smtData: SMTData;
    priceAtSignal: number;
    outcome?: 'win' | 'loss' | 'neutral'; // For backtesting
}

interface SMTAlert {
    id: string;
    timestamp: number;
    asset: Asset;
    type: 'divergence' | 'strength' | 'alignment';
    message: string;
    severity: 'high' | 'medium' | 'low';
    acknowledged: boolean;
}

interface SMTPanelProps {
    activeAsset: Asset;
    candles: Candle[];
    onAlert?: (alert: SMTAlert) => void;
}

const SMTPanel: React.FC<SMTPanelProps> = ({ activeAsset, candles, onAlert }) => {
    const [currentSMT, setCurrentSMT] = useState<SMTData | null>(null);
    const [multiAssetSMT, setMultiAssetSMT] = useState<Map<Asset, SMTData>>(new Map());
    const [smtHistory, setSmtHistory] = useState<SMTHistoryEntry[]>([]);
    const [alerts, setAlerts] = useState<SMTAlert[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedView, setSelectedView] = useState<'current' | 'multi' | 'history' | 'alerts'>('current');
    const [alertEnabled, setAlertEnabled] = useState(true);
    const [strengthThreshold, setStrengthThreshold] = useState(70);

    // Load SMT history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('smt_history');
        if (saved) {
            try {
                setSmtHistory(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load SMT history:', e);
            }
        }
    }, []);

    // Save SMT history to localStorage
    useEffect(() => {
        if (smtHistory.length > 0) {
            localStorage.setItem('smt_history', JSON.stringify(smtHistory.slice(-1000))); // Keep last 1000 entries
        }
    }, [smtHistory]);

    // Calculate current SMT
    useEffect(() => {
        if (candles.length > 0) {
            setIsLoading(true);
            calculateSMT(activeAsset, candles)
                .then(data => {
                    setCurrentSMT(data);
                    
                    // Add to history
                    const historyEntry: SMTHistoryEntry = {
                        timestamp: Date.now(),
                        asset: activeAsset,
                        smtData: data,
                        priceAtSignal: candles[candles.length - 1].close,
                    };
                    setSmtHistory(prev => [historyEntry, ...prev.slice(0, 999)]);
                    
                    // Check for alerts
                    if (alertEnabled && onAlert) {
                        checkForAlerts(data, activeAsset);
                    }
                })
                .catch(err => {
                    console.error('SMT calculation error:', err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [activeAsset, candles]);

    // Calculate multi-asset SMT
    const loadMultiAssetSMT = async () => {
        setIsLoading(true);
        try {
            const assets: Asset[] = ['EURUSD', 'GBPUSD', 'XAUUSD', 'US100'];
            const candlesMap = new Map<Asset, Candle[]>();
            
            // For now, use current candles for all assets (in production, fetch each asset's candles)
            assets.forEach(asset => {
                if (asset === activeAsset) {
                    candlesMap.set(asset, candles);
                }
            });
            
            const results = await calculateMultiAssetSMT(assets.filter(a => candlesMap.has(a)), candlesMap);
            setMultiAssetSMT(results);
        } catch (err) {
            console.error('Multi-asset SMT error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Check for SMT alerts
    const checkForAlerts = (smtData: SMTData, asset: Asset) => {
        const newAlerts: SMTAlert[] = [];

        // Divergence alert
        if (smtData.divergence !== 'None' && smtData.strength >= strengthThreshold) {
            newAlerts.push({
                id: `${asset}-${Date.now()}-divergence`,
                timestamp: Date.now(),
                asset,
                type: 'divergence',
                message: `${asset}: ${smtData.divergence} tespit edildi (Güç: ${smtData.strength}%)`,
                severity: smtData.strength >= 80 ? 'high' : smtData.strength >= 60 ? 'medium' : 'low',
                acknowledged: false,
            });
        }

        // Strength threshold alert
        if (smtData.strength >= strengthThreshold && smtData.divergence === 'None') {
            newAlerts.push({
                id: `${asset}-${Date.now()}-strength`,
                timestamp: Date.now(),
                asset,
                type: 'strength',
                message: `${asset}: Yüksek SMT gücü tespit edildi (${smtData.strength}%)`,
                severity: 'medium',
                acknowledged: false,
            });
        }

        // Add new alerts
        if (newAlerts.length > 0) {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
            newAlerts.forEach(alert => {
                if (onAlert) {
                    onAlert(alert);
                }
            });
        }
    };

    // Acknowledge alert
    const acknowledgeAlert = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    };

    // Get SMT signal success rate
    const getSuccessRate = (): { total: number; wins: number; losses: number; rate: number } => {
        const signals = smtHistory.filter(h => h.outcome && h.outcome !== 'neutral');
        const wins = signals.filter(s => s.outcome === 'win').length;
        const losses = signals.filter(s => s.outcome === 'loss').length;
        const total = signals.length;
        return {
            total,
            wins,
            losses,
            rate: total > 0 ? (wins / total) * 100 : 0,
        };
    };

    const successRate = getSuccessRate();

    return (
        <div className="space-y-4">
            {/* View Selector */}
            <div className="flex gap-2 border-b border-slate-800">
                <button
                    onClick={() => setSelectedView('current')}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                        selectedView === 'current' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500'
                    }`}
                >
                    <Scale className="w-3 h-3 inline mr-1" /> Mevcut
                </button>
                <button
                    onClick={() => {
                        setSelectedView('multi');
                        loadMultiAssetSMT();
                    }}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                        selectedView === 'multi' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500'
                    }`}
                >
                    <BarChart3 className="w-3 h-3 inline mr-1" /> Çoklu
                </button>
                <button
                    onClick={() => setSelectedView('history')}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                        selectedView === 'history' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500'
                    }`}
                >
                    <History className="w-3 h-3 inline mr-1" /> Geçmiş
                </button>
                <button
                    onClick={() => setSelectedView('alerts')}
                    className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors relative ${
                        selectedView === 'alerts' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500'
                    }`}
                >
                    <Bell className="w-3 h-3 inline mr-1" /> Uyarılar
                    {alerts.filter(a => !a.acknowledged).length > 0 && (
                        <span className="absolute top-0 right-2 bg-red-500 text-white text-[8px] px-1 rounded-full">
                            {alerts.filter(a => !a.acknowledged).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Current SMT View */}
            {selectedView === 'current' && (
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
                        </div>
                    ) : currentSMT ? (
                        <>
                            {/* Main SMT Display */}
                            <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-purple-500" />
                                        {activeAsset} SMT Analizi
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-400 flex items-center gap-1">
                                            <Bell className="w-3 h-3" />
                                            <input
                                                type="checkbox"
                                                checked={alertEnabled}
                                                onChange={e => setAlertEnabled(e.target.checked)}
                                                className="w-3 h-3"
                                            />
                                        </label>
                                        <input
                                            type="number"
                                            value={strengthThreshold}
                                            onChange={e => setStrengthThreshold(Number(e.target.value))}
                                            min="0"
                                            max="100"
                                            className="w-16 bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                            placeholder="Eşik"
                                        />
                                    </div>
                                </div>

                                {/* Divergence Status */}
                                <div className="mb-4">
                                    {currentSMT.divergence !== 'None' ? (
                                        <div className={`p-3 rounded-lg border-2 ${
                                            currentSMT.divergence === 'Bullish SMT' 
                                                ? 'bg-green-500/10 border-green-500/50' 
                                                : 'bg-red-500/10 border-red-500/50'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {currentSMT.divergence === 'Bullish SMT' ? (
                                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="w-5 h-5 text-red-400" />
                                                )}
                                                <span className="font-bold text-white">{currentSMT.divergence}</span>
                                                <span className="text-xs text-slate-400">({currentSMT.divergenceBars} bar)</span>
                                            </div>
                                            <div className="text-xs text-slate-300">
                                                {currentSMT.divergence === 'Bullish SMT' 
                                                    ? 'Varlık, korelasyon çiftinden daha güçlü hareket ediyor'
                                                    : 'Varlık, korelasyon çiftinden daha zayıf hareket ediyor'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            <span className="text-sm text-slate-300">Senkronize - Uyumsuzluk yok</span>
                                        </div>
                                    )}
                                </div>

                                {/* SMT Strength Meter */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-slate-400">SMT Gücü</span>
                                        <span className="text-sm font-bold text-white">{currentSMT.strength}%</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${
                                                currentSMT.divergence === 'Bullish SMT' ? 'bg-green-500' :
                                                currentSMT.divergence === 'Bearish SMT' ? 'bg-red-500' :
                                                'bg-slate-600'
                                            }`}
                                            style={{ width: `${currentSMT.strength}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Correlation & Trends */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#0b0e14] p-3 rounded border border-slate-700">
                                        <div className="text-xs text-slate-400 mb-1">Korelasyon</div>
                                        <div className={`text-lg font-bold ${
                                            currentSMT.correlation < -0.7 ? 'text-red-400' :
                                            currentSMT.correlation > 0.7 ? 'text-green-400' :
                                            'text-yellow-400'
                                        }`}>
                                            {currentSMT.correlation.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="bg-[#0b0e14] p-3 rounded border border-slate-700">
                                        <div className="text-xs text-slate-400 mb-1">Fiyat</div>
                                        <div className="text-lg font-bold text-white">
                                            {(currentSMT.assetPrice ?? 0).toFixed(5)}
                                        </div>
                                    </div>
                                </div>

                                {/* Trend Comparison */}
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">{activeAsset} Trend</div>
                                        <div className={`text-sm font-bold flex items-center gap-1 ${
                                            (currentSMT.assetTrend ?? 'Neutral') === 'Bullish' ? 'text-green-400' :
                                            (currentSMT.assetTrend ?? 'Neutral') === 'Bearish' ? 'text-red-400' :
                                            'text-slate-400'
                                        }`}>
                                            {(currentSMT.assetTrend ?? 'Neutral') === 'Bullish' ? <TrendingUp className="w-4 h-4" /> :
                                            (currentSMT.assetTrend ?? 'Neutral') === 'Bearish' ? <TrendingDown className="w-4 h-4" /> :
                                            <Activity className="w-4 h-4" />}
                                            {currentSMT.assetTrend ?? 'Neutral'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">
                                            {ASSET_CONFIG[activeAsset]?.smtPair || 'Pair'} Trend
                                        </div>
                                        <div className={`text-sm font-bold flex items-center gap-1 ${
                                            currentSMT.pairTrend === 'Bullish' ? 'text-green-400' :
                                            currentSMT.pairTrend === 'Bearish' ? 'text-red-400' :
                                            'text-slate-400'
                                        }`}>
                                            {currentSMT.pairTrend === 'Bullish' ? <TrendingUp className="w-4 h-4" /> :
                                             currentSMT.pairTrend === 'Bearish' ? <TrendingDown className="w-4 h-4" /> :
                                             <Activity className="w-4 h-4" />}
                                            {currentSMT.pairTrend}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Success Rate */}
                            {successRate.total > 0 && (
                                <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl">
                                    <h4 className="text-xs font-bold text-slate-400 mb-2">SMT Sinyal Başarı Oranı</h4>
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="text-2xl font-bold text-cyan-400">{successRate.rate.toFixed(1)}%</div>
                                            <div className="text-xs text-slate-500">{successRate.total} sinyal</div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex gap-2 text-xs">
                                                <div className="flex-1">
                                                    <div className="text-green-400">Kazanç: {successRate.wins}</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-red-400">Kayıp: {successRate.losses}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            SMT verisi yükleniyor...
                        </div>
                    )}
                </div>
            )}

            {/* Multi-Asset Comparison */}
            {selectedView === 'multi' && (
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {Array.from(multiAssetSMT.entries()).map(([asset, smtData]) => (
                                <div key={asset} className="bg-[#151921] border border-slate-800 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-white">{asset}</span>
                                        <span className={`text-xs font-bold ${
                                            smtData.divergence === 'Bullish SMT' ? 'text-green-400' :
                                            smtData.divergence === 'Bearish SMT' ? 'text-red-400' :
                                            'text-slate-400'
                                        }`}>
                                            {smtData.divergence !== 'None' ? smtData.divergence : 'Senkronize'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${
                                                    smtData.divergence === 'Bullish SMT' ? 'bg-green-500' :
                                                    smtData.divergence === 'Bearish SMT' ? 'bg-red-500' :
                                                    'bg-slate-600'
                                                }`}
                                                style={{ width: `${smtData.strength}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-12 text-right">{smtData.strength}%</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Korelasyon: {smtData.correlation.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* History View */}
            {selectedView === 'history' && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {smtHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Henüz SMT geçmişi yok
                        </div>
                    ) : (
                        smtHistory.slice(0, 50).map((entry, idx) => (
                            <div key={idx} className="bg-[#151921] border border-slate-800 p-3 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <span className="font-bold text-white">{entry.asset}</span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {new Date(entry.timestamp).toLocaleString('tr-TR')}
                                        </span>
                                    </div>
                                    {entry.smtData.divergence !== 'None' && (
                                        <span className={`text-xs font-bold ${
                                            entry.smtData.divergence === 'Bullish SMT' ? 'text-green-400' :
                                            'text-red-400'
                                        }`}>
                                            {entry.smtData.divergence}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="text-slate-400">Güç: <span className="text-white">{entry.smtData.strength}%</span></span>
                                    <span className="text-slate-400">Korelasyon: <span className="text-white">{entry.smtData.correlation.toFixed(2)}</span></span>
                                    <span className="text-slate-400">Fiyat: <span className="text-white">{entry.priceAtSignal.toFixed(5)}</span></span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Alerts View */}
            {selectedView === 'alerts' && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {alerts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Henüz uyarı yok
                        </div>
                    ) : (
                        alerts.filter(a => !a.acknowledged).map(alert => (
                            <div
                                key={alert.id}
                                className={`bg-[#151921] border p-3 rounded-lg ${
                                    alert.severity === 'high' ? 'border-red-500/50 bg-red-500/10' :
                                    alert.severity === 'medium' ? 'border-yellow-500/50 bg-yellow-500/10' :
                                    'border-slate-700'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className={`w-4 h-4 ${
                                            alert.severity === 'high' ? 'text-red-400' :
                                            alert.severity === 'medium' ? 'text-yellow-400' :
                                            'text-slate-400'
                                        }`} />
                                        <span className="font-bold text-white text-sm">{alert.asset}</span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(alert.timestamp).toLocaleString('tr-TR')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => acknowledgeAlert(alert.id)}
                                        className="text-slate-500 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="text-xs text-slate-300">{alert.message}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SMTPanel;

