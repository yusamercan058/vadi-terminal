import React, { useState, useEffect } from 'react';
import { Activity, ScanEye, Microscope, ChevronUp, ChevronDown, CheckCircle2, XCircle, Timer, Zap } from 'lucide-react';
import { MarketBias } from '../types';

const AiChartHud = ({ bias, activeCount }: { bias: MarketBias | null, activeCount: number }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [timeToNextSession, setTimeToNextSession] = useState('');
    const [currentSessionName, setCurrentSessionName] = useState('');

    useEffect(() => {
        const updateSessionInfo = () => {
            const now = new Date();
            const hour = now.getUTCHours();
            // Simple Session Logic (UTC)
            let nextEvent = 0;
            let session = '';
            
            if (hour >= 0 && hour < 7) { session = 'ASIA'; nextEvent = 7; }
            else if (hour >= 7 && hour < 12) { session = 'LONDON'; nextEvent = 12; }
            else if (hour >= 12 && hour < 21) { session = 'NEW YORK'; nextEvent = 21; }
            else { session = 'MARKET CLOSE'; nextEvent = 24; }
            
            setCurrentSessionName(session);
            
            const nextTime = new Date(now);
            nextTime.setUTCHours(nextEvent, 0, 0, 0);
            if (nextEvent === 24) nextTime.setUTCDate(now.getUTCDate() + 1);
            
            const diff = nextTime.getTime() - now.getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeToNextSession(`${h}s ${m}dk`);
        };

        const timer = setInterval(updateSessionInfo, 60000);
        updateSessionInfo();
        return () => clearInterval(timer);
    }, []);

    if (!bias) return null;

    // Calculate Bias Strength (0-100)
    let strength = 50;
    const direction = bias.trend === 'Bullish' ? 1 : -1;
    
    // MTF Impact
    if (bias.mtf.m15 === bias.trend) strength += (10 * direction);
    if (bias.mtf.h1 === bias.trend) strength += (10 * direction);
    if (bias.mtf.h4 === bias.trend) strength += (10 * direction);
    
    // Volatility Impact
    if (bias.volatility === 'HIGH') strength += (5 * direction);
    
    // SMT Impact
    if (bias.smtDivergence !== 'None') {
        const smtDir = bias.smtDivergence.includes('Bullish') ? 1 : -1;
        strength += (15 * smtDir);
    }

    // Clamp
    strength = Math.min(95, Math.max(5, strength));

    // Checklist Items
    const checklist = [
        { label: 'Trend Uyumu', status: bias.mtf.h1 === bias.trend, icon: Zap },
        { label: 'Yapı (BOS)', status: bias.structure === 'BOS', icon: Activity },
        { label: 'Volatilite', status: bias.volatility === 'HIGH', icon: Activity },
        { label: 'SMT Onayı', status: bias.smtDivergence !== 'None', icon: Microscope },
    ];

    return (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 animate-in fade-in slide-in-from-right-8 duration-700 pointer-events-none select-none">
            <div className="bg-black/90 backdrop-blur-md border border-slate-700 rounded-xl w-72 shadow-2xl pointer-events-auto overflow-hidden">
                {/* HEADER */}
                <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-[#151921]">
                    <div className="flex items-center gap-2">
                        <div className="bg-cyan-500/20 p-1 rounded">
                             <ScanEye className="w-4 h-4 text-cyan-400 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white leading-none">AI KOKPİT</h3>
                            <span className="text-[9px] text-slate-500 font-mono">vadi.ai-engine</span>
                        </div>
                    </div>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-500 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* CONTENT */}
                {isExpanded && (
                    <div className="p-3 space-y-4">
                        
                        {/* 1. BIAS METER */}
                        <div>
                            <div className="flex justify-between text-[10px] mb-1 font-bold">
                                <span className="text-red-400">BEARISH</span>
                                <span className="text-slate-400">{Math.abs(strength - 50) * 2}% GÜÇ</span>
                                <span className="text-green-400">BULLISH</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-600 to-transparent w-1/2 opacity-50"></div>
                                <div className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-green-600 to-transparent w-1/2 opacity-50"></div>
                                
                                {/* Marker */}
                                <div 
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-1000 ease-out"
                                    style={{ left: `${strength}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* 2. SESSION & INFO */}
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-800/50 rounded border border-slate-700 p-2 text-center">
                                <span className="text-[9px] text-slate-400 block mb-0.5">OTURUM</span>
                                <span className="text-xs font-bold text-cyan-300">{currentSessionName}</span>
                            </div>
                            <div className="flex-1 bg-slate-800/50 rounded border border-slate-700 p-2 text-center">
                                <span className="text-[9px] text-slate-400 block mb-0.5">DEĞİŞİM</span>
                                <span className="text-xs font-mono font-bold text-white flex items-center justify-center gap-1">
                                    <Timer className="w-3 h-3"/> {timeToNextSession}
                                </span>
                            </div>
                        </div>

                        {/* 3. LIVE CHECKLIST */}
                        <div className="grid grid-cols-2 gap-2">
                            {checklist.map((item, i) => (
                                <div key={i} className={`flex items-center gap-2 p-1.5 rounded border ${item.status ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                                    {item.status ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                    <span className={`text-[10px] font-bold ${item.status ? 'text-green-400' : 'text-red-400'}`}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                        
                        {/* 4. AI ANALYSIS TEXT */}
                         <div className="pt-2 border-t border-slate-800">
                            <p className="text-[10px] text-slate-300 font-mono leading-relaxed opacity-80">
                                {bias.isNewsLocked ? "⚠️ HABER KİLİDİ AKTİF. İŞLEM YOK." : 
                                 `ATR (${bias.atrValue.toFixed(4)}) normal. ${bias.premiumDiscount} bölgesindeyiz. ${bias.structure} yapısı korunuyor.`}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* WIN RATE BADGE */}
            <div className={`bg-black/90 backdrop-blur border ${bias.winRate > 50 ? 'border-green-500/30' : 'border-red-500/30'} p-2 rounded-lg flex items-center justify-between shadow-xl w-72 pointer-events-auto`}>
                 <span className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                    <Microscope className="w-3 h-3 text-purple-400"/>
                    STRATEJİ SKORU
                 </span>
                 <span className={`text-xs font-mono font-bold ${bias.winRate > 60 ? 'text-green-400' : 'text-orange-400'}`}>
                    %{bias.winRate.toFixed(1)}
                 </span>
            </div>
        </div>
    );
};

export default AiChartHud;