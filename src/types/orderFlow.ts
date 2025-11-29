// Order Flow Types
export interface VolumeProfile {
  price: number;
  volume: number;
}

export interface VolumeProfileData {
  poc: number; // Point of Control (highest volume)
  valueAreaHigh: number;
  valueAreaLow: number;
  totalVolume: number;
  profile: VolumeProfile[];
}

export interface DeltaBar {
  time: number;
  buyVolume: number;
  sellVolume: number;
  delta: number; // buyVolume - sellVolume
  cumulativeDelta: number;
}

export interface Imbalance {
  priceTop: number;
  priceBottom: number;
  time: number;
  direction: 'UP' | 'DOWN';
  filled: boolean;
  fillTime?: number;
}

