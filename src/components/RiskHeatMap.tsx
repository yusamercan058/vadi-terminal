import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { OpenPosition, JournalEntry } from '../types';

interface RiskHeatMapProps {
  positions: OpenPosition[];
  trades: JournalEntry[];
  balance: number;
}

const RiskHeatMap: React.FC<RiskHeatMapProps> = ({ positions, trades, balance }) => {
  // Calculate risk by asset
  const riskByAsset = useMemo(() => {
    const riskMap = new Map<string, {
      totalRisk: number;
      exposure: number;
      positions: number;
      avgRisk: number;
    }>();

    positions.forEach(pos => {
      const risk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.lotSize * 100000; // Simplified for FX
      const exposure = pos.lotSize * pos.entryPrice * 100000; // Simplified
      
      const existing = riskMap.get(pos.asset) || {
        totalRisk: 0,
        exposure: 0,
        positions: 0,
        avgRisk: 0,
      };
      
      riskMap.set(pos.asset, {
        totalRisk: existing.totalRisk + risk,
        exposure: existing.exposure + exposure,
        positions: existing.positions + 1,
        avgRisk: 0,
      });
    });

    // Calculate average risk
    riskMap.forEach((value, key) => {
      value.avgRisk = value.totalRisk / value.positions;
    });

    return riskMap;
  }, [positions]);

  // Calculate open trades risk
  const openTradesRisk = useMemo(() => {
    return trades
      .filter(t => t.status === 'OPEN')
      .reduce((sum, t) => {
        // Estimate risk from entry/stop if available
        if (t.entry && t.stop) {
          const entry = parseFloat(t.entry);
          const stop = parseFloat(t.stop);
          if (!isNaN(entry) && !isNaN(stop)) {
            return sum + Math.abs(entry - stop) * 100000; // Simplified
          }
        }
        return sum;
      }, 0);
  }, [trades]);

  const totalRisk = Array.from(riskByAsset.values()).reduce((sum, v) => sum + v.totalRisk, 0) + openTradesRisk;
  const totalExposure = Array.from(riskByAsset.values()).reduce((sum, v) => sum + v.exposure, 0);
  const riskPercent = balance > 0 ? (totalRisk / balance) * 100 : 0;
  const exposurePercent = balance > 0 ? (totalExposure / balance) * 100 : 0;

  const getRiskColor = (risk: number) => {
    if (risk >= 5) return 'bg-red-500';
    if (risk >= 3) return 'bg-yellow-500';
    if (risk >= 1) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getRiskIntensity = (risk: number) => {
    if (risk >= 5) return 'text-red-400';
    if (risk >= 3) return 'text-yellow-400';
    if (risk >= 1) return 'text-green-400';
    return 'text-gray-400';
  };

  if (positions.length === 0 && trades.filter(t => t.status === 'OPEN').length === 0) {
    return (
      <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="text-center text-gray-400 py-4">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Açık pozisyon yok</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Risk Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${getRiskIntensity(riskPercent)}`} />
            <span className="text-xs text-gray-400 font-bold">Total Risk</span>
          </div>
          <div className={`text-2xl font-bold ${getRiskIntensity(riskPercent)}`}>
            {riskPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${totalRisk.toFixed(0)} / ${balance.toFixed(0)}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400 font-bold">Total Exposure</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {exposurePercent.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${totalExposure.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Risk by Asset Heat Map */}
      {riskByAsset.size > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Risk by Asset
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.from(riskByAsset.entries()).map(([asset, data]) => {
              const assetRiskPercent = balance > 0 ? (data.totalRisk / balance) * 100 : 0;
              
              return (
                <div
                  key={asset}
                  className={`p-3 rounded-lg border ${getRiskColor(assetRiskPercent)}/20 border-${getRiskColor(assetRiskPercent)}/50`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{asset}</span>
                    <span className={`text-xs font-bold ${getRiskIntensity(assetRiskPercent)}`}>
                      {assetRiskPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Positions:</span>
                      <span className="text-white">{data.positions}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Risk:</span>
                      <span className="text-white">${data.totalRisk.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Exposure:</span>
                      <span className="text-white">${data.exposure.toFixed(0)}</span>
                    </div>
                  </div>
                  
                  {/* Risk Bar */}
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getRiskColor(assetRiskPercent)} transition-all`}
                      style={{ width: `${Math.min(100, assetRiskPercent * 10)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open Trades Risk */}
      {trades.filter(t => t.status === 'OPEN').length > 0 && (
        <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">Open Journal Trades</span>
          </div>
          <div className="text-sm text-white">
            {trades.filter(t => t.status === 'OPEN').length} açık işlem
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Tahmini risk: ${openTradesRisk.toFixed(0)}
          </div>
        </div>
      )}

      {/* Risk Warnings */}
      {riskPercent >= 5 && (
        <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm font-bold text-red-400">Yüksek Risk Uyarısı</span>
          </div>
          <p className="text-xs text-gray-300 mt-1">
            Toplam risk %5'i aştı. Pozisyon boyutlarını gözden geçirin.
          </p>
        </div>
      )}
    </div>
  );
};

export default RiskHeatMap;

