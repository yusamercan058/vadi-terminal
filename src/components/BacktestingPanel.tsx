import React, { useState } from 'react';
import { Play, BarChart3, TrendingUp, TrendingDown, X, Loader2, RefreshCw, Dice6 } from 'lucide-react';
import { BacktestConfig, BacktestResult, Strategy } from '../types/backtesting';
import { JournalEntry, Asset, Notification } from '../types';
import { runBacktest, createStrategyFromJournal, runWalkForwardAnalysis, runMonteCarloSimulation } from '../services/backtestingService';
import { logger } from '../utils/logger';

interface BacktestingPanelProps {
  trades: JournalEntry[];
  isOpen: boolean;
  onClose: () => void;
  activeAsset?: Asset;
  onNotification?: (notification: Notification) => void;
}

const BacktestingPanel: React.FC<BacktestingPanelProps> = ({ trades, isOpen, onClose, activeAsset = 'EURUSD', onNotification }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isWalkForwardRunning, setIsWalkForwardRunning] = useState(false);
  const [isMonteCarloRunning, setIsMonteCarloRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [walkForwardResult, setWalkForwardResult] = useState<any>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'backtest' | 'walkforward' | 'montecarlo'>('backtest');
  const [config, setConfig] = useState<BacktestConfig>({
    strategy: 'custom',
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialBalance: 10000,
    riskPerTrade: 1,
    maxOpenPositions: 3,
    symbols: [activeAsset],
    timeframes: ['15m'],
  });

  const [strategy, setStrategy] = useState<Strategy | null>(null);

  React.useEffect(() => {
    if (trades.length > 0) {
      const learnedStrategy = createStrategyFromJournal(trades);
      setStrategy(learnedStrategy);
    } else {
      // Default strategy if no trades
      setStrategy({
        id: 'default_strategy',
        name: 'Default Strategy',
        description: 'Basic SMC strategy with Order Blocks and FVG',
        entryRules: [
          'Order Block or FVG setup',
          'Minimum R:R 1:2',
          'AI confidence > 6',
        ],
        exitRules: [
          'Take profit at target',
          'Stop loss at entry if 1R profit reached',
        ],
        filters: [
          'Session: LONDON or NEWYORK',
          'Market structure: BOS or ChoCh',
        ],
      });
    }
  }, [trades]);

  const handleRunBacktest = async () => {
    if (!strategy) return;

    setIsRunning(true);
    try {
      const backtestResult = await runBacktest(config, strategy, activeAsset);
      setResult(backtestResult);
    } catch (error) {
      logger.error('Backtest error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (onNotification) {
        onNotification({
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          title: '⚠️ Backtest Hatası',
          message: errorMessage,
          type: 'error',
        });
      } else {
        alert(`Backtest hatası: ${errorMessage}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunWalkForward = async () => {
    if (!strategy) return;

    setIsWalkForwardRunning(true);
    try {
      const wfResult = await runWalkForwardAnalysis(config, strategy, activeAsset, 4);
      setWalkForwardResult(wfResult);
    } catch (error) {
      logger.error('Walk-forward error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (onNotification) {
        onNotification({
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          title: '⚠️ Walk-Forward Hatası',
          message: errorMessage,
          type: 'error',
        });
      } else {
        alert(`Walk-forward hatası: ${errorMessage}`);
      }
    } finally {
      setIsWalkForwardRunning(false);
    }
  };

  const handleRunMonteCarlo = async () => {
    if (!result) {
      if (onNotification) {
        onNotification({
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          title: '⚠️ Uyarı',
          message: 'Önce normal backtest çalıştırın!',
          type: 'warning',
        });
      } else {
        alert('Önce normal backtest çalıştırın!');
      }
      return;
    }

    setIsMonteCarloRunning(true);
    try {
      const mcResult = await runMonteCarloSimulation(result, 1000);
      setMonteCarloResult(mcResult);
    } catch (error) {
      logger.error('Monte Carlo error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      if (onNotification) {
        onNotification({
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          title: '⚠️ Monte Carlo Hatası',
          message: errorMessage,
          type: 'error',
        });
      } else {
        alert(`Monte Carlo hatası: ${errorMessage}`);
      }
    } finally {
      setIsMonteCarloRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Backtesting Engine
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'backtest'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Standard Backtest
          </button>
          <button
            onClick={() => setActiveTab('walkforward')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'walkforward'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Walk-Forward
          </button>
          <button
            onClick={() => setActiveTab('montecarlo')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'montecarlo'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monte Carlo
          </button>
        </div>

        {/* Strategy Info */}
        {strategy && (
          <div className="mb-4 p-4 bg-slate-800/50 rounded border border-slate-700">
            <h3 className="text-sm font-bold text-white mb-2">{strategy.name}</h3>
            <p className="text-xs text-gray-400 mb-3">{strategy.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-400 mb-1">Entry Rules:</div>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {strategy.entryRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Exit Rules:</div>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {strategy.exitRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Config */}
        <div className="mb-4 p-4 bg-slate-800/50 rounded border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-3">Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">End Date</label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Initial Balance</label>
              <input
                type="number"
                value={config.initialBalance}
                onChange={(e) => setConfig({ ...config, initialBalance: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Risk Per Trade (%)</label>
              <input
                type="number"
                value={config.riskPerTrade}
                onChange={(e) => setConfig({ ...config, riskPerTrade: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Run Buttons */}
        {activeTab === 'backtest' && (
          <button
            onClick={handleRunBacktest}
            disabled={isRunning || !strategy}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded flex items-center justify-center gap-2 mb-4"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Backtest
              </>
            )}
          </button>
        )}

        {activeTab === 'walkforward' && (
          <button
            onClick={handleRunWalkForward}
            disabled={isWalkForwardRunning || !strategy}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded flex items-center justify-center gap-2 mb-4"
          >
            {isWalkForwardRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Walk-Forward Analysis...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Run Walk-Forward Analysis
              </>
            )}
          </button>
        )}

        {activeTab === 'montecarlo' && (
          <button
            onClick={handleRunMonteCarlo}
            disabled={isMonteCarloRunning || !result}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded flex items-center justify-center gap-2 mb-4"
          >
            {isMonteCarloRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Monte Carlo Simulation...
              </>
            ) : (
              <>
                <Dice6 className="w-5 h-5" />
                Run Monte Carlo Simulation (1000 runs)
              </>
            )}
          </button>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Results
            </h3>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                <div className="text-xl font-bold text-white">{result.winRate.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Profit Factor</div>
                <div className="text-xl font-bold text-white">{result.profitFactor.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
                <div className="text-xl font-bold text-red-400">{result.maxDrawdown.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Return</div>
                <div className={`text-xl font-bold ${result.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.returnPercent >= 0 ? '+' : ''}{result.returnPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-2">Trade Statistics</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Trades:</span>
                    <span className="text-white font-bold">{result.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winning:</span>
                    <span className="text-green-400 font-bold">{result.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Losing:</span>
                    <span className="text-red-400 font-bold">{result.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Profit:</span>
                    <span className="text-green-400 font-bold">${result.totalProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Loss:</span>
                    <span className="text-red-400 font-bold">${result.totalLoss.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-2">Risk Metrics</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sharpe Ratio:</span>
                    <span className="text-white font-bold">{result.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sortino Ratio:</span>
                    <span className="text-white font-bold">{result.sortinoRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Final Balance:</span>
                    <span className="text-white font-bold">${result.finalBalance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Equity Curve */}
            {result.equityCurve.length > 0 && (
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-2">Equity Curve</div>
                <div className="h-32 flex items-end gap-1">
                  {result.equityCurve.slice(-30).map((point, idx) => {
                    const maxEquity = Math.max(...result.equityCurve.map(p => p.equity));
                    const minEquity = Math.min(...result.equityCurve.map(p => p.equity));
                    const range = maxEquity - minEquity || 1;
                    const height = ((point.equity - minEquity) / range) * 100;
                    const isPositive = point.equity >= result.equityCurve[0]?.equity || config.initialBalance;

                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-t transition-all ${
                          isPositive ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${Math.max(5, height)}%` }}
                        title={`$${point.equity.toFixed(0)}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Walk-Forward Results */}
        {activeTab === 'walkforward' && walkForwardResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Walk-Forward Analysis Results
            </h3>

            {/* Average Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Avg Win Rate</div>
                <div className="text-xl font-bold text-white">{walkForwardResult.averageMetrics.winRate.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Avg Profit Factor</div>
                <div className="text-xl font-bold text-white">{walkForwardResult.averageMetrics.profitFactor.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Avg Max Drawdown</div>
                <div className="text-xl font-bold text-red-400">{walkForwardResult.averageMetrics.maxDrawdown.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Avg Return</div>
                <div className={`text-xl font-bold ${walkForwardResult.averageMetrics.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {walkForwardResult.averageMetrics.returnPercent >= 0 ? '+' : ''}{walkForwardResult.averageMetrics.returnPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Period Results */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">Period Results</h4>
              {walkForwardResult.periods.map((period: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-800/50 rounded border border-slate-700">
                  <div className="text-xs text-gray-400 mb-2">{period.period}</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Win Rate: </span>
                      <span className="text-white font-bold">{period.result.winRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">PF: </span>
                      <span className="text-white font-bold">{period.result.profitFactor.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">DD: </span>
                      <span className="text-red-400 font-bold">{period.result.maxDrawdown.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Return: </span>
                      <span className={`font-bold ${period.result.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {period.result.returnPercent >= 0 ? '+' : ''}{period.result.returnPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monte Carlo Results */}
        {activeTab === 'montecarlo' && monteCarloResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Dice6 className="w-5 h-5 text-indigo-400" />
              Monte Carlo Simulation Results (1000 runs)
            </h3>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Median Final Balance</div>
                <div className="text-xl font-bold text-white">${monteCarloResult.statistics.medianFinalBalance.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Worst Case</div>
                <div className="text-xl font-bold text-red-400">${monteCarloResult.statistics.worstCaseFinalBalance.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Best Case</div>
                <div className="text-xl font-bold text-green-400">${monteCarloResult.statistics.bestCaseFinalBalance.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Probability of Profit</div>
                <div className="text-xl font-bold text-white">{monteCarloResult.statistics.probabilityOfProfit.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="text-xs text-gray-400 mb-1">Avg Max Drawdown</div>
                <div className="text-xl font-bold text-red-400">{monteCarloResult.statistics.averageMaxDrawdown.toFixed(1)}%</div>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
              <div className="text-xs text-gray-400 mb-2">Final Balance Distribution</div>
              <div className="h-32 flex items-end gap-1">
                {(() => {
                  const balances = monteCarloResult.simulations.map((s: any) => s.finalBalance);
                  const min = Math.min(...balances);
                  const max = Math.max(...balances);
                  const range = max - min || 1;
                  const buckets = 30;
                  const bucketSize = range / buckets;
                  const histogram = new Array(buckets).fill(0);
                  
                  balances.forEach((balance: number) => {
                    const bucket = Math.min(Math.floor((balance - min) / bucketSize), buckets - 1);
                    histogram[bucket]++;
                  });

                  const maxCount = Math.max(...histogram);
                  return histogram.map((count, idx) => {
                    const height = (count / maxCount) * 100;
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-500 rounded-t transition-all"
                        style={{ height: `${Math.max(2, height)}%` }}
                        title={`${(min + idx * bucketSize).toFixed(0)}-${(min + (idx + 1) * bucketSize).toFixed(0)}: ${count} runs`}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestingPanel;

