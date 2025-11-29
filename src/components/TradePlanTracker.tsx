import React from 'react';
import { Target, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { JournalEntry } from '../types';
import { comparePlanVsActual, calculatePlanDeviation } from '../services/tradePlanService';

interface TradePlanTrackerProps {
  trade: JournalEntry;
}

const TradePlanTracker: React.FC<TradePlanTrackerProps> = ({ trade }) => {
  if (!trade.tradePlan || !trade.actualExecution) {
    return null;
  }

  const comparison = comparePlanVsActual(trade);
  const deviation = calculatePlanDeviation(trade);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold text-white">Trade Plan vs Actual</span>
        <span className={`text-xs px-2 py-1 rounded ${
          comparison.overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
          comparison.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {comparison.overallScore}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Entry */}
        <div>
          <div className="text-gray-400 mb-1">Entry</div>
          <div className="flex items-center gap-2">
            {comparison.entryMatch ? (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            ) : (
              <XCircle className="w-3 h-3 text-red-400" />
            )}
            <div>
              <div className="text-white font-mono">
                Plan: {trade.tradePlan.entry.toFixed(5)}
              </div>
              <div className="text-gray-400 font-mono">
                Actual: {parseFloat(trade.actualExecution.entry.toString()).toFixed(5)}
              </div>
            </div>
          </div>
        </div>

        {/* Stop */}
        <div>
          <div className="text-gray-400 mb-1">Stop Loss</div>
          <div className="flex items-center gap-2">
            {comparison.stopMatch ? (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            ) : (
              <XCircle className="w-3 h-3 text-red-400" />
            )}
            <div>
              <div className="text-white font-mono">
                Plan: {trade.tradePlan.stop.toFixed(5)}
              </div>
              <div className="text-gray-400 font-mono">
                Actual: {parseFloat(trade.actualExecution.stop.toString()).toFixed(5)}
              </div>
            </div>
          </div>
        </div>

        {/* Target */}
        <div>
          <div className="text-gray-400 mb-1">Target</div>
          <div className="flex items-center gap-2">
            {comparison.targetMatch ? (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            ) : (
              <XCircle className="w-3 h-3 text-red-400" />
            )}
            <div>
              <div className="text-white font-mono">
                Plan: {trade.tradePlan.target.toFixed(5)}
              </div>
              {trade.actualExecution.target && (
                <div className="text-gray-400 font-mono">
                  Actual: {parseFloat(trade.actualExecution.target.toString()).toFixed(5)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lot Size */}
        <div>
          <div className="text-gray-400 mb-1">Lot Size</div>
          <div className="flex items-center gap-2">
            {comparison.lotMatch ? (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            ) : (
              <XCircle className="w-3 h-3 text-red-400" />
            )}
            <div>
              <div className="text-white font-mono">
                Plan: N/A
              </div>
              <div className="text-gray-400 font-mono">
                Actual: N/A
              </div>
            </div>
          </div>
        </div>
      </div>

      {deviation > 5 && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Deviation: {deviation.toFixed(1)}% from plan
          </span>
        </div>
      )}

      {trade.tradePlan.reasoning && (
        <div className="mt-3 p-2 bg-slate-700/50 rounded text-xs">
          <div className="text-gray-400 mb-1">Plan Reasoning:</div>
          <div className="text-gray-300">{trade.tradePlan.reasoning}</div>
        </div>
      )}
    </div>
  );
};

export default TradePlanTracker;

