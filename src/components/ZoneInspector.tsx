import React, { useState } from 'react';
import { Crosshair, Lock, X, MessageSquare } from 'lucide-react';
import { SMCZone, MarketBias } from '../types';
import ZoneFeedbackModal from './ZoneFeedbackModal';

const ZoneInspector = ({ 
  zone, 
  onClose, 
  marketBias = null,
  aiConfidence = 0
}: { 
  zone: SMCZone, 
  onClose: () => void,
  marketBias?: MarketBias | null,
  aiConfidence?: number
}) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    if (!zone) return null;
    const risk = Math.abs(zone.priceTop - zone.priceBottom);
    const entry = zone.type.includes('Bullish') ? zone.priceTop : zone.priceBottom;
    const stop = zone.type.includes('Bullish') ? zone.priceBottom - (risk * 0.1) : zone.priceTop + (risk * 0.1);
    const target = zone.type.includes('Bullish') ? entry + (risk * 3) : entry - (risk * 3);

    return (
        <>
            <div className="bg-[#1a1f2b] border border-cyan-500/50 p-4 rounded-xl shadow-2xl w-full">
                <div className="flex justify-between items-start mb-3">
                    <div><h4 className="text-cyan-400 font-bold text-sm flex items-center gap-2"><Crosshair className="w-4 h-4" /> BÖLGE İNCELEME</h4><span className="text-[10px] text-slate-400 uppercase">{zone.type}</span></div>
                    <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white"/></button>
                </div>
                <div className="mb-3 bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1"><Lock className="w-3 h-3"/> GİRİŞ ONAY LİSTESİ</div>
                    <ul className="text-[10px] text-slate-300 space-y-1">
                        <li className="flex items-center gap-1">{zone.score >= 50 ? '✅' : '❌'} Yüksek Puan ({zone.score})</li>
                        <li className="flex items-center gap-1">{zone.confluence.some(c => c.includes('Trend')) ? '✅' : '❌'} Trend Yönünde</li>
                        <li className="flex items-center gap-1">{zone.confluence.some(c => c.includes('Likidite') || c.includes('Sweep')) ? '✅' : '❌'} Likidite Alımı</li>
                        <li className="flex items-center gap-1">{zone.confluence.some(c => c.includes('Inducement')) ? '✅' : '❌'} Inducement (Tuzak)</li>
                    </ul>
                </div>
                <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-1"><span className="text-slate-400">Giriş:</span><span className="text-white font-bold">{entry.toFixed(5)}</span></div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-1"><span className="text-slate-400">Stop:</span><span className="text-red-400 font-bold">{stop.toFixed(5)}</span></div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-1"><span className="text-slate-400">Hedef (1:3):</span><span className="text-green-400 font-bold">{target.toFixed(5)}</span></div>
                </div>

                {/* Feedback Button */}
                <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="w-full mt-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-400 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                >
                    <MessageSquare className="w-4 h-4" />
                    Zone Feedback Ver
                </button>
            </div>

            {/* Feedback Modal */}
            <ZoneFeedbackModal
                zone={zone}
                marketBias={marketBias}
                aiConfidence={aiConfidence}
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
            />
        </>
    );
};
export default ZoneInspector;