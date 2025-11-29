
import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, SeriesMarker, IPriceLine } from 'lightweight-charts';
import { Candle, SMCZone, ChartMarker, LiquidityLevel, OpenPosition } from '../types';

interface SmartChartProps {
    data: Candle[];
    zones: SMCZone[];
    markers: ChartMarker[];
    liquidityLevels?: LiquidityLevel[];
    positions?: OpenPosition[];
    equilibrium?: number;
}

const SmartChart: React.FC<SmartChartProps> = ({ data, zones, markers, liquidityLevels = [], positions = [], equilibrium }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const histogramRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const activeLinesRef = useRef<IPriceLine[]>([]);
    const positionLinesRef = useRef<IPriceLine[]>([]);
    const equilibriumLineRef = useRef<IPriceLine | null>(null);

    // Memoize sorted zones and markers BEFORE useEffect
    const sortedZones = useMemo(() => {
        return [...zones]
            .filter(z => z.status === 'FRESH' || z.status === 'TESTED')
            .sort((a, b) => b.score - a.score)
            .slice(0, 8); // Show top 8 zones
    }, [zones]);

    const sortedMarkers = useMemo(() => {
        return [...markers].sort((a, b) => (a.time as number) - (b.time as number));
    }, [markers]);

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

    }, [positions]);

    // Effect for Data and Zones
    useEffect(() => {
        if (!seriesRef.current || data.length === 0) return;

        const seriesApi = seriesRef.current as any;

        // 1. Set Candle Data
        seriesApi.setData(data.map(d => ({
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
                    histogramData.push({ time: d.time as Time, value: 100, color: 'rgba(255, 255, 255, 0.08)' });
                    lastDay = currentDay;
                } else {
                    histogramData.push({ time: d.time as Time, value: 0 });
                }
            }
            histogramRef.current.setData(histogramData);
        }

        // 3. Clear Previous Lines (Zones & Liquidity & Equilibrium)
        activeLinesRef.current.forEach(line => {
             if (seriesApi.removePriceLine) {
                 seriesApi.removePriceLine(line);
             }
        });
        activeLinesRef.current = [];
        
        if (equilibriumLineRef.current) {
            if (seriesApi.removePriceLine) seriesApi.removePriceLine(equilibriumLineRef.current);
            equilibriumLineRef.current = null;
        }

        // 4. Draw Equilibrium Line (Dealing Range 50%)
        if (equilibrium && seriesApi.createPriceLine) {
            const eqLine = seriesApi.createPriceLine({
                price: equilibrium,
                color: '#a855f7', // Purple
                lineWidth: 1,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'EQ (50%)',
            });
            equilibriumLineRef.current = eqLine;
        }

        // 5. IMPROVED Zone Visualization with Age, Test Count, Success Rate
        // Use memoized sorted zones
        sortedZones.forEach(z => {
            if (!seriesApi.createPriceLine) return;

            const isBullish = z.type.includes('Bullish') || z.type === 'Unicorn Setup';
            const isUnicorn = z.type === 'Unicorn Setup';
            const isFVG = z.type.includes('FVG');
            
            // Color based on zone quality and status
            let mainColor = isBullish ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
            if (isUnicorn) mainColor = 'rgba(168, 85, 247, 0.9)';
            if (isFVG) mainColor = isBullish ? 'rgba(234, 179, 8, 0.9)' : 'rgba(234, 179, 8, 0.9)';
            
            // Adjust opacity based on zone age (fresher = more opaque)
            if (z.age) {
                const ageFactor = Math.max(0.5, 1 - (z.age / 100)); // Fade out older zones
                mainColor = mainColor.replace('0.9', ageFactor.toFixed(2));
            }
            
            // Build label with additional info
            let labelText = isUnicorn ? '🦄 UNICORN' : isFVG ? '⚠️ FVG' : '📦 OB';
            if (z.testCount && z.testCount > 0) {
                labelText += ` (${z.testCount}x)`;
            }
            if (z.age) {
                labelText += ` [${z.age}]`;
            }
            if (z.successRate !== undefined) {
                labelText += ` ${z.successRate.toFixed(0)}%`;
            }

            const topLine = seriesApi.createPriceLine({
                price: z.priceTop,
                color: mainColor,
                lineWidth: isUnicorn ? 2 : (z.score >= 80 ? 2 : 1),
                lineStyle: 0, 
                axisLabelVisible: true,
                title: labelText,
            });
            
            const bottomLine = seriesApi.createPriceLine({
                price: z.priceBottom,
                color: mainColor,
                lineWidth: isUnicorn ? 2 : (z.score >= 80 ? 2 : 1),
                lineStyle: isFVG ? 2 : 0, 
                axisLabelVisible: false,
                title: '',
            });

            if (topLine) activeLinesRef.current.push(topLine);
            if (bottomLine) activeLinesRef.current.push(bottomLine);
        });

        // 6. Draw Liquidity Levels
        liquidityLevels.forEach(lvl => {
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

        // 7. Set Markers
        const chartMarkers: SeriesMarker<Time>[] = sortedMarkers.map(m => ({
            time: m.time as Time,
            position: m.position,
            color: m.color,
            shape: m.shape,
            text: m.text,
            size: m.size || 1
        }));

        seriesApi.setMarkers(chartMarkers);

    }, [data, sortedZones, sortedMarkers, liquidityLevels, equilibrium]);

    return (
        <div ref={chartContainerRef} className="h-full w-full relative group bg-black">
             {/* Watermark */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-slate-800/20 pointer-events-none select-none z-0 tracking-tighter">
                VADI
             </div>
             <div className="absolute bottom-10 left-4 z-10 flex flex-col gap-1 pointer-events-none opacity-50 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-green-500"></div> Bullish OB</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-500"></div> Bearish OB</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-purple-500"></div> EQ (Denge)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 border-b border-purple-500 border-dashed"></div> ASIA Range</div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 border-b border-pink-500 border-dotted"></div> Midnight Open</div>
             </div>
        </div>
    );
};

export default React.memo(SmartChart);
