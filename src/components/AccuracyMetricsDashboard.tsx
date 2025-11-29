import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { UserAccuracyMetrics } from '../types';
import { calculateUserAccuracyMetrics } from '../services/feedbackService';

interface AccuracyMetricsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccuracyMetricsDashboard: React.FC<AccuracyMetricsDashboardProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  let metrics: UserAccuracyMetrics;
  try {
    metrics = calculateUserAccuracyMetrics();
  } catch (error) {
    console.error('Error calculating accuracy metrics:', error);
    metrics = {
      totalFeedbacks: 0,
      correctPredictions: 0,
      incorrectPredictions: 0,
      partialPredictions: 0,
      overallAccuracy: 0,
      accuracyByZoneType: {},
      accuracyByScore: {},
      recentAccuracy: 0,
      improvementTrend: 'STABLE',
    };
  }

  const getTrendIcon = () => {
    switch (metrics.improvementTrend) {
      case 'IMPROVING':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'DECLINING':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getTrendText = () => {
    switch (metrics.improvementTrend) {
      case 'IMPROVING':
        return 'İyileşiyor';
      case 'DECLINING':
        return 'Düşüyor';
      default:
        return 'Stabil';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Doğruluk Metrikleri
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-xs text-gray-400 mb-1">Genel Doğruluk</div>
            <div className="text-2xl font-bold text-white">{isNaN(metrics.overallAccuracy) ? '0.0' : metrics.overallAccuracy.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">{metrics.totalFeedbacks} feedback</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Doğru
            </div>
            <div className="text-2xl font-bold text-green-400">{metrics.correctPredictions}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-400" />
              Yanlış
            </div>
            <div className="text-2xl font-bold text-red-400">{metrics.incorrectPredictions}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-yellow-400" />
              Kısmen
            </div>
            <div className="text-2xl font-bold text-yellow-400">{metrics.partialPredictions}</div>
          </div>
        </div>

        {/* Recent Accuracy & Trend */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-xs text-gray-400 mb-1">Son 30 Gün Doğruluğu</div>
            <div className="text-2xl font-bold text-white">{isNaN(metrics.recentAccuracy) ? '0.0' : metrics.recentAccuracy.toFixed(1)}%</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-xs text-gray-400 mb-1">Gelişim Trendi</div>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <div className="text-xl font-bold text-white">{getTrendText()}</div>
            </div>
          </div>
        </div>

        {/* Accuracy by Zone Type */}
        {Object.keys(metrics.accuracyByZoneType).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              Zone Tipine Göre Doğruluk
            </h3>
            <div className="space-y-2">
              {Object.entries(metrics.accuracyByZoneType).map(([type, accuracy]) => (
                <div key={type} className="p-3 bg-slate-800/50 rounded border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white font-bold">{type}</span>
                    <span className={`text-sm font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {isNaN(accuracy) ? '0.0' : accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        accuracy >= 70 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, accuracy)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Message */}
        {metrics.totalFeedbacks === 0 && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded text-center">
            <div className="text-yellow-400 text-sm">
              Henüz feedback vermediniz. Zone'lar hakkında feedback vererek AI'nın öğrenmesine yardımcı olun!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccuracyMetricsDashboard;

