import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { Candle } from '../types';
import { calculateVolumeProfile } from '../services/volumeProfileService';
import { VolumeProfileData } from '../types/orderFlow';

interface VolumeProfileProps {
  candles: Candle[];
  currentPrice: number;
}

const VolumeProfile: React.FC<VolumeProfileProps> = ({ candles, currentPrice }) => {
  const profile = useMemo(() => calculateVolumeProfile(candles), [candles]);

  if (profile.profile.length === 0) {
    return null;
  }

  const maxVolume = Math.max(...profile.profile.map(p => p.volume));
  const minPrice = Math.min(...profile.profile.map(p => p.price));
  const maxPrice = Math.max(...profile.profile.map(p => p.price));
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold text-white">Volume Profile</span>
      </div>

      <div className="flex gap-2 h-64">
        {/* Volume bars */}
        <div className="flex-1 flex items-end gap-0.5">
          {profile.profile.map((point, idx) => {
            const height = (point.volume / maxVolume) * 100;
            const isPOC = point.price === profile.poc;
            const isValueArea = point.price >= profile.valueAreaLow && point.price <= profile.valueAreaHigh;
            const isCurrentPrice = Math.abs(point.price - currentPrice) < 0.0001;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center relative group"
                style={{ height: '100%' }}
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isPOC
                      ? 'bg-cyan-500'
                      : isValueArea
                      ? 'bg-green-500/60'
                      : 'bg-slate-600/40'
                  }`}
                  style={{
                    height: `${Math.max(2, height)}%`,
                    minHeight: '2px',
                  }}
                  title={`Price: ${point.price.toFixed(5)}, Volume: ${point.volume.toFixed(0)}`}
                />
                {isCurrentPrice && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-500 rounded" />
          <span className="text-gray-400">POC: {profile.poc.toFixed(5)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/60 rounded" />
          <span className="text-gray-400">Value Area</span>
        </div>
        <div className="text-gray-400">
          VA High: {profile.valueAreaHigh.toFixed(5)}
          <br />
          VA Low: {profile.valueAreaLow.toFixed(5)}
        </div>
      </div>
    </div>
  );
};

export default VolumeProfile;

