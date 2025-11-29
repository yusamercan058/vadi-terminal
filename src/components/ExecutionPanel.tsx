import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Ban } from 'lucide-react';

interface ExecutionPanelProps {
    price: number;
    onExecute: (type: 'BUY' | 'SELL', lot: number, sl: number, tp: number) => void;
    isLocked: boolean;
    reason?: string;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ price, onExecute, isLocked, reason }) => {
    const [lot, setLot] = useState(1.0);
    const [sl, setSl] = useState<string>('');
    const [tp, setTp] = useState<string>('');

    useEffect(() => {
        if (!sl && price > 0) setSl((price - 0.0020).toFixed(5));
        if (!tp && price > 0) setTp((price + 0.0060).toFixed(5));
    }, [price]);

    if (isLocked) {
        return (
            <div className="bg-red-900/10 border border-red-900/50 p-4 rounded flex flex-col items-center justify-center text-center h-32 animate-in fade-in">
                <Ban className="w-8 h-8 text-red-500 mb-2" />
                <h3 className="text-red-400 font-bold text-xs">İŞLEM KİLİTLENDİ</h3>
                <p className="text-[9px] text-red-300 mt-1">{reason}</p>
            </div>
        )
    }

    return (
        <div className="bg-[#1a1f2b] p-3 rounded border border-slate-700 mt-2 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500"/> HIZLI İŞLEM</span>
                <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-slate-700">
                    <span className="text-[10px] text-slate-500">Lot:</span>
                    <input type="number" value={lot} onChange={e=>setLot(Number(e.target.value))} className="w-8 bg-transparent text-white text-[10px] outline-none text-right font-mono" step={0.1}/>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500">SL</label>
                    <input type="number" value={sl} onChange={e=>setSl(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded p-1 text-[10px] text-red-400 font-mono" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500">TP</label>
                    <input type="number" value={tp} onChange={e=>setTp(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded p-1 text-[10px] text-green-400 font-mono" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onExecute('SELL', lot, Number(sl), Number(tp))} className="bg-red-900/40 hover:bg-red-600 border border-red-900/50 text-red-200 hover:text-white py-2 rounded text-xs font-bold transition-all flex flex-col items-center shadow-lg">
                    <span>SELL</span>
                    <span className="text-[9px] opacity-70 font-mono">{(price).toFixed(5)}</span>
                </button>
                <button onClick={() => onExecute('BUY', lot, Number(sl), Number(tp))} className="bg-green-900/40 hover:bg-green-600 border border-green-900/50 text-green-200 hover:text-white py-2 rounded text-xs font-bold transition-all flex flex-col items-center shadow-lg">
                    <span>BUY</span>
                    <span className="text-[9px] opacity-70 font-mono">{(price + 0.00002).toFixed(5)}</span>
                </button>
            </div>
        </div>
    )
}

export default React.memo(ExecutionPanel);