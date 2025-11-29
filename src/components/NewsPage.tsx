import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, Clock } from 'lucide-react';
import { FXNews } from '../types';
import { getForexNews } from '../services/newsService';

const NewsPage: React.FC = () => {
    const [news, setNews] = useState<FXNews[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            const newsData = await getForexNews();
            setNews(newsData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Haber yükleme hatası:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
        // Her 4 saatte bir güncelle
        const interval = setInterval(fetchNews, 4 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getImpactDot = (impact: FXNews['impact'], color: string) => {
        return (
            <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
                title={impact}
            />
        );
    };

    const compareValues = (actual: string | undefined, previous: string): 'up' | 'down' | 'neutral' => {
        // If actual is not available, return neutral
        if (!actual || actual === '') return 'neutral';
        
        // Remove % and K suffixes for comparison
        const actualNum = parseFloat(actual.replace('%', '').replace('K', ''));
        const previousNum = parseFloat(previous.replace('%', '').replace('K', ''));
        
        if (isNaN(actualNum) || isNaN(previousNum)) return 'neutral';
        
        if (actualNum > previousNum) return 'up';
        if (actualNum < previousNum) return 'down';
        return 'neutral';
    };

    return (
        <div className="flex-1 bg-[#0b0e14] p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                            <Newspaper className="w-8 h-8 text-cyan-500" /> Forex Factory - Ekonomik Takvim
                        </h1>
                        {lastUpdate && (
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Clock className="w-4 h-4" />
                                Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={fetchNews}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                </div>

                {/* Loading State */}
                {isLoading && news.length === 0 ? (
                    <div className="bg-[#151921] border border-slate-800 rounded-xl p-12 text-center">
                        <RefreshCw className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Haberler yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 p-4 bg-[#0f1219] border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                            <div className="col-span-1">Saat</div>
                            <div className="col-span-1">Para Birimi</div>
                            <div className="col-span-1 text-center">Etki</div>
                            <div className="col-span-4">Haber</div>
                            <div className="col-span-1 text-right">Previous</div>
                            <div className="col-span-1 text-right">Forecast</div>
                            <div className="col-span-2 text-right">Actual</div>
                            <div className="col-span-1 text-center">Durum</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-800">
                            {news.map((item) => {
                                const comparison = compareValues(item.actual, item.previous);
                                return (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-12 gap-2 p-4 hover:bg-slate-800/30 transition-colors items-center text-sm"
                                    >
                                        {/* Time */}
                                        <div className="col-span-1 font-mono text-slate-300 font-bold">
                                            {item.time}
                                        </div>

                                        {/* Currency */}
                                        <div className="col-span-1">
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-slate-800 text-white">
                                                {item.currency}
                                            </span>
                                        </div>

                                        {/* Impact Dot */}
                                        <div className="col-span-1 flex justify-center">
                                            {getImpactDot(item.impact, item.color)}
                                        </div>

                                        {/* Title */}
                                        <div className="col-span-4 text-slate-200 font-medium">
                                            {item.title}
                                        </div>

                                        {/* Previous */}
                                        <div className="col-span-1 text-right font-mono text-slate-400">
                                            {item.previous}
                                        </div>

                                        {/* Forecast */}
                                        <div className="col-span-1 text-right font-mono text-slate-500">
                                            {item.forecast || '-'}
                                        </div>

                                        {/* Actual */}
                                        <div className="col-span-2 text-right font-mono font-bold">
                                            {item.actual ? (
                                                <span
                                                    className={
                                                        comparison === 'up'
                                                            ? 'text-green-400'
                                                            : comparison === 'down'
                                                            ? 'text-red-400'
                                                            : 'text-slate-300'
                                                    }
                                                >
                                                    {item.actual}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </div>

                                        {/* Status Indicator */}
                                        <div className="col-span-1 flex justify-center">
                                            {comparison === 'up' && (
                                                <span className="text-green-400 font-bold">↑</span>
                                            )}
                                            {comparison === 'down' && (
                                                <span className="text-red-400 font-bold">↓</span>
                                            )}
                                            {comparison === 'neutral' && (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="p-4 bg-[#0f1219] border-t border-slate-800 flex items-center gap-6 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span>Yüksek Etki</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span>Orta Etki</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span>Düşük Etki</span>
                            </div>
                            <div className="ml-auto flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400 font-bold">↑</span>
                                    <span>Actual &gt; Previous</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400 font-bold">↓</span>
                                    <span>Actual &lt; Previous</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsPage;
