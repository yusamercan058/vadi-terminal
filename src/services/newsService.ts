
import { NewsEvent, FXNews } from "../types";

// Mock Data to simulate Forex Factory Economic Calendar
// In a real production app, this would be a fetch call to a backend proxy.

const TITLES = {
    USD: ["CPI m/m", "Core PPI m/m", "Unemployment Claims", "Fed Chair Powell Speaks", "Non-Farm Employment Change", "FOMC Statement", "Retail Sales m/m", "GDP q/q"],
    EUR: ["Main Refinancing Rate", "Monetary Policy Statement", "German Flash Manufacturing PMI", "ECB Press Conference", "CPI Flash Estimate y/y", "German ZEW Economic Sentiment"],
    GBP: ["CPI y/y", "Official Bank Rate", "GDP m/m", "BOE Gov Bailey Speaks", "Retail Sales m/m", "Manufacturing PMI"],
    JPY: ["BOJ Policy Rate", "Monetary Policy Statement", "Core CPI y/y", "Tankan Manufacturing Index"],
    AUD: ["Cash Rate", "RBA Rate Statement", "Employment Change", "CPI q/q"],
    CAD: ["BOC Rate Statement", "Employment Change", "GDP m/m"],
    CHF: ["SNB Policy Rate", "CPI m/m"],
    NZD: ["RBNZ Rate Statement", "Employment Change q/q"]
};

const CURRENCY_COLORS: Record<string, string> = {
    'USD': '#ef4444', // Red
    'EUR': '#3b82f6', // Blue
    'GBP': '#22c55e', // Green
    'JPY': '#f59e0b', // Amber
    'AUD': '#8b5cf6', // Purple
    'CAD': '#ec4899', // Pink
    'CHF': '#06b6d4', // Cyan
    'NZD': '#f97316'  // Orange
};

export const getEconomicCalendar = (): NewsEvent[] => {
    const events: NewsEvent[] = [];
    const now = new Date();
    const currencies = ['USD', 'EUR', 'GBP', 'USD', 'USD', 'EUR'];
    
    // Generate events for the day
    for (let i = 0; i < 6; i++) {
        const hour = 8 + (i * 2) + Math.floor(Math.random() * 2); // Random times between 08:00 and 20:00
        const minute = Math.random() > 0.5 ? "30" : "00";
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
        
        const currency = currencies[i];
        const impactRand = Math.random();
        const impact = impactRand > 0.7 ? 'HIGH' : impactRand > 0.4 ? 'MEDIUM' : 'LOW';
        
        // Pick a random title relevant to currency
        const possibleTitles = TITLES[currency as keyof typeof TITLES] || ["Economic Data Release"];
        const title = possibleTitles[Math.floor(Math.random() * possibleTitles.length)];

        events.push({
            id: `news-${i}`,
            time: timeStr,
            currency: currency,
            impact: impact,
            title: title,
            forecast: `${(Math.random() * 5).toFixed(1)}%`,
            previous: `${(Math.random() * 5).toFixed(1)}%`
        });
    }

    // Sort by time
    return events.sort((a, b) => a.time.localeCompare(b.time));
};

// Deterministic random number generator based on seed (date)
const seededRandom = (seed: number) => {
    let value = seed;
    return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
};

// Forex Factory Style News Service - Only Today's Fixed Events
export const getForexNews = async (): Promise<FXNews[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const news: FXNews[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Use today's date as seed for deterministic news generation
    // This ensures the same news appear every time for the same day
    const dateSeed = today.getTime();
    const random = seededRandom(dateSeed);
    
    // Only show events for today (current day)
    // In a real app, this would fetch from Forex.com calendar API for today's date
    
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
    
    // Get current hour to determine if events have passed
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Predefined realistic news schedule for today (deterministic based on date)
    // This simulates a real economic calendar where events are scheduled in advance
    // You can modify this to have more or fewer events, or even empty array for days with no news
    
    // Example: Some days have news, some don't
    // Using day of week to simulate: Monday/Wednesday/Friday typically have more news
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Define fixed news events for today (based on day of week pattern)
    // In production, this would come from Forex.com API
    const todayEvents: Array<{
        hour: number;
        minute: number;
        currency: string;
        title: string;
        impact: 'HIGH' | 'MEDIUM' | 'LOW';
    }> = [];
    
    // Simulate realistic news schedule
    // Monday, Wednesday, Friday typically have more important news
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        // Monday/Wednesday/Friday - More news
        todayEvents.push(
            { hour: 8, minute: 30, currency: 'EUR', title: 'German Flash Manufacturing PMI', impact: 'MEDIUM' },
            { hour: 10, minute: 0, currency: 'GBP', title: 'Manufacturing PMI', impact: 'MEDIUM' },
            { hour: 12, minute: 30, currency: 'USD', title: 'Core PPI m/m', impact: 'MEDIUM' },
            { hour: 13, minute: 0, currency: 'USD', title: 'Unemployment Claims', impact: 'HIGH' },
            { hour: 14, minute: 0, currency: 'USD', title: 'Retail Sales m/m', impact: 'HIGH' }
        );
    } else if (dayOfWeek === 2 || dayOfWeek === 4) {
        // Tuesday/Thursday - Moderate news
        todayEvents.push(
            { hour: 9, minute: 0, currency: 'EUR', title: 'German ZEW Economic Sentiment', impact: 'MEDIUM' },
            { hour: 13, minute: 30, currency: 'USD', title: 'CPI m/m', impact: 'HIGH' }
        );
    } else {
        // Weekend - Usually no major news, but sometimes there are
        // For demo purposes, we'll show 1-2 low impact events
        if (random() > 0.5) {
            todayEvents.push(
                { hour: 10, minute: 0, currency: 'JPY', title: 'BOJ Policy Rate', impact: 'HIGH' }
            );
        }
    }
    
    // If no events scheduled for today, return empty array
    if (todayEvents.length === 0) {
        return [];
    }
    
    // Process each scheduled event
    todayEvents.forEach((event, index) => {
        const time = `${event.hour.toString().padStart(2, '0')}:${event.minute.toString().padStart(2, '0')}`;
        const eventTime = event.hour * 60 + event.minute;
        
        // Only show events that haven't passed yet (or within last 2 hours for review)
        if (eventTime < currentTime - 120) {
            return; // Skip events more than 2 hours old
        }
        
        const currency = event.currency;
        const title = event.title;
        const impact = event.impact;
        
        // Generate realistic economic data values (deterministic based on seed + index)
        const eventSeed = dateSeed + index;
        const eventRandom = seededRandom(eventSeed);
        
        let previous = '';
        let actual = '';
        let forecast = '';
        
        if (title.includes('CPI') || title.includes('PPI')) {
            // Inflation data (percentage)
            const baseValue = 2.0 + (eventRandom() * 3);
            previous = `${baseValue.toFixed(1)}%`;
            forecast = `${(baseValue + (eventRandom() - 0.5) * 0.5).toFixed(1)}%`;
            // If event hasn't happened yet, actual is empty, otherwise generate
            actual = eventTime <= currentTime ? `${(baseValue + (eventRandom() - 0.5) * 1.0).toFixed(1)}%` : '';
        } else if (title.includes('Employment') || title.includes('Unemployment')) {
            // Employment data (thousands or percentage)
            if (title.includes('Unemployment')) {
                const baseValue = 3.5 + (eventRandom() * 2);
                previous = `${baseValue.toFixed(1)}%`;
                forecast = `${(baseValue + (eventRandom() - 0.5) * 0.3).toFixed(1)}%`;
                actual = eventTime <= currentTime ? `${(baseValue + (eventRandom() - 0.5) * 0.5).toFixed(1)}%` : '';
            } else {
                const baseValue = 150 + (eventRandom() * 100);
                previous = `${Math.floor(baseValue)}K`;
                forecast = `${Math.floor(baseValue + (eventRandom() - 0.5) * 30)}K`;
                actual = eventTime <= currentTime ? `${Math.floor(baseValue + (eventRandom() - 0.5) * 50)}K` : '';
            }
        } else if (title.includes('GDP')) {
            // GDP data (percentage)
            const baseValue = 0.5 + (eventRandom() * 2);
            previous = `${baseValue.toFixed(1)}%`;
            forecast = `${(baseValue + (eventRandom() - 0.5) * 0.5).toFixed(1)}%`;
            actual = eventTime <= currentTime ? `${(baseValue + (eventRandom() - 0.5) * 0.8).toFixed(1)}%` : '';
        } else if (title.includes('Rate') && !title.includes('Statement')) {
            // Interest rate (percentage)
            const baseValue = 4.0 + (eventRandom() * 2);
            previous = `${baseValue.toFixed(2)}%`;
            forecast = `${(baseValue + (eventRandom() - 0.5) * 0.25).toFixed(2)}%`;
            actual = eventTime <= currentTime ? `${(baseValue + (eventRandom() - 0.5) * 0.25).toFixed(2)}%` : '';
        } else if (title.includes('PMI') || title.includes('Sentiment')) {
            // PMI/Sentiment (index number)
            const baseValue = 45 + (eventRandom() * 10);
            previous = `${Math.floor(baseValue)}`;
            forecast = `${Math.floor(baseValue + (eventRandom() - 0.5) * 3)}`;
            actual = eventTime <= currentTime ? `${Math.floor(baseValue + (eventRandom() - 0.5) * 5)}` : '';
        } else if (title.includes('Retail Sales')) {
            // Retail sales (percentage)
            const baseValue = 0.2 + (eventRandom() * 1.5);
            previous = `${baseValue.toFixed(1)}%`;
            forecast = `${(baseValue + (eventRandom() - 0.5) * 0.5).toFixed(1)}%`;
            actual = eventTime <= currentTime ? `${(baseValue + (eventRandom() - 0.5) * 0.8).toFixed(1)}%` : '';
        } else {
            // Generic data
            const baseValue = 1.0 + (eventRandom() * 3);
            previous = `${baseValue.toFixed(2)}`;
            forecast = `${(baseValue + (eventRandom() - 0.5) * 0.5).toFixed(2)}`;
            actual = eventTime <= currentTime ? `${(baseValue + (eventRandom() - 0.5) * 0.8).toFixed(2)}` : '';
        }
        
        // Color based on impact
        let color = '#eab308'; // Yellow for LOW
        if (impact === 'HIGH') color = '#ef4444'; // Red
        else if (impact === 'MEDIUM') color = '#f97316'; // Orange
        
        news.push({
            id: `fx-news-${today.getTime()}-${index}`,
            time: time,
            currency: currency,
            impact: impact,
            title: title,
            previous: previous,
            actual: actual || undefined, // Only show actual if event has passed
            forecast: forecast,
            color: color
        });
    });

    // Sort by time
    return news.sort((a, b) => a.time.localeCompare(b.time));
};
