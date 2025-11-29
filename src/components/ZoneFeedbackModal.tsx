import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { SMCZone, ZoneFeedback, MarketBias } from '../types';
import { saveZoneFeedback, saveLearningData } from '../services/feedbackService';

interface ZoneFeedbackModalProps {
  zone: SMCZone;
  marketBias: MarketBias | null;
  aiConfidence: number;
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
}

const ZoneFeedbackModal: React.FC<ZoneFeedbackModalProps> = ({
  zone,
  marketBias,
  aiConfidence,
  isOpen,
  onClose,
  onFeedbackSubmitted,
}) => {
  const [accuracy, setAccuracy] = useState<'CORRECT' | 'INCORRECT' | 'PARTIAL' | null>(null);
  const [userNote, setUserNote] = useState('');
  const [actualOutcome, setActualOutcome] = useState<'WIN' | 'LOSS' | 'PARTIAL' | ''>('');
  const [actualEntry, setActualEntry] = useState('');
  const [actualExit, setActualExit] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!accuracy) {
      alert('Lütfen zone doğruluğunu seçin!');
      return;
    }

    const feedback: ZoneFeedback = {
      zoneId: zone.id,
      timestamp: Date.now(),
      accuracy,
      userNote: userNote || undefined,
      actualOutcome: actualOutcome || undefined,
      actualEntry: actualEntry ? parseFloat(actualEntry) : undefined,
      actualExit: actualExit ? parseFloat(actualExit) : undefined,
      actualRR: actualEntry && actualExit ? 
        Math.abs(parseFloat(actualExit) - parseFloat(actualEntry)) / 
        Math.abs(parseFloat(actualEntry) - (zone.type.includes('Bullish') ? zone.priceBottom : zone.priceTop)) : undefined,
    };

    saveZoneFeedback(feedback);
    saveLearningData(zone, marketBias, aiConfidence, feedback);

    // Reset form
    setAccuracy(null);
    setUserNote('');
    setActualOutcome('');
    setActualEntry('');
    setActualExit('');

    if (onFeedbackSubmitted) {
      onFeedbackSubmitted();
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
            Zone Feedback
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Info */}
        <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
          <div className="text-xs text-gray-400 mb-1">Zone Type</div>
          <div className="text-sm font-bold text-white">{zone.type}</div>
          <div className="text-xs text-gray-400 mt-2">Score: <span className="text-cyan-400">{zone.score}</span></div>
        </div>

        {/* Accuracy Selection */}
        <div className="mb-4">
          <div className="text-sm font-bold text-white mb-2">Zone Doğruluğu</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setAccuracy('CORRECT')}
              className={`p-3 rounded border-2 transition-all ${
                accuracy === 'CORRECT'
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <CheckCircle className={`w-6 h-6 mx-auto mb-1 ${accuracy === 'CORRECT' ? 'text-green-400' : 'text-slate-500'}`} />
              <div className={`text-xs font-bold ${accuracy === 'CORRECT' ? 'text-green-400' : 'text-slate-400'}`}>
                Doğru
              </div>
            </button>
            <button
              onClick={() => setAccuracy('INCORRECT')}
              className={`p-3 rounded border-2 transition-all ${
                accuracy === 'INCORRECT'
                  ? 'border-red-500 bg-red-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <XCircle className={`w-6 h-6 mx-auto mb-1 ${accuracy === 'INCORRECT' ? 'text-red-400' : 'text-slate-500'}`} />
              <div className={`text-xs font-bold ${accuracy === 'INCORRECT' ? 'text-red-400' : 'text-slate-400'}`}>
                Yanlış
              </div>
            </button>
            <button
              onClick={() => setAccuracy('PARTIAL')}
              className={`p-3 rounded border-2 transition-all ${
                accuracy === 'PARTIAL'
                  ? 'border-yellow-500 bg-yellow-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <AlertCircle className={`w-6 h-6 mx-auto mb-1 ${accuracy === 'PARTIAL' ? 'text-yellow-400' : 'text-slate-500'}`} />
              <div className={`text-xs font-bold ${accuracy === 'PARTIAL' ? 'text-yellow-400' : 'text-slate-400'}`}>
                Kısmen
              </div>
            </button>
          </div>
        </div>

        {/* Actual Outcome */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Gerçek Sonuç (Opsiyonel)</label>
          <select
            value={actualOutcome}
            onChange={(e) => setActualOutcome(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
          >
            <option value="">Seçiniz</option>
            <option value="WIN">WIN</option>
            <option value="LOSS">LOSS</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>
        </div>

        {/* Actual Entry/Exit */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Gerçek Giriş (Opsiyonel)</label>
            <input
              type="number"
              step="0.00001"
              value={actualEntry}
              onChange={(e) => setActualEntry(e.target.value)}
              placeholder="Entry price"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Gerçek Çıkış (Opsiyonel)</label>
            <input
              type="number"
              step="0.00001"
              value={actualExit}
              onChange={(e) => setActualExit(e.target.value)}
              placeholder="Exit price"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
            />
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Not (Opsiyonel)</label>
          <textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="Zone hakkında notlarınız..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!accuracy}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Feedback Gönder
        </button>
      </div>
    </div>
  );
};

export default ZoneFeedbackModal;

