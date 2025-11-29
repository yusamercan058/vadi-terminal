import React, { useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Award, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { SMCZone, JournalEntry, TradePattern } from '../types';
import { findSimilarPatterns, getPatternRecommendations } from '../services/patternService';

interface PatternRecognitionProps {
  currentZone: SMCZone;
  trades: JournalEntry[];
}

const PatternRecognition: React.FC<PatternRecognitionProps> = ({ currentZone, trades }) => {
  const recommendations = useMemo(() => 
    getPatternRecommendations(currentZone, trades), 
    [currentZone, trades]
  );

  const getRecommendationColor = (rec: 'STRONG' | 'MODERATE' | 'WEAK') => {
    switch (rec) {
      case 'STRONG':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'MODERATE':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'WEAK':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
    }
  };

  const getRecommendationIcon = (rec: 'STRONG' | 'MODERATE' | 'WEAK') => {
    switch (rec) {
      case 'STRONG':
        return <Award className="w-4 h-4 text-green-400" />;
      case 'MODERATE':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'WEAK':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Recommendation Header */}
      <div className={`p-3 rounded-lg border ${getRecommendationColor(recommendations.recommendation)}`}>
        <div className="flex items-center gap-2 mb-2">
          {getRecommendationIcon(recommendations.recommendation)}
          <span className="text-xs font-bold">
            Pattern Önerisi: {recommendations.recommendation}
          </span>
        </div>
        <p className="text-xs text-gray-300">{recommendations.reason}</p>
      </div>

      {/* Similar Patterns */}
      {recommendations.similarPatterns.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
            <Search className="w-3 h-3" />
            Benzer Pattern'ler ({recommendations.similarPatterns.length})
          </h4>
          <div className="space-y-2">
            {recommendations.similarPatterns.map((pattern, idx) => (
              <div
                key={idx}
                className="p-2 rounded border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      pattern.outcome === 'WIN' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}>
                      {pattern.setup}
                    </span>
                    <span className="text-[9px] text-gray-400">{pattern.asset}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pattern.outcome === 'WIN' ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className="text-[9px] text-gray-400">
                      {pattern.similarity.toFixed(0)}% benzer
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-[9px] text-gray-500">
                  <span>R:R: 1:{(pattern.rr ?? 0).toFixed(2)}</span>
                  <span>{pattern.session}</span>
                  <span>{pattern.entryTime?.toLocaleDateString() ?? 'N/A'}</span>
                </div>
                
                {pattern.screenshot && (
                  <div className="mt-1">
                    <button className="text-[9px] text-cyan-400 hover:text-white flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Screenshot Görüntüle
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.similarPatterns.length === 0 && (
        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 text-center">
          <p className="text-xs text-gray-400">
            Bu setup için benzer pattern bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
};

export default PatternRecognition;

