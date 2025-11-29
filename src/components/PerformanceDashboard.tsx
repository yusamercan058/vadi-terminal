import React, { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Target, BarChart3, 
  Award, Percent, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Shield
} from 'lucide-react';
import { JournalEntry, PerformanceMetrics, SetupPerformance } from '../types';
import { calculatePerformanceMetrics, calculateSetupPerformance, calculateEquityCurve } from '../services/performanceService';

interface PerformanceDashboardProps {
  trades: JournalEntry[];
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ trades }) => {
  const metrics = useMemo(() => calculatePerformanceMetrics(trades), [trades]);
  const setupPerformance = useMemo(() => calculateSetupPerformance(trades), [trades]);
  const equityCurve = useMemo(() => calculateEquityCurve(trades), [trades]);

  const getMetricColor = (value: number, isPositive: boolean = true) => {
    if (isPositive) {
      if (value >= 70) return 'text-green-400';
      if (value >= 50) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value <= 20) return 'text-green-400';
      if (value <= 40) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getMetricBgColor = (value: number, isPositive: boolean = true) => {
    if (isPositive) {
      if (value >= 70) return 'bg-green-500/20 border-green-500/50';
      if (value >= 50) return 'bg-yellow-500/20 border-yellow-500/50';
      return 'bg-red-500/20 border-red-500/50';
    } else {
      if (value <= 20) return 'bg-green-500/20 border-green-500/50';
      if (value <= 40) return 'bg-yellow-500/20 border-yellow-500/50';
      return 'bg-red-500/20 border-red-500/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Win Rate */}
        <div className={`p-4 rounded-lg border ${getMetricBgColor(metrics.winRate)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Win Rate</span>
            </div>
            <TrendingUp className={`w-4 h-4 ${getMetricColor(metrics.winRate)}`} />
          </div>
          <div className={`text-2xl font-bold ${getMetricColor(metrics.winRate)}`}>
            {metrics.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className={`p-4 rounded-lg border ${getMetricBgColor(metrics.profitFactor)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Profit Factor</span>
            </div>
            {metrics.profitFactor >= 1.5 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${getMetricColor(metrics.profitFactor)}`}>
            {metrics.profitFactor.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.totalProfit > 0 ? `+$${metrics.totalProfit.toFixed(0)}` : '$0'} / ${metrics.totalLoss > 0 ? `-$${metrics.totalLoss.toFixed(0)}` : '$0'}
          </div>
        </div>

        {/* Average R:R */}
        <div className={`p-4 rounded-lg border ${getMetricBgColor(metrics.averageRR)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Avg R:R</span>
            </div>
            {metrics.averageRR >= 2 ? (
              <Award className="w-4 h-4 text-green-400" />
            ) : (
              <Activity className="w-4 h-4 text-yellow-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${getMetricColor(metrics.averageRR)}`}>
            1:{metrics.averageRR.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Risk/Reward Ratio
          </div>
        </div>

        {/* Expectancy */}
        <div className={`p-4 rounded-lg border ${getMetricBgColor(metrics.expectancy, metrics.expectancy > 0)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Expectancy</span>
            </div>
            {metrics.expectancy > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${metrics.expectancy > 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${metrics.expectancy.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Per Trade Average
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sharpe Ratio */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Sharpe Ratio</span>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.sharpeRatio.toFixed(2)}
          </div>
        </div>

        {/* Sortino Ratio */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Sortino Ratio</span>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.sortinoRatio.toFixed(2)}
          </div>
        </div>

        {/* Calmar Ratio */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Calmar Ratio</span>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.calmarRatio.toFixed(2)}
          </div>
        </div>

        {/* Recovery Factor */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Recovery Factor</span>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.recoveryFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Enhanced Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Max Drawdown */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">Max DD</span>
          </div>
          <div className="text-xl font-bold text-red-400">
            {metrics.maxDrawdown.toFixed(1)}%
          </div>
        </div>

        {/* Win/Loss Ratio */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Win/Loss Ratio</span>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.winLossRatio.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${(metrics.averageWin ?? 0).toFixed(0)} / ${(metrics.averageLoss ?? 0).toFixed(0)}
          </div>
        </div>

        {/* Consecutive Streaks */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Streaks</span>
          </div>
          <div className="text-sm font-bold">
            <span className="text-green-400">W: {metrics.consecutiveWins}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-red-400">L: {metrics.consecutiveLosses}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Max: {metrics.maxConsecutiveWins}W / {metrics.maxConsecutiveLosses}L
          </div>
        </div>

        {/* Total Trades */}
        <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Total Trades</span>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.totalTrades}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Consistency: {metrics.consistencyScore.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Setup Performance Table */}
      {setupPerformance.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Setup Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2 text-xs text-gray-400">Setup Type</th>
                  <th className="text-right p-2 text-xs text-gray-400">Trades</th>
                  <th className="text-right p-2 text-xs text-gray-400">Win Rate</th>
                  <th className="text-right p-2 text-xs text-gray-400">Avg R:R</th>
                  <th className="text-right p-2 text-xs text-gray-400">P.Factor</th>
                </tr>
              </thead>
              <tbody>
                {setupPerformance.map((setup, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-2 text-sm text-white">{setup.setupType}</td>
                    <td className="p-2 text-sm text-right text-gray-300">{setup.totalTrades}</td>
                    <td className={`p-2 text-sm text-right font-semibold ${getMetricColor(setup.winRate)}`}>
                      {setup.winRate.toFixed(1)}%
                    </td>
                    <td className="p-2 text-sm text-right text-gray-300">1:{(setup.avgRR ?? setup.averageRR ?? 0).toFixed(2)}</td>
                    <td className={`p-2 text-sm text-right font-semibold ${getMetricColor(setup.profitFactor ?? 0)}`}>
                      {(setup.profitFactor ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equity Curve Visualization */}
      {equityCurve.length > 1 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Equity Curve
          </h3>
          <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
            <div className="h-32 flex items-end gap-1">
              {equityCurve.slice(-30).map((point, idx) => {
                const maxEquity = Math.max(...equityCurve.map(p => p.equity));
                const minEquity = Math.min(...equityCurve.map(p => p.equity));
                const range = maxEquity - minEquity || 1;
                const height = ((point.equity - minEquity) / range) * 100;
                const isPositive = point.equity >= equityCurve[0]?.equity || 10000;
                
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t"
                    style={{ height: `${Math.max(5, height)}%` }}
                    title={`$${point.equity.toFixed(0)}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Start: ${equityCurve[0]?.equity.toFixed(0) || '10,000'}</span>
              <span>Current: ${equityCurve[equityCurve.length - 1]?.equity.toFixed(0)}</span>
              <span className={equityCurve[equityCurve.length - 1]?.equity >= (equityCurve[0]?.equity || 10000) ? 'text-green-400' : 'text-red-400'}>
                {((equityCurve[equityCurve.length - 1]?.equity - (equityCurve[0]?.equity || 10000)) / (equityCurve[0]?.equity || 10000) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;

