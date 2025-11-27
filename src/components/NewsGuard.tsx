import React from 'react';
import { ShieldAlert, ShieldBan } from 'lucide-react';

const NewsGuard = ({ isLocked, timeToNews }: { isLocked: boolean, timeToNews: string }) => {
    return (
        <div className={`flex flex-col p-3 rounded border transition-all ${isLocked ? 'bg-red-900/20 border-red-500/50' : 'bg-[#1a1f2b] border-slate-700'}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    {isLocked ? <ShieldBan className="w-3 h-3 text-red-500"/> : <ShieldAlert className="w-3 h-3 text-yellow-500"/>} 
                    HABER KORUMASI
                </span>
                {isLocked && <span className="text-[9px] text-red-400 font-bold animate-pulse">KİLİTLİ</span>}
            </div>
            <div className="flex justify-between items-center">
                <div className="text-[9px] text-slate-500">Kalan Süre:</div>
                <div className={`text-xs font-mono font-bold ${isLocked ? 'text-red-400' : 'text-slate-300'}`}>
                    {timeToNews}
                </div>
            </div>
        </div>
    )
}
export default NewsGuard;