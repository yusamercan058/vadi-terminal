import React, { useState, useMemo } from 'react';
import { Briefcase, Plus, BrainCircuit, Loader2, Sparkles, X, User, Upload, Image as ImageIcon, ThumbsUp, ThumbsDown, FileText, Download, BarChart3, Play, Brain, Search, Filter, Tag, Calendar, GitCompare, Layers, Save } from 'lucide-react';
import { JournalEntry } from '../types';
import { TRADERS } from '../constants';
import { analyzeJournal } from '../services/geminiService';
import PerformanceDashboard from './PerformanceDashboard';
import TradePlanTracker from './TradePlanTracker';
import { calculateSetupPerformance } from '../services/performanceService';

interface JournalPageProps {
    trades: JournalEntry[];
    onUpdateTrade: (id: string, status: 'WIN' | 'LOSS') => void;
    onAddManual: (entry: JournalEntry) => void;
    onReplayTrade?: (trade: JournalEntry) => void;
    onReviewTrade?: (trade: JournalEntry) => void;
}

const JournalPage: React.FC<JournalPageProps> = ({ trades, onUpdateTrade, onAddManual, onReplayTrade, onReviewTrade }) => {
    const [coachAnalysis, setCoachAnalysis] = useState<string | null>(null);
    const [isCoachLoading, setIsCoachLoading] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [formData, setFormData] = useState({ 
        asset: 'EURUSD', 
        type: 'Bullish OB', 
        entry: '', 
        stop: '', 
        target: '', 
        note: '', 
        trader: TRADERS[0], 
        image: '',
        tags: [] as string[],
        session: undefined as 'ASIA' | 'LONDON' | 'NEWYORK' | 'CLOSE' | undefined,
        emotionalState: undefined as 'FOMO' | 'Revenge' | 'Confident' | 'Fear' | 'Calm' | 'Greedy' | undefined,
        marketCondition: undefined as 'Trending' | 'Ranging' | 'Volatile' | 'Consolidation' | undefined,
        setupQuality: undefined as 'High' | 'Medium' | 'Low' | undefined,
        tradeTemplate: undefined as string | undefined,
    });
    
    // Filtering & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAsset, setFilterAsset] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterSession, setFilterSession] = useState<string>('all');
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [filterRR, setFilterRR] = useState<{ min: number; max: number }>({ min: 0, max: 10 });
    const [filterConfidence, setFilterConfidence] = useState<{ min: number; max: number }>({ min: 0, max: 10 });
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    
    // Templates
    const [templates, setTemplates] = useState<Array<{ id: string; name: string; data: Partial<JournalEntry> }>>(() => {
        const saved = localStorage.getItem('vadi_trade_templates');
        return saved ? JSON.parse(saved) : [];
    });
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [selectedTradesForComparison, setSelectedTradesForComparison] = useState<string[]>([]);

    const winRate = trades.length > 0 ? (trades.filter(t => t.status === 'WIN').length / trades.filter(t => t.status !== 'OPEN').length) * 100 : 0;
    
    // Get all unique tags
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        trades.forEach(t => {
            t.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    }, [trades]);
    
    // Filtered trades
    const filteredTrades = useMemo(() => {
        return trades.filter(trade => {
            // Search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = 
                    trade.asset.toLowerCase().includes(query) ||
                    trade.type.toLowerCase().includes(query) ||
                    trade.trader.toLowerCase().includes(query) ||
                    trade.note.toLowerCase().includes(query) ||
                    trade.tags?.some(tag => tag.toLowerCase().includes(query));
                if (!matchesSearch) return false;
            }
            
            // Asset filter
            if (filterAsset !== 'all' && trade.asset !== filterAsset) return false;
            
            // Status filter
            if (filterStatus !== 'all' && trade.status !== filterStatus) return false;
            
            // Type filter
            if (filterType !== 'all' && trade.type !== filterType) return false;
            
            // Session filter
            if (filterSession !== 'all') {
                const session = trade.session || (() => {
                    const hour = new Date(trade.date).getUTCHours();
                    if (hour >= 0 && hour < 7) return 'ASIA';
                    if (hour >= 7 && hour < 12) return 'LONDON';
                    if (hour >= 12 && hour < 21) return 'NEWYORK';
                    return 'CLOSE';
                })();
                if (session !== filterSession) return false;
            }
            
            // Tags filter
            if (filterTags.length > 0) {
                if (!trade.tags || !filterTags.every(tag => trade.tags!.includes(tag))) return false;
            }
            
            // R:R filter
            if (trade.riskReward !== undefined) {
                if (trade.riskReward < filterRR.min || trade.riskReward > filterRR.max) return false;
            }
            
            // Confidence filter
            if (trade.confidence !== undefined) {
                if (trade.confidence < filterConfidence.min || trade.confidence > filterConfidence.max) return false;
            }
            
            // Date range filter
            if (dateRange.start || dateRange.end) {
                const tradeDate = new Date(trade.date).getTime();
                if (dateRange.start && tradeDate < new Date(dateRange.start).getTime()) return false;
                if (dateRange.end && tradeDate > new Date(dateRange.end).getTime() + 86400000) return false;
            }
            
            return true;
        });
    }, [trades, searchQuery, filterAsset, filterStatus, filterType, filterSession, filterTags, filterRR, filterConfidence, dateRange]);
    
    // Setup performance
    const setupPerformance = useMemo(() => calculateSetupPerformance(trades), [trades]);
    
    const handleAnalyzeJournal = async () => {
        if (trades.length === 0) { alert("Please log some trades first."); return; }
        setIsCoachLoading(true);
        setCoachAnalysis(null);
        const analysis = await analyzeJournal(trades);
        setCoachAnalysis(analysis);
        setIsCoachLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const submitManualEntry = () => {
        const entry: JournalEntry = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toLocaleString(),
            status: 'OPEN',
            asset: formData.asset,
            type: formData.type,
            entry: formData.entry,
            stop: formData.stop,
            target: formData.target,
            note: formData.note,
            trader: formData.trader,
            image: formData.image || undefined,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            session: formData.session,
            emotionalState: formData.emotionalState,
            marketCondition: formData.marketCondition,
            setupQuality: formData.setupQuality,
            tradeTemplate: formData.tradeTemplate,
        };
        
        // Calculate R:R if entry, stop, and target are provided
        if (formData.entry && formData.stop && formData.target) {
            const entryNum = parseFloat(formData.entry);
            const stopNum = parseFloat(formData.stop);
            const targetNum = parseFloat(formData.target);
            if (!isNaN(entryNum) && !isNaN(stopNum) && !isNaN(targetNum)) {
                const risk = Math.abs(entryNum - stopNum);
                const reward = Math.abs(targetNum - entryNum);
                if (risk > 0) {
                    entry.riskReward = reward / risk;
                }
            }
        }
        
        onAddManual(entry);
        setShowManualModal(false);
        setFormData({ 
            asset: 'EURUSD', 
            type: 'Bullish OB', 
            entry: '', 
            stop: '', 
            target: '', 
            note: '', 
            trader: TRADERS[0], 
            image: '',
            tags: [],
            session: undefined,
            emotionalState: undefined,
            marketCondition: undefined,
            setupQuality: undefined,
            tradeTemplate: undefined,
        });
    };
    
    const applyTemplate = (template: { id: string; name: string; data: Partial<JournalEntry> }) => {
        setFormData(prev => ({
            ...prev,
            asset: template.data.asset || prev.asset,
            type: template.data.type || prev.type,
            entry: template.data.entry?.toString() || prev.entry,
            stop: template.data.stop?.toString() || prev.stop,
            target: template.data.target?.toString() || prev.target,
            note: template.data.note || prev.note,
            tags: template.data.tags || prev.tags,
            session: template.data.session || prev.session,
            emotionalState: template.data.emotionalState || prev.emotionalState,
            marketCondition: template.data.marketCondition || prev.marketCondition,
            setupQuality: template.data.setupQuality || prev.setupQuality,
            tradeTemplate: template.id,
        }));
        setShowTemplateModal(false);
    };
    
    const saveAsTemplate = () => {
        const template = {
            id: Math.random().toString(36).substr(2, 9),
            name: `${formData.type} - ${formData.asset}`,
            data: {
                asset: formData.asset,
                type: formData.type,
                entry: formData.entry,
                stop: formData.stop,
                target: formData.target,
                note: formData.note,
                tags: formData.tags,
                session: formData.session,
                emotionalState: formData.emotionalState,
                marketCondition: formData.marketCondition,
                setupQuality: formData.setupQuality,
            } as Partial<JournalEntry>
        };
        const newTemplates = [...templates, template];
        setTemplates(newTemplates);
        localStorage.setItem('vadi_trade_templates', JSON.stringify(newTemplates));
        alert('Şablon kaydedildi!');
    };
    
    const toggleTradeForComparison = (tradeId: string) => {
        setSelectedTradesForComparison(prev => 
            prev.includes(tradeId) 
                ? prev.filter(id => id !== tradeId)
                : prev.length < 2 ? [...prev, tradeId] : [tradeId]
        );
    };

    const exportToCSV = () => {
        if (trades.length === 0) { alert("Dışa aktarılacak veri yok."); return; }
        
        const headers = ["Date", "Asset", "Type", "Status", "Entry", "Target", "Trader", "Note"];
        const rows = trades.map(t => [
            `"${t.date}"`, t.asset, t.type, t.status, t.entry, t.target, t.trader, `"${t.note.replace(/"/g, '""')}"`
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vadi_journal_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 bg-[#0b0e14] p-6 overflow-y-auto">
            {selectedImage && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}><img src={selectedImage} alt="Setup" className="max-w-full max-h-full rounded shadow-2xl border border-slate-700" /></div>)}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-white font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-cyan-400"/> Manuel İşlem Ekle</h3><button onClick={() => setShowManualModal(false)}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button></div>
                        <div className="space-y-3">
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => setShowTemplateModal(true)} className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-all">
                                    <Layers className="w-3 h-3" /> Şablon Seç
                                </button>
                                <button onClick={saveAsTemplate} className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-all">
                                    <Save className="w-3 h-3" /> Şablon Olarak Kaydet
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Asset</label><select value={formData.asset} onChange={e=>setFormData({...formData, asset: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option>EURUSD</option><option>GBPUSD</option><option>XAUUSD</option><option>BTCUSD</option><option>US100</option></select></div>
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Type</label><select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option>Bullish OB</option><option>Bearish OB</option><option>Bullish FVG</option><option>Bearish FVG</option></select></div>
                            </div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Trader</label><select value={formData.trader} onChange={e=>setFormData({...formData, trader: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs">{TRADERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            <div className="grid grid-cols-3 gap-2"><input placeholder="Entry" value={formData.entry} onChange={e=>setFormData({...formData, entry: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /><input placeholder="Stop" value={formData.stop} onChange={e=>setFormData({...formData, stop: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /><input placeholder="Target" value={formData.target} onChange={e=>setFormData({...formData, target: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Session</label><select value={formData.session || ''} onChange={e=>setFormData({...formData, session: e.target.value as any || undefined})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option value="">Seçiniz</option><option>ASIA</option><option>LONDON</option><option>NEWYORK</option><option>CLOSE</option></select></div>
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Setup Quality</label><select value={formData.setupQuality || ''} onChange={e=>setFormData({...formData, setupQuality: e.target.value as any || undefined})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option value="">Seçiniz</option><option>High</option><option>Medium</option><option>Low</option></select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Emotional State</label><select value={formData.emotionalState || ''} onChange={e=>setFormData({...formData, emotionalState: e.target.value as any || undefined})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option value="">Seçiniz</option><option>FOMO</option><option>Revenge</option><option>Confident</option><option>Fear</option><option>Calm</option><option>Greedy</option></select></div>
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Market Condition</label><select value={formData.marketCondition || ''} onChange={e=>setFormData({...formData, marketCondition: e.target.value as any || undefined})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option value="">Seçiniz</option><option>Trending</option><option>Ranging</option><option>Volatile</option><option>Consolidation</option></select></div>
                            </div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Etiketler (virgülle ayırın)</label><input type="text" value={formData.tags.join(', ')} onChange={e=>setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})} placeholder="Örn: High Quality, Revenge Trade" className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /></div>
                            <textarea placeholder="Notes..." value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs h-20" />
                            <div className="flex items-center justify-center w-full"><label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-[#0b0e14] hover:bg-slate-800 transition-colors"><div className="flex flex-col items-center justify-center pt-5 pb-6">{formData.image ? <span className="text-green-400 text-xs">Image Loaded</span> : <span className="text-slate-500 text-xs flex flex-col items-center"><Upload className="w-4 h-4 mb-1"/> Upload Screenshot</span>}</div><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label></div>
                            <button onClick={submitManualEntry} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded text-sm transition-colors">SAVE TRADE</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Briefcase className="w-8 h-8 text-cyan-500" /> Trading Journal</h1>
                    <div className="flex gap-2">
                         <button onClick={exportToCSV} className="flex items-center gap-2 bg-slate-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all border border-slate-600"><Download className="w-4 h-4"/> CSV Export</button>
                        <button onClick={() => setShowManualModal(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold transition-all border border-slate-600"><Plus className="w-4 h-4"/> Manuel Ekle</button>
                        <button onClick={handleAnalyzeJournal} disabled={isCoachLoading} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-900/30">{isCoachLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>} AI Koç Analizi</button>
                    </div>
                </div>
                {coachAnalysis && (<div className="mb-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 p-6 rounded-xl shadow-xl animate-in fade-in relative"><h3 className="text-purple-400 font-bold text-lg mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Coach's Feedback</h3><div className="prose prose-invert prose-sm max-w-none font-mono text-slate-300 whitespace-pre-wrap">{coachAnalysis}</div><button onClick={() => setCoachAnalysis(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button></div>)}
                
                {/* Performance Dashboard */}
                {trades.length > 0 && (
                    <div className="mb-8 bg-[#151921] border border-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-cyan-400" />
                            Performance Analytics
                        </h3>
                        <PerformanceDashboard trades={trades} />
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl"><div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Trades</div><div className="text-3xl font-mono text-white">{trades.length}</div></div>
                    <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl"><div className="text-slate-500 text-xs uppercase font-bold mb-1">Win Rate</div><div className={`text-3xl font-mono ${winRate >= 50 || isNaN(winRate) ? 'text-green-400' : 'text-red-400'}`}>{isNaN(winRate) ? '0.0' : winRate.toFixed(1)}%</div></div>
                    <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl"><div className="text-slate-500 text-xs uppercase font-bold mb-1">Open Trades</div><div className="text-3xl font-mono text-blue-400">{trades.filter(t => t.status === 'OPEN').length}</div></div>
                </div>
                {/* Filters & Search */}
                <div className="mb-6 bg-[#151921] border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-white">Filtreleme & Arama</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Ara..."
                                className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 pl-8 text-white text-xs focus:border-cyan-500 outline-none"
                            />
                        </div>
                        <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs">
                            <option value="all">Tüm Asset'ler</option>
                            <option value="EURUSD">EURUSD</option>
                            <option value="GBPUSD">GBPUSD</option>
                            <option value="XAUUSD">XAUUSD</option>
                            <option value="BTCUSD">BTCUSD</option>
                            <option value="US100">US100</option>
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs">
                            <option value="all">Tüm Durumlar</option>
                            <option value="OPEN">Açık</option>
                            <option value="WIN">Kazanç</option>
                            <option value="LOSS">Kayıp</option>
                        </select>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs">
                            <option value="all">Tüm Setup'lar</option>
                            <option value="Bullish OB">Bullish OB</option>
                            <option value="Bearish OB">Bearish OB</option>
                            <option value="Bullish FVG">Bullish FVG</option>
                            <option value="Bearish FVG">Bearish FVG</option>
                        </select>
                        <select value={filterSession} onChange={e => setFilterSession(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs">
                            <option value="all">Tüm Session'lar</option>
                            <option value="ASIA">ASIA</option>
                            <option value="LONDON">LONDON</option>
                            <option value="NEWYORK">NEWYORK</option>
                            <option value="CLOSE">CLOSE</option>
                        </select>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Min R:R" value={filterRR.min || ''} onChange={e => setFilterRR({...filterRR, min: parseFloat(e.target.value) || 0})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs w-1/2" />
                            <input type="number" placeholder="Max R:R" value={filterRR.max || ''} onChange={e => setFilterRR({...filterRR, max: parseFloat(e.target.value) || 10})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs w-1/2" />
                        </div>
                        <div className="flex gap-2">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs flex-1" />
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs flex-1" />
                        </div>
                        <button
                            onClick={() => setShowComparisonModal(true)}
                            disabled={selectedTradesForComparison.length !== 2}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-bold transition-all"
                        >
                            <GitCompare className="w-3 h-3" /> Karşılaştır ({selectedTradesForComparison.length}/2)
                        </button>
                    </div>
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Tag className="w-3 h-3" /> Etiketler:</span>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                                        filterTags.includes(tag)
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Setup Performance Stats */}
                {setupPerformance.length > 0 && (
                    <div className="mb-6 bg-[#151921] border border-slate-800 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400" /> Setup Performansı</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {setupPerformance.slice(0, 4).map(setup => (
                                <div key={setup.setupType} className="bg-[#0b0e14] border border-slate-700 rounded p-3">
                                    <div className="text-xs text-slate-400 mb-1">{setup.setupType}</div>
                                    <div className="text-lg font-mono text-white">{setup.winRate.toFixed(1)}%</div>
                                    <div className="text-[10px] text-slate-500">{setup.totalTrades} trade</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#1a1f2b]">
                        <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/> History ({filteredTrades.length}/{trades.length})</h3>
                        <div className="text-[10px] text-slate-500">Auto-Save (LocalStorage)</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#0f1219] text-xs text-slate-500 uppercase font-mono"><tr><th className="p-4">Date</th><th className="p-4">Trader</th><th className="p-4">Asset</th><th className="p-4">Setup</th><th className="p-4">Entry</th><th className="p-4">Img</th><th className="p-4">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredTrades.map(trade => (
                                    <React.Fragment key={trade.id}>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-mono text-slate-400 text-xs">{trade.date}</td>
                                        <td className="p-4"><span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded"><User className="w-3 h-3"/> {trade.trader}</span></td>
                                        <td className="p-4 font-bold text-white">{trade.asset}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${trade.type.includes('Bullish') ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>{trade.type}</span></td>
                                        <td className="p-4 font-mono text-slate-300">{Number(trade.entry).toFixed(5) || '-'}</td>
                                        <td className="p-4">{trade.image ? (<button onClick={() => setSelectedImage(trade.image!)} className="text-cyan-400 hover:text-white flex items-center gap-1 text-xs bg-cyan-900/20 px-2 py-1 rounded"><ImageIcon className="w-3 h-3"/> View</button>) : <span className="text-slate-600 text-xs">-</span>}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {trade.status !== 'OPEN' && (
                                                        <button
                                                            onClick={() => toggleTradeForComparison(trade.id)}
                                                            className={`p-1 rounded transition-all ${
                                                                selectedTradesForComparison.includes(trade.id)
                                                                    ? 'bg-purple-600 text-white'
                                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                            }`}
                                                        >
                                                            <GitCompare className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {trade.status === 'OPEN' ? (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => onUpdateTrade(trade.id, 'WIN')} className="flex items-center gap-1 bg-green-900/30 hover:bg-green-600 text-green-400 hover:text-white px-2 py-1 rounded text-xs transition-colors border border-green-900/50"><ThumbsUp className="w-3 h-3" /> W</button>
                                                            <button onClick={() => onUpdateTrade(trade.id, 'LOSS')} className="flex items-center gap-1 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded text-xs transition-colors border border-red-900/50"><ThumbsDown className="w-3 h-3" /> L</button>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${trade.status === 'WIN' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{trade.status}</span>
                                                    )}
                                                {trade.status !== 'OPEN' && (
                                                    <div className="flex gap-2">
                                                        {onReplayTrade && (
                                                            <button onClick={() => onReplayTrade(trade)} className="flex items-center gap-1 bg-cyan-900/30 hover:bg-cyan-600 text-cyan-400 hover:text-white px-2 py-1 rounded text-xs transition-colors border border-cyan-900/50">
                                                                <Play className="w-3 h-3" /> Replay
                                                            </button>
                                                        )}
                                                        {onReviewTrade && (
                                                            <button onClick={() => onReviewTrade(trade)} className="flex items-center gap-1 bg-purple-900/30 hover:bg-purple-600 text-purple-400 hover:text-white px-2 py-1 rounded text-xs transition-colors border border-purple-900/50">
                                                                <Brain className="w-3 h-3" /> AI Review
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                </div>
                                                {trade.tags && trade.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {trade.tags.map(tag => (
                                                            <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {trade.tradePlan && trade.actualExecution && (
                                            <tr>
                                                <td colSpan={7} className="p-4 bg-slate-900/30">
                                                    <TradePlanTracker trade={trade} />
                                                </td>
                                    </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400"/> Şablon Seç</h3>
                            <button onClick={() => setShowTemplateModal(false)}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {templates.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Henüz şablon yok. Şablon olarak kaydet butonunu kullanın.</div>
                            ) : (
                                templates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template)}
                                        className="w-full text-left bg-[#0b0e14] border border-slate-700 rounded p-3 hover:border-cyan-500 transition-all"
                                    >
                                        <div className="font-bold text-white text-sm">{template.name}</div>
                                        <div className="text-xs text-slate-400 mt-1">{template.data.type} - {template.data.asset}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Comparison Modal */}
            {showComparisonModal && selectedTradesForComparison.length === 2 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><GitCompare className="w-4 h-4 text-purple-400"/> Trade Karşılaştırması</h3>
                            <button onClick={() => { setShowComparisonModal(false); setSelectedTradesForComparison([]); }}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {selectedTradesForComparison.map(tradeId => {
                                const trade = trades.find(t => t.id === tradeId);
                                if (!trade) return null;
                                return (
                                    <div key={tradeId} className="bg-[#0b0e14] border border-slate-700 rounded p-4">
                                        <div className="font-bold text-white mb-3">{trade.type} - {trade.asset}</div>
                                        <div className="space-y-2 text-xs">
                                            <div><span className="text-slate-400">Tarih:</span> <span className="text-white">{trade.date}</span></div>
                                            <div><span className="text-slate-400">Durum:</span> <span className={trade.status === 'WIN' ? 'text-green-400' : 'text-red-400'}>{trade.status}</span></div>
                                            <div><span className="text-slate-400">Entry:</span> <span className="text-white">{trade.entry}</span></div>
                                            <div><span className="text-slate-400">Stop:</span> <span className="text-white">{trade.stop}</span></div>
                                            <div><span className="text-slate-400">Target:</span> <span className="text-white">{trade.target}</span></div>
                                            {trade.riskReward && <div><span className="text-slate-400">R:R:</span> <span className="text-white">{trade.riskReward.toFixed(2)}</span></div>}
                                            {trade.confidence && <div><span className="text-slate-400">Confidence:</span> <span className="text-white">{trade.confidence}/10</span></div>}
                                            {trade.pnl && <div><span className="text-slate-400">PnL:</span> <span className={trade.pnl > 0 ? 'text-green-400' : 'text-red-400'}>{trade.pnl}</span></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default JournalPage;