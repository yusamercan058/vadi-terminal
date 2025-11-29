import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ConfirmationSignals } from '../types';
import { getConfirmationColor, getConfirmationLabel } from '../services/confirmationService';

interface ConfirmationBadgeProps {
  signals: ConfirmationSignals;
  showDetails?: boolean;
}

const ConfirmationBadge: React.FC<ConfirmationBadgeProps> = ({ signals, showDetails = false }) => {
  const color = getConfirmationColor(signals.overallScore);
  const label = getConfirmationLabel(signals.overallScore);
  
  const getIcon = () => {
    if (signals.overallScore >= 80) return <CheckCircle2 className="w-3 h-3" />;
    if (signals.overallScore >= 60) return <AlertTriangle className="w-3 h-3" />;
    return <XCircle className="w-3 h-3" />;
  };

  return (
    <div className="space-y-2">
      <div className={`px-2 py-1 rounded text-[9px] font-bold border flex items-center gap-1 ${color}`}>
        {getIcon()}
        <span>{label}</span>
        <span className="font-mono">({signals.overallScore}%)</span>
      </div>
      
      {showDetails && (
        <div className="space-y-1 text-[9px]">
          <div className="flex justify-between">
            <span className="text-gray-400">AI Güven:</span>
            <span className={(signals.aiConfidence ?? 0) >= 7 ? 'text-green-400' : 'text-gray-400'}>
              {(signals.aiConfidence ?? 0) >= 7 ? '✅' : '❌'} {signals.aiConfidence ?? 0}/10
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Pattern Eşleşme:</span>
            <span className={(signals.patternMatch ?? 0) >= 60 ? 'text-green-400' : 'text-gray-400'}>
              {(signals.patternMatch ?? 0) >= 60 ? '✅' : '❌'} {signals.patternMatch ?? 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">MTF Uyumu:</span>
            <span className={signals.mtfAlignment ? 'text-green-400' : 'text-gray-400'}>
              {signals.mtfAlignment ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Risk Seviyesi:</span>
            <span className={
              signals.riskLevel === 'LOW' ? 'text-green-400' :
              signals.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
              'text-red-400'
            }>
              {signals.riskLevel === 'LOW' ? '✅' : '⚠️'} {signals.riskLevel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Session Uyumu:</span>
            <span className={(signals.sessionMatch ?? false) ? 'text-green-400' : 'text-gray-400'}>
              {(signals.sessionMatch ?? false) ? '✅' : '❌'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationBadge;

