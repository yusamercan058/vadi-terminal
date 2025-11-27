import React, { useState } from 'react';
import { ShieldAlert, Timer, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { PROP_DATA } from '../constants';

const PropFirmPage = () => {
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [firms, setFirms] = useState(PROP_DATA.sort(() => 0.5 - Math.random()));
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshData = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setFirms([...PROP_DATA].sort(() => 0.5 - Math.random()));
            setLastUpdated(new Date().toLocaleTimeString());
            setIsRefreshing(false);
        }, 1500);
    };

    return (
        <div className="flex-1 bg-[#0b0e14] p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-purple-500" /> Prop Firm Radar
                        </h1>
                        <p className="text-slate-400 text-sm">Real-time proprietary trading firm discounts, rules, and allocation opportunities.</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <button onClick={refreshData} className="text-[10px] flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-all">
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} /> Check Updates
                        </button>
                        <span className="text-[9px] text-slate-500 font-mono">Last Check: {lastUpdated}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {firms.map((prop, i) => (
                        <div key={i} className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-[#1a1f2b]">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{prop.logo}</span>
                                    <div>
                                        <h3 className="font-bold text-white">{prop.name}</h3>
                                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{prop.type}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1"><Timer className="w-3 h-3"/> Ends In</div>
                                    <div className="text-xs font-mono text-red-400 font-bold">{prop.endsIn}</div>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-center bg-green-900/10 p-3 rounded border border-green-900/30">
                                    <span className="text-green-400 font-bold text-sm">{prop.discount}</span>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-black/50 text-slate-300 px-2 py-1 rounded text-xs font-mono border border-slate-700">{prop.code}</code>
                                        <button className="text-xs text-slate-500 hover:text-white"><Copy className="w-3 h-3"/></button>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Max Allocation:</span>
                                    <span className="text-white font-bold">{prop.maxAlloc}</span>
                                </div>
                                <button className="w-full mt-2 bg-slate-800 hover:bg-purple-600 text-white py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-purple-900/20">
                                    Visit Firm <ExternalLink className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
export default PropFirmPage;