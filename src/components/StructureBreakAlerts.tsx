import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketBias, Notification } from '../types';

interface StructureBreakAlertsProps {
  marketBias: MarketBias | null;
  previousBias: MarketBias | null;
  onAlert: (notification: Notification) => void;
}

const StructureBreakAlerts: React.FC<StructureBreakAlertsProps> = ({
  marketBias,
  previousBias,
  onAlert,
}) => {
  useEffect(() => {
    if (!marketBias || !previousBias) return;

    // Check for structure break
    if (previousBias.structure !== marketBias.structure) {
      const isBOS = marketBias.structure === 'BOS';
      const isChoCh = marketBias.structure === 'ChoCh';

      if (isBOS || isChoCh) {
        onAlert({
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          title: `🔄 Structure Break: ${marketBias.structure}`,
          message: `${isBOS ? 'Break of Structure' : 'Change of Character'} detected. Market structure changed from ${previousBias.structure} to ${marketBias.structure}.`,
          type: 'warning',
        });
      }
    }

    // Check for liquidity sweep
    if (marketBias.liquiditySweep) {
      onAlert({
        id: Date.now() + 1,
        time: new Date().toLocaleTimeString(),
        title: `💧 Liquidity Sweep ${marketBias.liquiditySweep.direction}`,
        message: `Liquidity level ${marketBias.liquiditySweep.level.toFixed(5)} was swept ${marketBias.liquiditySweep.direction === 'UP' ? 'upward' : 'downward'} and price reversed.`,
        type: 'info',
      });
    }
  }, [marketBias, previousBias, onAlert]);

  return null; // This component only triggers alerts
};

export default StructureBreakAlerts;

