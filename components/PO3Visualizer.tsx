import React from 'react';

const PO3Visualizer = ({ phase, openPrice, currentPrice }: { phase: string, openPrice: number, currentPrice: number }) => {
    const isAbove = currentPrice > openPrice;
    return (
        <div className="bg-[#1a1f2b] p-3 rounded border border-slate-700 mb-3 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400">DAILY PO3 CYCLE</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${phase === 'Manipulation' ? 'bg-purple-900/50 text-purple-400' : phase === 'Distribution' ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                    {phase}
                </span>
            </div>
            <div className="relative h-12 w-full bg-slate-900/50 rounded border border-slate-800 flex items-center justify-center">
                <div className="absolute w-full h-px bg-slate-500 top-1/2 flex items-center justify-end pr-1">
                    <span className="text-[8px] text-slate-500 -mt-4">Midnight Open</span>
                </div>
                <div className={`absolute h-3 w-3 rounded-full border-2 border-black shadow-lg transition-all duration-1000 ${isAbove ? 'bg-green-500 -translate-y-3' : 'bg-red-500 translate-y-3'}`} style={{ left: '70%' }}></div>
                <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
                    <path d="M0,50 Q20,50 30,80 T60,20 T100,50" fill="none" stroke="currentColor" strokeWidth="2" className={isAbove ? "text-green-500" : "text-red-500"} />
                </svg>
            </div>
        </div>
    )
}
export default PO3Visualizer;