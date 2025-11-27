import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';

const RiskCalculator = ({ isOpen, onClose, currentPrice }: { isOpen: boolean, onClose: () => void, currentPrice: number }) => {
    const [balance, setBalance] = useState(10000);
    const [riskPercent, setRiskPercent] = useState(1);
    const [stopPips, setStopPips] = useState(10);
    
    if (!isOpen) return null;
    
    const riskAmount = balance * (riskPercent / 100);
    const lotSize = (riskAmount / (stopPips * 10)).toFixed(2); 

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in z-[60]">
            <div className="bg-[#1a1f2b] border border-slate-700 p-6 rounded-xl w-80 shadow-2xl">
                <div className="flex justify-between items-center mb-4"><h3 className="text-white font-bold flex items-center gap-2"><Calculator className="w-4 h-4 text-cyan-400"/> Risk Calculator</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button></div>
                <div className="space-y-3">
                    <div><label className="text-[10px] text-slate-400 uppercase font-bold">Balance ($)</label><input type="number" value={balance} onChange={e => setBalance(Number(e.target.value))} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none" /></div>
                    <div><label className="text-[10px] text-slate-400 uppercase font-bold">Risk (%)</label><input type="number" value={riskPercent} onChange={e => setRiskPercent(Number(e.target.value))} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none" /></div>
                    <div><label className="text-[10px] text-slate-400 uppercase font-bold">Stop Loss (Pips)</label><input type="number" value={stopPips} onChange={e => setStopPips(Number(e.target.value))} className="w-full bg-[#0b0e14] border border-slate-700 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none" /></div>
                    <div className="mt-4 bg-cyan-900/20 border border-cyan-500/30 p-3 rounded"><div className="flex justify-between text-xs text-cyan-200 mb-1"><span>Risk Amount:</span><span className="font-bold">${riskAmount}</span></div><div className="flex justify-between text-sm text-white font-bold"><span>Suggested Lot:</span><span className="text-cyan-400">{lotSize} Lots</span></div></div>
                </div>
            </div>
        </div>
    )
};
export default RiskCalculator;