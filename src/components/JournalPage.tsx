import React, { useState } from 'react';
import { Briefcase, Plus, BrainCircuit, Loader2, Sparkles, X, User, Upload, Image as ImageIcon, ThumbsUp, ThumbsDown, FileText, Download } from 'lucide-react';
import { JournalEntry } from '../types';
import { TRADERS } from '../constants';
import { analyzeJournal } from '../services/geminiService';

interface JournalPageProps {
    trades: JournalEntry[];
    onUpdateTrade: (id: string, status: 'WIN' | 'LOSS') => void;
    onAddManual: (entry: JournalEntry) => void;
}

const JournalPage: React.FC<JournalPageProps> = ({ trades, onUpdateTrade, onAddManual }) => {
    const [coachAnalysis, setCoachAnalysis] = useState<string | null>(null);
    const [isCoachLoading, setIsCoachLoading] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [formData, setFormData] = useState({ asset: 'EURUSD', type: 'Bullish OB', entry: '', stop: '', target: '', note: '', trader: TRADERS[0], image: '' });

    const winRate = trades.length > 0 ? (trades.filter(t => t.status === 'WIN').length / trades.filter(t => t.status !== 'OPEN').length) * 100 : 0;
    
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
        onAddManual({ id: Math.random().toString(36).substr(2, 9), date: new Date().toLocaleString(), status: 'OPEN', ...formData });
        setShowManualModal(false);
        setFormData({ asset: 'EURUSD', type: 'Bullish OB', entry: '', stop: '', target: '', note: '', trader: TRADERS[0], image: '' });
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
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Asset</label><select value={formData.asset} onChange={e=>setFormData({...formData, asset: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option>EURUSD</option><option>GBPUSD</option><option>XAUUSD</option><option>BTCUSD</option><option>ETHUSD</option></select></div>
                                <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Type</label><select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs"><option>Bullish OB</option><option>Bearish OB</option><option>Bullish FVG</option><option>Bearish FVG</option></select></div>
                            </div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Trader</label><select value={formData.trader} onChange={e=>setFormData({...formData, trader: e.target.value})} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs">{TRADERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            <div className="grid grid-cols-3 gap-2"><input placeholder="Entry" value={formData.entry} onChange={e=>setFormData({...formData, entry: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /><input placeholder="Stop" value={formData.stop} onChange={e=>setFormData({...formData, stop: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /><input placeholder="Target" value={formData.target} onChange={e=>setFormData({...formData, target: e.target.value})} className="bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-xs" /></div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl"><div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Trades</div><div className="text-3xl font-mono text-white">{trades.length}</div></div>
                    <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl"><div className="text-slate-500 text-xs uppercase font-bold mb-1">Win Rate</div><div className={`text-3xl font-mono ${winRate >= 50 || isNaN(winRate) ? 'text-green-400' : 'text-red-400'}`}>{isNaN(winRate) ? '0.0' : winRate.toFixed(1)}%</div></div>
                    <div className="bg-[#151921] border border-slate-800 p-4 rounded-xl"><div className="text-slate-500 text-xs uppercase font-bold mb-1">Open Trades</div><div className="text-3xl font-mono text-blue-400">{trades.filter(t => t.status === 'OPEN').length}</div></div>
                </div>
                <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#1a1f2b]"><h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/> History</h3><div className="text-[10px] text-slate-500">Auto-Save (LocalStorage)</div></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#0f1219] text-xs text-slate-500 uppercase font-mono"><tr><th className="p-4">Date</th><th className="p-4">Trader</th><th className="p-4">Asset</th><th className="p-4">Setup</th><th className="p-4">Entry</th><th className="p-4">Img</th><th className="p-4">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {trades.map(trade => (
                                    <tr key={trade.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-mono text-slate-400 text-xs">{trade.date}</td>
                                        <td className="p-4"><span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded"><User className="w-3 h-3"/> {trade.trader}</span></td>
                                        <td className="p-4 font-bold text-white">{trade.asset}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${trade.type.includes('Bullish') ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>{trade.type}</span></td>
                                        <td className="p-4 font-mono text-slate-300">{Number(trade.entry).toFixed(5) || '-'}</td>
                                        <td className="p-4">{trade.image ? (<button onClick={() => setSelectedImage(trade.image!)} className="text-cyan-400 hover:text-white flex items-center gap-1 text-xs bg-cyan-900/20 px-2 py-1 rounded"><ImageIcon className="w-3 h-3"/> View</button>) : <span className="text-slate-600 text-xs">-</span>}</td>
                                        <td className="p-4">{trade.status === 'OPEN' ? (<div className="flex gap-2"><button onClick={() => onUpdateTrade(trade.id, 'WIN')} className="flex items-center gap-1 bg-green-900/30 hover:bg-green-600 text-green-400 hover:text-white px-2 py-1 rounded text-xs transition-colors border border-green-900/50"><ThumbsUp className="w-3 h-3" /> W</button><button onClick={() => onUpdateTrade(trade.id, 'LOSS')} className="flex items-center gap-1 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded text-xs transition-colors border border-red-900/50"><ThumbsDown className="w-3 h-3" /> L</button></div>) : (<span className={`text-xs font-bold px-2 py-1 rounded ${trade.status === 'WIN' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{trade.status}</span>)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default JournalPage;