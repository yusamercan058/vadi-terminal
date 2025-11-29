
export interface MarketTickerItem {
    symbol: string;
    price: number;
    change: number; // Percentage change
    changeAbs: number; // Absolute change
    isPositive: boolean;
}

// Popular forex pairs and their base prices
const POPULAR_PAIRS = [
    { symbol: 'EURUSD', basePrice: 1.0850 },
    { symbol: 'GBPUSD', basePrice: 1.2650 },
    { symbol: 'USDJPY', basePrice: 149.50 },
    { symbol: 'AUDUSD', basePrice: 0.6580 },
    { symbol: 'USDCAD', basePrice: 1.3520 },
    { symbol: 'USDCHF', basePrice: 0.8850 },
    { symbol: 'NZDUSD', basePrice: 0.6120 },
    { symbol: 'EURGBP', basePrice: 0.8570 },
    { symbol: 'EURJPY', basePrice: 162.20 },
    { symbol: 'GBPJPY', basePrice: 189.10 },
    { symbol: 'XAUUSD', basePrice: 2340.50 }, // Gold
    { symbol: 'XAGUSD', basePrice: 28.30 }, // Silver
    { symbol: 'BTCUSD', basePrice: 64200 },
    { symbol: 'ETHUSD', basePrice: 3450 }
];

export const getMarketTicker = (): MarketTickerItem[] => {
    const ticker: MarketTickerItem[] = [];
    
    POPULAR_PAIRS.forEach(pair => {
        // Generate realistic price movement (-2% to +2% daily range)
        const dailyChangePercent = (Math.random() - 0.5) * 4; // -2% to +2%
        const currentPrice = pair.basePrice * (1 + dailyChangePercent / 100);
        
        // Calculate change in pips/points
        let changeAbs = 0;
        if (pair.symbol.includes('JPY') || pair.symbol.includes('XAU') || pair.symbol.includes('XAG') || pair.symbol.includes('BTC') || pair.symbol.includes('ETH')) {
            // For JPY pairs and commodities, use points
            changeAbs = currentPrice - pair.basePrice;
        } else {
            // For other pairs, use pips (4th decimal)
            changeAbs = (currentPrice - pair.basePrice) * 10000;
        }
        
        ticker.push({
            symbol: pair.symbol,
            price: currentPrice,
            change: dailyChangePercent,
            changeAbs: Math.abs(changeAbs),
            isPositive: dailyChangePercent >= 0
        });
    });
    
    // Sort by absolute change (most volatile first)
    return ticker.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
};

// Update prices with small random movements (simulate live updates)
export const updateMarketTicker = (ticker: MarketTickerItem[]): MarketTickerItem[] => {
    return ticker.map(item => {
        const pair = POPULAR_PAIRS.find(p => p.symbol === item.symbol);
        if (!pair) return item;
        
        // Small random movement (±0.1%)
        const movement = (Math.random() - 0.5) * 0.2;
        const newPrice = item.price * (1 + movement / 100);
        
        // Recalculate change from base
        const dailyChangePercent = ((newPrice - pair.basePrice) / pair.basePrice) * 100;
        
        let changeAbs = 0;
        if (item.symbol.includes('JPY') || item.symbol.includes('XAU') || item.symbol.includes('XAG') || item.symbol.includes('BTC') || item.symbol.includes('ETH')) {
            changeAbs = newPrice - pair.basePrice;
        } else {
            changeAbs = (newPrice - pair.basePrice) * 10000;
        }
        
        return {
            ...item,
            price: newPrice,
            change: dailyChangePercent,
            changeAbs: Math.abs(changeAbs),
            isPositive: dailyChangePercent >= 0
        };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
};

