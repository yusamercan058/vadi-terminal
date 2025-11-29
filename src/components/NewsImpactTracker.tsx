import React, { useMemo } from 'react';
import { Newspaper, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { FXNews } from '../types';
import { Candle } from '../types';
import { calculateNewsImpact } from '../services/newsImpactService';
import { NewsImpact } from '../types/newsImpact';

interface NewsImpactTrackerProps {
  news: FXNews[];
  candles: Candle[];
  symbol: string;
}

const NewsImpactTracker: React.FC<NewsImpactTrackerProps> = ({ news, candles, symbol }) => {
  const impacts = useMemo(() => {
    return news
      .filter(n => n.impact === 'HIGH')
      .map(n => {
        const newsTime = new Date(n.time);
        const impact = calculateNewsImpact(newsTime, candles, symbol);
        return impact ? { ...impact, newsTitle: n.title, newsCurrency: n.currency } : null;
      })
      .filter((i): i is NewsImpact & { newsTitle: string; newsCurrency: string } => i !== null)
      .slice(0, 10); // Last 10 high-impact news
  }, [news, candles, symbol]);

  if (impacts.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-white">News Impact Analysis</span>
      </div>

      <div className="space-y-3">
        {impacts.map((impact, idx) => (
          <div key={idx} className="bg-slate-900/50 rounded p-3 border border-slate-700">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs font-bold text-white mb-1">{impact.newsTitle}</div>
                <div className="text-[10px] text-gray-400">{impact.newsCurrency}</div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                impact.movementDirection === 'UP' 
                  ? 'bg-green-500/20 text-green-400' 
                  : impact.movementDirection === 'DOWN'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {impact.movementDirection === 'UP' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : impact.movementDirection === 'DOWN' ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                <span className="text-xs font-bold">
                  {impact.priceChangePercent > 0 ? '+' : ''}{impact.priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div>
                <div className="text-gray-400">Impact Score</div>
                <div className="text-white font-bold">{impact.impactScore}/100</div>
              </div>
              <div>
                <div className="text-gray-400">Max Move</div>
                <div className="text-white font-mono">{impact.maxMove.toFixed(5)}</div>
              </div>
              <div>
                <div className="text-gray-400">Time to Max</div>
                <div className="text-white font-mono">{impact.timeToMaxMove}m</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsImpactTracker;

