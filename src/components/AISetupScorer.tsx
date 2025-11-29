import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { scoreSetupQuality } from '../services/aiReviewService';

interface AISetupScorerProps {
  setup: {
    type: string;
    asset: string;
    entry: number;
    stop: number;
    target: number;
    marketBias?: string;
    session?: string;
    confidence?: number;
  };
  onScoreCalculated?: (score: number) => void;
}

const AISetupScorer: React.FC<AISetupScorerProps> = ({ setup, onScoreCalculated }) => {
  const [score, setScore] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState<string>('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<'STRONG' | 'MODERATE' | 'WEAK'>('MODERATE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we've already scored this setup to prevent loops
  const lastScoredSetupRef = useRef<string>('');
  const isScoringRef = useRef(false);

  // Create a stable key for the setup to detect changes
  const setupKey = useMemo(() => {
    return `${setup.asset}-${setup.type}-${setup.entry.toFixed(5)}-${setup.stop.toFixed(5)}-${setup.target.toFixed(5)}`;
  }, [setup.asset, setup.type, setup.entry, setup.stop, setup.target]);

  useEffect(() => {
    // Prevent duplicate scoring
    if (isScoringRef.current) {
      return;
    }

    // Check if this setup was already scored
    if (lastScoredSetupRef.current === setupKey) {
      return;
    }

    // Only score if we have valid values
    if (!setup.entry || !setup.stop || !setup.target || setup.entry === 0 || setup.stop === 0 || setup.target === 0) {
      return;
    }

    // Mark as scoring
    isScoringRef.current = true;
    lastScoredSetupRef.current = setupKey;
    setIsLoading(true);
    setError(null);

    scoreSetupQuality(setup)
      .then(result => {
        setScore(result.score);
        setReasoning(result.reasoning);
        setStrengths(result.strengths);
        setWeaknesses(result.weaknesses);
        setRecommendation(result.recommendation);
        setIsLoading(false);
        isScoringRef.current = false;
        
        if (onScoreCalculated) {
          onScoreCalculated(result.score);
        }
      })
      .catch(error => {
        console.error('Scoring error:', error);
          setError(error.message || 'AI değerlendirmesi başarısız. Lütfen API anahtarınızı kontrol edin.');
        setScore(5); // Default score on error
        setRecommendation('MODERATE');
          setReasoning('AI skoru oluşturulamadı. Varsayılan değerlendirme kullanılıyor.');
        setIsLoading(false);
        isScoringRef.current = false;
        
        if (onScoreCalculated) {
          onScoreCalculated(5);
        }
      });
  }, [setupKey, setup, onScoreCalculated]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded p-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        <span className="text-xs text-gray-400">AI setup'ı değerlendiriyor...</span>
      </div>
    );
  }

  if (!score && !error) return null;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 bg-green-500/20 border-green-500/50';
    if (score >= 5) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    return 'text-red-400 bg-red-500/20 border-red-500/50';
  };

  const getRecommendationColor = (rec: string) => {
    if (rec === 'STRONG') return 'text-green-400';
    if (rec === 'MODERATE') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">AI Setup Skoru</span>
        </div>
        <div className={`px-3 py-1 rounded border font-bold text-sm ${getScoreColor(score ?? 5)}`}>
          {score ?? 5}/10
        </div>
      </div>

      <div className={`text-xs font-bold ${getRecommendationColor(recommendation)}`}>
        Öneri: {recommendation === 'STRONG' ? 'GÜÇLÜ' : recommendation === 'MODERATE' ? 'ORTA' : 'ZAYIF'}
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2 flex items-start gap-2">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {reasoning && (
        <div className="text-xs text-gray-300 bg-slate-900/50 rounded p-2">
          {reasoning}
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            Güçlü Yönler:
          </div>
          <ul className="list-disc list-inside text-xs text-green-300 space-y-1">
            {strengths.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            Zayıf Yönler:
          </div>
          <ul className="list-disc list-inside text-xs text-red-300 space-y-1">
            {weaknesses.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AISetupScorer;

