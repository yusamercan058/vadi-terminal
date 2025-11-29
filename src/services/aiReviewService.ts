import { JournalEntry } from '../types';
import { generateWithContext } from './advancedGeminiService';

/**
 * AI Trade Review - Analyze a closed trade and provide feedback
 */
export const reviewTrade = async (trade: JournalEntry): Promise<string> => {
  const context = `
Trade Review Request:
- Asset: ${trade.asset}
- Setup: ${trade.type}
- Entry: ${trade.entry}
- Stop: ${trade.stop}
- Target: ${trade.target}
- Exit Price: ${trade.exitPrice || 'N/A'}
- Status: ${trade.status}
- P&L: ${trade.pnl || 0}
- Risk/Reward: ${trade.riskReward || 'N/A'}
- Date: ${trade.date}
- Notes: ${trade.note || 'None'}

Please provide a detailed review of this trade:
1. What went well?
2. What could be improved?
3. Was the entry timing optimal?
4. Was the risk management appropriate?
5. Any lessons learned?

Be specific and actionable.`;

  try {
    const review = await generateWithContext(context, {} as any, []);
    return review;
  } catch (error) {
    console.error('AI Review error:', error);
    return 'Unable to generate review at this time.';
  }
};

/**
 * AI Setup Quality Scoring - Rate a setup before entry
 */
export const scoreSetupQuality = async (
  setup: {
    type: string;
    asset: string;
    entry: number;
    stop: number;
    target: number;
    marketBias?: string;
    session?: string;
    confidence?: number;
  }
): Promise<{
  score: number; // 1-10
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'STRONG' | 'MODERATE' | 'WEAK';
}> => {
  const context = `
Setup Kalite Değerlendirmesi:
- Setup Tipi: ${setup.type}
- Varlık: ${setup.asset}
- Giriş: ${setup.entry}
- Stop Loss: ${setup.stop}
- Hedef: ${setup.target}
- Piyasa Eğilimi: ${setup.marketBias || 'Bilinmiyor'}
- Seans: ${setup.session || 'Bilinmiyor'}
- AI Güven: ${setup.confidence || 'N/A'}

Risk/Ödül oranını hesapla ve değerlendir:
1. Setup kalitesi (1-10 arası)
2. Güçlü yönler
3. Zayıf yönler
4. Genel öneri (STRONG, MODERATE, veya WEAK)

TÜRKÇE olarak JSON formatında yanıt ver:
{
  "score": 8,
  "reasoning": "Detaylı açıklama (Türkçe)...",
  "strengths": ["güçlü yön 1 (Türkçe)", "güçlü yön 2 (Türkçe)"],
  "weaknesses": ["zayıf yön 1 (Türkçe)"],
  "recommendation": "STRONG"
}

ÖNEMLİ: Tüm yanıtlar TÜRKÇE olmalı. reasoning, strengths ve weaknesses alanları Türkçe yazılmalı.`;

  try {
    const response = await generateWithContext(context, {} as any, []);
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(1, Math.min(10, parsed.score || 5)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendation: parsed.recommendation || 'MODERATE',
      };
    }

    // Fallback if JSON parsing fails
    const scoreMatch = response.match(/score[:\s]*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

    return {
      score: Math.max(1, Math.min(10, score)),
      reasoning: response,
      strengths: [],
      weaknesses: [],
      recommendation: score >= 8 ? 'STRONG' : score >= 5 ? 'MODERATE' : 'WEAK',
    };
  } catch (error: any) {
    console.error('AI Scoring error:', error);
    const errorMsg = error.message || 'Bilinmeyen hata';
    // API key kontrolü
    if (errorMsg.includes('API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
      return {
        score: 5,
        reasoning: '⚠️ API anahtarı geçersiz veya eksik. Lütfen VITE_API_KEY environment variable\'ını kontrol edin.',
        strengths: [],
        weaknesses: [],
        recommendation: 'MODERATE',
      };
    }
    // Rate limit kontrolü
    if (errorMsg.includes('429') || errorMsg.includes('quota')) {
      return {
        score: 5,
        reasoning: '⚠️ API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.',
        strengths: [],
        weaknesses: [],
        recommendation: 'MODERATE',
      };
    }
    return {
      score: 5,
      reasoning: `⚠️ ${errorMsg}`,
      strengths: [],
      weaknesses: [],
      recommendation: 'MODERATE',
    };
  }
};

