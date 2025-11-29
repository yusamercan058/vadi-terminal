import React, { useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { JournalEntry } from '../types';
import { calculateSessionPerformance, calculateHourlyPerformance } from '../services/sessionAnalyticsService';
import { SessionPerformance, HourlyPerformance } from '../types/sessionAnalytics';

interface SessionAnalyticsProps {
  trades: JournalEntry[];
}

const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({ trades }) => {
  const sessionPerformance = useMemo(() => calculateSessionPerformance(trades), [trades]);
  const hourlyPerformance = useMemo(() => calculateHourlyPerformance(trades), [trades]);

  const getSessionColor = (session: string) => {
    switch (session) {
      case 'LONDON': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'NEWYORK': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'ASIA': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Performance */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Session Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {sessionPerformance.map((session, idx) => (
            <div key={idx} className={`p-4 rounded-lg border ${getSessionColor(session.session)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase">{session.session}</span>
                {session.winRate >= 60 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {session.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Trades: {session.totalTrades}</div>
                <div>P.Factor: {session.profitFactor.toFixed(2)}</div>
                <div>Avg R:R: 1:{session.averageRR.toFixed(2)}</div>
                <div>Best Hour: {session.bestHour}:00</div>
                <div>Avg Hold: {session.avgHoldingTime.toFixed(0)}m</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Performance Heatmap */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Hourly Performance
        </h3>
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 24 }, (_, hour) => {
            const hourData = hourlyPerformance.find(h => h.hour === hour);
            const winRate = hourData?.winRate || 0;
            const intensity = Math.min(100, winRate);
            
            return (
              <div
                key={hour}
                className="p-2 rounded border border-slate-700 text-center"
                style={{
                  backgroundColor: `rgba(34, 197, 94, ${intensity / 100})`,
                }}
                title={`${hour}:00 - WR: ${winRate.toFixed(1)}%, Trades: ${hourData?.totalTrades || 0}`}
              >
                <div className="text-[10px] font-bold text-white">{hour}</div>
                <div className="text-[8px] text-gray-300">{winRate.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>0:00</span>
          <span>12:00</span>
          <span>23:00</span>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalytics;

