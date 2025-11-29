import { PropFirm } from './types';

export const TRADERS = ["Admin", "Trader 1", "Trader 2", "Trader 3", "Analist"]; 
export const MAX_DAILY_LOSS_PERCENT = 2.0; 

// Gerçek ve Popüler Prop Firm Verileri
export const PROP_DATA: PropFirm[] = [
    { 
        name: "FTMO", 
        logo: "🔵", 
        discount: "Güvenilir Lider", 
        code: "STANDARD", 
        maxAlloc: "$200k", 
        type: "2-Step", 
        endsIn: "Her Zaman", 
        link: "https://ftmo.com" 
    },
    { 
        name: "The 5%ers", 
        logo: "5️⃣", 
        discount: "High Stakes", 
        code: "BOOTCAMP", 
        maxAlloc: "$4M (Scale)", 
        type: "Instant", 
        endsIn: "Limited", 
        link: "https://the5ers.com" 
    },
    { 
        name: "Funding Pips", 
        logo: "💧", 
        discount: "5 Gün Payout", 
        code: "FASTPAY", 
        maxAlloc: "$300k", 
        type: "2-Step", 
        endsIn: "48 Saat", 
        link: "#" 
    },
    { 
        name: "Alpha Capital", 
        logo: "🅰️", 
        discount: "%20 İNDİRİM", 
        code: "ALPHA20", 
        maxAlloc: "$2M", 
        type: "1-Step", 
        endsIn: "12 Saat", 
        link: "#" 
    },
    { 
        name: "E8 Markets", 
        logo: "🎱", 
        discount: "Drawdown Ölçekleme", 
        code: "E8TRACK", 
        maxAlloc: "$1M", 
        type: "3-Step", 
        endsIn: "Hafta Sonu", 
        link: "#" 
    },
    { 
        name: "TopTier Trader", 
        logo: "👑", 
        discount: "Bahar İndirimi", 
        code: "TOPTIER", 
        maxAlloc: "$600k", 
        type: "2-Step", 
        endsIn: "04s 12d", 
        link: "#" 
    },
];

export const ASSET_CONFIG = {
    'EURUSD': { tvSymbol: "FX:EURUSD", apiSymbol: "EURUSDT", smtPair: 'DXY' },
    'GBPUSD': { tvSymbol: "FX:GBPUSD", apiSymbol: "GBPUSDT", smtPair: 'DXY' },
    'XAUUSD': { tvSymbol: "OANDA:XAUUSD", apiSymbol: "PAXGUSDT", smtPair: 'DXY' },
    'BTCUSD': { tvSymbol: "BINANCE:BTCUSDT", apiSymbol: "BTCUSDT", smtPair: null },
    'US100': { tvSymbol: "CAPITALCOM:US100", apiSymbol: "NAS100", smtPair: 'SPX500' }
  };