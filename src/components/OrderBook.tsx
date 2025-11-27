import React from 'react';

const OrderBook = ({ price }: { price: number }) => {
    const generateLevel = (basePrice: number, type: 'bid' | 'ask', i: number) => {
        const offset = i * 0.0005;
        const p = type === 'ask' ? basePrice + offset : basePrice - offset;
        const size = Math.floor(Math.random() * 50) + 10;
        const width = Math.min((size / 60) * 100, 100);
        return { p: p.toFixed(5), size, width };
    };
    return (
        <div className="flex flex-col h-full text-[10px] font-mono">
            <div className="flex-1 overflow-hidden flex flex-col-reverse">
                {[...Array(8)].map((_, i) => {
                    const level = generateLevel(price || 1.0850, 'ask', i + 1);
                    return (<div key={i} className="flex justify-between items-center px-2 py-0.5 relative"><div className="absolute right-0 top-0 bottom-0 bg-red-900/20 transition-all duration-500" style={{ width: `${level.width}%` }}></div><span className="text-red-400 z-10">{level.p}</span><span className="text-slate-400 z-10">{level.size}</span></div>)
                })}
            </div>
            <div className="bg-[#1a1f2b] py-1 text-center font-bold text-white border-y border-slate-700">{(price || 1.0850).toFixed(5)}</div>
            <div className="flex-1 overflow-hidden">
                {[...Array(8)].map((_, i) => {
                    const level = generateLevel(price || 1.0850, 'bid', i + 1);
                    return (<div key={i} className="flex justify-between items-center px-2 py-0.5 relative"><div className="absolute right-0 top-0 bottom-0 bg-green-900/20 transition-all duration-500" style={{ width: `${level.width}%` }}></div><span className="text-green-400 z-10">{level.p}</span><span className="text-slate-400 z-10">{level.size}</span></div>)
                })}
            </div>
        </div>
    )
};
export default OrderBook;