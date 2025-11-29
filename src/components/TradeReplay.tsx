import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';
import { JournalEntry, Candle } from '../types';

interface TradeReplayProps {
  trade: JournalEntry;
  candles: Candle[];
  onClose: () => void;
}

const TradeReplay: React.FC<TradeReplayProps> = ({ trade, candles, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const entryPrice = parseFloat(trade.entry);
  const stopPrice = trade.stop ? parseFloat(trade.stop) : null;
  const targetPrice = trade.target ? parseFloat(trade.target) : null;
  const exitPrice = trade.exitPrice;

  // Find entry candle index
  const entryIndex = candles.findIndex(c => {
    const tradeTime = new Date(trade.date).getTime();
    return c.time >= tradeTime;
  });

  const relevantCandles = entryIndex >= 0 
    ? candles.slice(Math.max(0, entryIndex - 20), candles.length)
    : candles.slice(-30);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-cyan-400" />
            Trade Replay: {trade.asset}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trade Info */}
        <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-slate-800/50 rounded">
          <div>
            <div className="text-xs text-gray-400">Entry</div>
            <div className="text-sm font-mono text-white">{entryPrice.toFixed(5)}</div>
          </div>
          {stopPrice && (
            <div>
              <div className="text-xs text-gray-400">Stop</div>
              <div className="text-sm font-mono text-red-400">{stopPrice.toFixed(5)}</div>
            </div>
          )}
          {targetPrice && (
            <div>
              <div className="text-xs text-gray-400">Target</div>
              <div className="text-sm font-mono text-green-400">{targetPrice.toFixed(5)}</div>
            </div>
          )}
          {exitPrice && (
            <div>
              <div className="text-xs text-gray-400">Exit</div>
              <div className="text-sm font-mono text-cyan-400">{exitPrice.toFixed(5)}</div>
            </div>
          )}
        </div>

        {/* Chart Visualization */}
        <div className="bg-slate-900 rounded p-4 mb-4 h-64 relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Chart visualization would go here
            <br />
            <span className="text-xs">Entry: {entryPrice.toFixed(5)} | Status: {trade.status}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            className="p-2 bg-slate-800 rounded hover:bg-slate-700"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-cyan-600 rounded hover:bg-cyan-700"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(relevantCandles.length - 1, currentIndex + 1))}
            className="p-2 bg-slate-800 rounded hover:bg-slate-700"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeReplay;

