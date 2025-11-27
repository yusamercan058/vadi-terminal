
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, SeriesMarker, IPriceLine } from 'lightweight-charts';
import { Candle, SMCZone, ChartMarker, LiquidityLevel, OpenPosition } from '../types';

interface SmartChartProps {
    data: Candle[];
    zones: SMCZone[];
    markers: ChartMarker[];
    liquidityLevels?: LiquidityLevel[];
    positions?: OpenPosition[]; // New prop for open positions
}

const SmartChart: React.FC<SmartChartProps> = ({ data, zones, markers, liquidityLevels = [], positions = [] }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const histogramRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const activeLinesRef = useRef<IPriceLine[]>([]);
    const positionLinesRef = useRef<IPriceLine[]>([]); // To track position lines

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#000000' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#1f2937',
            },
            rightPriceScale: {
                borderColor: '#1f2937',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            crosshair: {
                mode: 1, // Magnet
            }
        });

        // Cast to any to handle type mismatch with specific library versions
        const chartApi = chart as any;

        // 1. Day Separator Series (Background Histogram)
        const histogramSeries = chartApi.addHistogramSeries({
            priceScaleId: 'left', // Use separate scale to avoid messing with price
            priceFormat: {
                type: 'volume',
            },
            color: 'rgba(255, 255, 255, 0.05)',
        });
        
        // Hide the left scale so it acts as background
        chart.priceScale('left').applyOptions({
            visible: false,
            scaleMargins: {
                top: 0,
                bottom: 0,
            },
        });

        // 2. Main Candlestick Series
        const newSeries = chartApi.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#15803d',
            wickDownColor: '#b91c1c',
        });

        chartRef.current = chart;
        seriesRef.current = newSeries;
        histogramRef.current = histogramSeries;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Effect for Positions (Entry, SL, TP)
    useEffect(() => {
        if (!seriesRef.current) return;
        const seriesApi = seriesRef.current as any;

        // Clear existing position lines
        positionLinesRef.current.forEach(line => {
            if (seriesApi.removePriceLine) {
                seriesApi.removePriceLine(line);
            }
        });
        positionLinesRef.current = [];

        // Draw new position lines
        positions.forEach(pos => {
            if (!seriesApi.createPriceLine) return;

            // ENTRY LINE
            const entryLine = seriesApi.createPriceLine({
                price: pos.entryPrice,
                color: pos.type === 'BUY' ? '#3b82f6' : '#ec4899', // Blue for Buy, Pink for Sell
                lineWidth: 1,
                lineStyle: 0, // Solid
                axisLabelVisible: true,
                title: `${pos.type} #${pos.lotSize}`,
            });
            positionLinesRef.current.push(entryLine);

            // STOP LOSS LINE
            if (pos.stopLoss) {
                const slLine = seriesApi.createPriceLine({
                    price: pos.stopLoss,
                    color: '#ef4444', // Red
                    lineWidth: 1,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: 'SL',
                });
                positionLinesRef.current.push(slLine);
            }

            // TAKE PROFIT LINE
            if (pos.takeProfit) {
                const tpLine = seriesApi.createPriceLine({
                    price: pos.takeProfit,
                    color: '#22c55e', // Green
                    lineWidth: 1,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: 'TP',
                });
                positionLinesRef.current.push(tpLine);
            }
        });

    }, [positions]); // Re-run when positions change

    // Effect for Data and Zones
    useEffect(() => {
        if (!seriesRef.current || data.length === 0) return;

        // 1. Set Candle Data
        seriesRef.current.setData(data.map(d => ({
            time: d.time as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        })));

        // 2. Day Separators Logic
        if (histogramRef.current) {
            const histogramData = [];
            let lastDay = new Date(data[0].time * 1000).getUTCDate();
            
            for (const d of data) {
                const date = new Date(d.time * 1000);
                const currentDay = date.getUTCDate();
                
                if (currentDay !== lastDay) {
                    // New Day Detected
                    histogramData.push({ time: d.time as Time, value: 100, color: 'rgba(255, 255, 255, 0.08)' });
                    lastDay = currentDay;
                } else {
                    histogramData.push({ time: d.time as Time, value: 0 });
                }
            }
            histogramRef.current.setData(histogramData);
        }

        // 3. Clear Previous Lines (Zones & Liquidity)
        activeLinesRef.current.forEach(line => {
             if (seriesRef.current && (seriesRef.current as any).removePriceLine) {
                 (seriesRef.current as any).removePriceLine(line);
             }
        });
        activeLinesRef.current = [];

        // 4. Draw High Quality Zones
        const activeZones = zones.filter(z => z.status === 'FRESH').slice(0, 5);
        
        activeZones.forEach(z => {
            if (!seriesRef.current) return;
            const seriesApi = seriesRef.current as any;

            if (!seriesApi.createPriceLine) return;

            const isBullish = z.type.includes('Bullish') || z.type === 'Unicorn Setup';
            const isUnicorn = z.type === 'Unicorn Setup';
            const isFVG = z.type.includes('FVG');
            
            let mainColor = isBullish ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
            if (isUnicorn) mainColor = 'rgba(168, 85, 247, 0.9)';
            if (isFVG) mainColor = isBullish ? 'rgba(234, 179, 8, 0.9)' : 'rgba(234, 179, 8, 0.9)';

            const labelText = isUnicorn ? '🦄 UNICORN' : isFVG ? '⚠️ FVG GAP' : '📦 OB';

            const topLine = seriesApi.createPriceLine({
                price: z.priceTop,
                color: mainColor,
                lineWidth: isUnicorn ? 2 : 1,
                lineStyle: 0, 
                axisLabelVisible: true,
                title: labelText,
            });
            
            const bottomLine = seriesApi.createPriceLine({
                price: z.priceBottom,
                color: mainColor,
                lineWidth: isUnicorn ? 2 : 1,
                lineStyle: isFVG ? 2 : 0, 
                axisLabelVisible: false,
                title: '',
            });

            if (topLine) activeLinesRef.current.push(topLine);
            if (bottomLine) activeLinesRef.current.push(bottomLine);
        });

        // 5. Draw Liquidity Levels (PDH / PDL / ASIA / MIDNIGHT)
        liquidityLevels.forEach(lvl => {
             if (!seriesRef.current) return;
             const seriesApi = seriesRef.current as any;
             
             if (!seriesApi.createPriceLine) return;

             const line = seriesApi.createPriceLine({
                 price: lvl.price,
                 color: lvl.color,
                 lineWidth: 1,
                 lineStyle: lvl.lineStyle,
                 axisLabelVisible: true,
                 title: lvl.label,
             });
             if (line) activeLinesRef.current.push(line);
        });

        // 6. Set Markers
        const chartMarkers: SeriesMarker<Time>[] = markers.map(m => ({
            time: m.time as Time,
            position: m.position,
            color: m.color,
            shape: m.shape,
            text: m.text,
            size: m.size || 1
        }));

        (seriesRef.current as any).setMarkers(chartMarkers.sort((a,b) => (a.time as number) - (b.time as number)));

    }, [data, zones, markers, liquidityLevels]);

    return (
        <div ref={chartContainerRef} className="h-full w-full relative group bg-black">
             {/* Watermark */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-slate-800/20 pointer-events-none select-none z-0 tracking-tighter">
                VADI
             </div>
             <div className="absolute bottom-10 left-4 z-10 flex flex-col gap-1 pointer-events-none opacity-50 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-green-500"></div> Bullish OB</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-500"></div> Bearish OB</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-yellow-500"></div> FVG (Imbalance)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-purple-500"></div> Unicorn (OB+FVG)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 border-b border-purple-500 border-dashed"></div> ASIA Range</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 border-b border-pink-500 border-dotted"></div> Midnight Open</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-blue-500"></div> ENTRY Line</div>
             </div>
        </div>
    );
};

export default SmartChart;
