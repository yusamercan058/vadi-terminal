import React, { useState } from 'react';
import { Brain, Loader2, X, Star, CheckCircle2, XCircle } from 'lucide-react';
import { JournalEntry } from '../types';
import { reviewTrade } from '../services/aiReviewService';

interface AITradeReviewProps {
  trade: JournalEntry;
  isOpen: boolean;
  onClose: () => void;
}

const AITradeReview: React.FC<AITradeReviewProps> = ({ trade, isOpen, onClose }) => {
  const [review, setReview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && !review && trade.status !== 'OPEN') {
      setIsLoading(true);
      reviewTrade(trade)
        .then(result => {
          setReview(result);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Review error:', error);
          setReview('Unable to generate review. Please try again.');
          setIsLoading(false);
        });
    }
  }, [isOpen, trade, review]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            AI Trade Review: {trade.asset}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trade Info */}
        <div className="mb-4 p-4 bg-slate-800/50 rounded border border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-gray-400 mb-1">Setup</div>
              <div className="text-white font-bold">{trade.type}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Entry</div>
              <div className="text-white font-mono">{Number(trade.entry).toFixed(5)}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Status</div>
              <div className={`font-bold ${trade.status === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                {trade.status}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">P&L</div>
              <div className={`font-bold ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(trade.pnl || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Review Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
            <div className="text-gray-400">AI is analyzing your trade...</div>
          </div>
        ) : review ? (
          <div className="prose prose-invert max-w-none">
            <div className="bg-slate-800/50 rounded p-4 border border-slate-700 whitespace-pre-wrap text-sm text-gray-300">
              {review}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            Unable to generate review for this trade.
          </div>
        )}
      </div>
    </div>
  );
};

export default AITradeReview;

