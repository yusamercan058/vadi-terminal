import { SMCZone, MarketBias, LiquidityLevel, TraderProfile, JournalEntry, StructuredAIResponse } from '../types';

const API_KEY = (import.meta as any).env?.VITE_API_KEY || "";

// Get API URL
const getGeminiApiUrl = (model: string, version: string = 'v1') => {
  if (version === 'v1') {
    return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
};

// Get available models from API
const getAvailableModels = async (): Promise<Array<{name: string, version: string}>> => {
  const versions = ['v1', 'v1beta'];
  const models: Array<{name: string, version: string}> = [];
  
  for (const version of versions) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          const supportedModels = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => ({ 
              name: m.name.replace(`models/`, ''), 
              version 
            }));
          models.push(...supportedModels);
        }
      }
    } catch (error) {
      // Continue to next version
    }
  }
  
  // Fallback to common model names if ListModels fails
  if (models.length === 0) {
    return [
      { name: 'gemini-pro', version: 'v1' },
      { name: 'gemini-1.5-flash', version: 'v1' },
      { name: 'gemini-1.5-pro', version: 'v1' },
      { name: 'gemini-pro', version: 'v1beta' },
      { name: 'gemini-1.5-flash', version: 'v1beta' },
    ];
  }
  
  return models;
};

// Cache for available models
let cachedModels: Array<{name: string, version: string}> | null = null;

/**
 * 1. MULTIMODAL INPUT - Chart screenshot analizi
 */
export const analyzeChartImage = async (
  imageBase64: string,
  context: string,
  zone: SMCZone,
  currentPrice: number
): Promise<string> => {
  if (!API_KEY) {
    return "⚠️ HATA: API Anahtarı Bulunamadı. Lütfen .env dosyasında VITE_API_KEY değişkenini kontrol edin.";
  }

  // Get available models
  const getModels = async () => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          const supportedModels = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => ({ name: m.name.replace(`models/`, ''), version: 'v1beta' }));
          if (supportedModels.length > 0) return supportedModels;
        }
      }
    } catch (error) {
      // Fallback to default models
    }
    return [
      { name: 'gemini-1.5-flash', version: 'v1beta' },
      { name: 'gemini-1.5-pro', version: 'v1beta' },
      { name: 'gemini-pro-vision', version: 'v1beta' }
    ];
  };

  const models = await getModels();
  let lastError: any = null;

  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;

  // Detect MIME type
  let mimeType = "image/png";
  if (imageBase64.startsWith('data:image/jpeg') || imageBase64.startsWith('data:image/jpg')) {
    mimeType = "image/jpeg";
  } else if (imageBase64.startsWith('data:image/webp')) {
    mimeType = "image/webp";
  }

  // Try different models
  for (const modelConfig of models) {
    try {
      const apiUrl = getGeminiApiUrl(modelConfig.name, modelConfig.version);
      
      const response = await fetch(
        `${apiUrl}?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: context },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.7,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          model: modelConfig.name,
        };

        // If rate limit, wait and try next
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // If 404, try next model
        if (response.status === 404) {
          continue;
        }

        // For other errors, try next model
        if (response.status !== 400 && response.status !== 403) {
          continue;
        }
      } else {
        // Success!
        const data = await response.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Analiz yapılamadı.";
        return result;
      }
    } catch (fetchError: any) {
      lastError = {
        ...fetchError,
        model: modelConfig.name,
      };
      continue;
    }
  }

  // All models failed
  const errorMsg = lastError?.error?.message || lastError?.statusText || 'Bilinmeyen hata';
  const statusCode = lastError?.status || 'Unknown';
  
  if (statusCode === 404) {
    return `⚠️ HATA: Model bulunamadı (404). Lütfen API anahtarınızın geçerli olduğundan ve Generative Language API'nin etkinleştirildiğinden emin olun.`;
  }
  
  if (statusCode === 429) {
    return `⚠️ HATA: API rate limit aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.`;
  }
  
  return `⚠️ HATA: Görüntü analizi başarısız (${statusCode}). ${errorMsg}`;
};

/**
 * 2. FUNCTION CALLING - Structured JSON output
 */
export const getStructuredAnalysis = async (
  asset: string,
  zone: SMCZone,
  bias: MarketBias | null,
  liquidityLevels: LiquidityLevel[],
  currentPrice: number
): Promise<StructuredAIResponse> => {
  if (!API_KEY) {
    return {
      plan: "⚠️ HATA: API Anahtarı Bulunamadı.",
      entry: 0,
      stop: 0,
      target: 0,
      riskReward: 0,
      confidence: 0,
      reasoning: "⚠️ HATA: API Anahtarı Bulunamadı.",
      risks: [],
      alternatives: [],
      riskLevel: 'HIGH',
      recommendation: 'WEAK'
    };
  }

  const prompt = `
    Bu setup'ı analiz et ve JSON formatında döndür.
    
    SETUP BİLGİLERİ:
    - Asset: ${asset}
    - Setup: ${zone.type}
    - Score: ${zone.score}/100
    - Zone: ${zone.priceBottom.toFixed(5)} - ${zone.priceTop.toFixed(5)}
    - Current Price: ${currentPrice.toFixed(5)}
    - Status: ${zone.status}${zone.testCount ? ` (${zone.testCount} test)` : ''}
    - Trend (M15/H1/H4): ${bias?.mtf?.m15 || bias?.trend}/${bias?.mtf?.h1 || bias?.trend}/${bias?.mtf?.h4 || bias?.trend}
    - Premium/Discount: ${bias?.premiumDiscount || 'Unknown'}
    - Structure: ${bias?.structure || 'Unknown'}
    - Volatility: ${bias?.volatility || 'MEDIUM'}
    
    ÖRNEK ÇIKTI:
    {
      "confidence": 8,
      "entry": 1.08500,
      "stop": 1.08200,
      "target": 1.09100,
      "reasoning": "Unicorn setup, MTF uyumlu, yüksek skor",
      "riskLevel": "LOW",
      "recommendation": "STRONG"
    }
    
    JSON formatı (sadece JSON, başka metin yok):
    {
      "confidence": 1-10 arası tam sayı,
      "entry": giriş fiyatı (number, 5 decimal),
      "stop": stop loss fiyatı (number, 5 decimal),
      "target": take profit fiyatı (number, 5 decimal),
      "reasoning": "Kısa analiz açıklaması (max 100 karakter)",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "recommendation": "STRONG" | "MODERATE" | "WEAK"
    }
  `;

  try {
    // Get available models (cache on first call)
    if (!cachedModels) {
      cachedModels = await getAvailableModels();
    }
    
    // Try different models in order
    let lastError: any = null;
    
    for (const modelConfig of cachedModels) {
      try {
        const apiUrl = getGeminiApiUrl(modelConfig.name, modelConfig.version);
        
        const response = await fetch(
          `${apiUrl}?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3, // Lower for more consistent output
                responseMimeType: "application/json",
              }
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            model: modelConfig.name,
            version: modelConfig.version
          };

          // If 404 (model not found), try next model
          if (response.status === 404) {
            console.warn(`Model ${modelConfig.name} (${modelConfig.version}) not found (404), trying next...`);
            continue;
          }

          // For other errors, try next model
          if (response.status !== 400 && response.status !== 403) {
            continue;
          }

          // For 400/403, throw error
          const errorMessage = errorData?.error?.message || `API request failed (${response.status})`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        // Try to parse JSON (might be wrapped in markdown code blocks)
        let jsonText = text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        let parsed;
        try {
          parsed = JSON.parse(jsonText);
        } catch (parseError: any) {
          throw new Error(`JSON parse error: ${parseError.message || 'Invalid JSON response'}`);
        }
        
        return {
          plan: parsed.plan || 'Plan oluşturulamadı.',
          entry: parsed.entry || 0,
          stop: parsed.stop || 0,
          target: parsed.target || 0,
          riskReward: parsed.riskReward || 0,
          confidence: parsed.confidence || 5,
          reasoning: parsed.reasoning || 'Analiz yapılamadı.',
          risks: parsed.risks || [],
          alternatives: parsed.alternatives || [],
          riskLevel: parsed.riskLevel || 'MEDIUM',
          recommendation: parsed.recommendation || 'MODERATE'
        };
      } catch (error: any) {
        // If it's a JSON parse error or 400/403, don't try next model
        if (error.message?.includes('JSON parse') || error.message?.includes('400') || error.message?.includes('403')) {
          throw error;
        }
        lastError = error;
        continue;
      }
    }
    
    // If all models failed, throw last error
    if (lastError) {
      throw new Error(lastError.error?.message || lastError.message || 'All models failed');
    }
    
    throw new Error('No models available');
  } catch (error: any) {
    const errorMsg = error.message || 'Bilinmeyen hata';
    // API key kontrolü
    if (errorMsg.includes('API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
      return {
        plan: "⚠️ HATA: API anahtarı geçersiz veya eksik. Lütfen VITE_API_KEY environment variable'ını kontrol edin.",
        entry: 0,
        stop: 0,
        target: 0,
        riskReward: 0,
        confidence: 0,
        reasoning: "⚠️ HATA: API anahtarı geçersiz veya eksik. Lütfen VITE_API_KEY environment variable'ını kontrol edin.",
        risks: [],
        alternatives: [],
        riskLevel: 'HIGH',
        recommendation: 'WEAK'
      };
    }
    // Rate limit kontrolü
    if (errorMsg.includes('429') || errorMsg.includes('quota')) {
      return {
        plan: "⚠️ HATA: API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.",
        entry: 0,
        stop: 0,
        target: 0,
        riskReward: 0,
        confidence: 0,
        reasoning: "⚠️ HATA: API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.",
        risks: [],
        alternatives: [],
        riskLevel: 'HIGH',
        recommendation: 'WEAK'
      };
    }
    return {
      plan: `⚠️ HATA: ${errorMsg}`,
      entry: 0,
      stop: 0,
      target: 0,
      riskReward: 0,
      confidence: 5,
      reasoning: `⚠️ HATA: ${errorMsg}`,
      risks: [],
      alternatives: [],
      riskLevel: 'MEDIUM',
      recommendation: 'MODERATE'
    };
  }
};

/**
 * 3. STREAMING RESPONSES - Real-time AI responses
 */
export const streamAIResponse = async (
  prompt: string,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
): Promise<void> => {
  if (!API_KEY) {
    onComplete("⚠️ HATA: API Anahtarı Bulunamadı. Lütfen VITE_API_KEY environment variable'ını ayarlayın.");
    return;
  }

  try {
    // Get available models (cache on first call)
    if (!cachedModels) {
      cachedModels = await getAvailableModels();
    }
    
    // Try different models in order
    let lastError: any = null;
    
    for (const modelConfig of cachedModels) {
      try {
        const apiUrl = getGeminiApiUrl(modelConfig.name, modelConfig.version);
        
        const response = await fetch(
          `${apiUrl}?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
              }
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            model: modelConfig.name,
            version: modelConfig.version
          };

          // If 404 (model not found), try next model
          if (response.status === 404) {
            console.warn(`Model ${modelConfig.name} (${modelConfig.version}) not found (404), trying next...`);
            continue;
          }

          // For other errors, try next model
          if (response.status !== 400 && response.status !== 403) {
            continue;
          }

          // For 400/403, throw error
          const errorMessage = errorData?.error?.message || `Stream request failed (${response.status})`;
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) {
          // Fallback to regular response if streaming not supported
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          onComplete(text);
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  fullText += text;
                  onChunk(text);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        onComplete(fullText);
        return; // Success, exit function
      } catch (error: any) {
        // If it's a 400/403 error, don't try next model
        if (error.message?.includes('400') || error.message?.includes('403')) {
          throw error;
        }
        lastError = error;
        continue;
      }
    }
    
    // If all models failed, throw last error
    if (lastError) {
      throw new Error(lastError.error?.message || lastError.message || 'All models failed');
    }
    
    throw new Error('No models available');
  } catch (error: any) {
    const errorMsg = error.message || 'Streaming hatası';
    // API key kontrolü
    if (errorMsg.includes('API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
      onComplete("⚠️ HATA: API anahtarı geçersiz veya eksik. Lütfen VITE_API_KEY environment variable'ını kontrol edin.");
    } else if (errorMsg.includes('429') || errorMsg.includes('quota')) {
      onComplete("⚠️ HATA: API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.");
    } else {
      onComplete(`⚠️ HATA: ${errorMsg}`);
    }
  }
};

/**
 * 4. CONTEXT MEMORY - Trader profili öğrenme
 */
export const generateWithContext = async (
  prompt: string,
  traderProfile: TraderProfile,
  recentTrades: JournalEntry[]
): Promise<string> => {
  if (!API_KEY || API_KEY.trim() === '') {
    return "⚠️ HATA: API Anahtarı Bulunamadı. Lütfen VITE_API_KEY environment variable'ını ayarlayın.";
  }

  const systemInstruction = `
    Sen ${traderProfile.preferredStyle} tarzında işlem yapan bir trader'ın AI asistanısın.
    
    TRADER PROFİLİ:
    - Risk Toleransı: ${traderProfile.riskTolerance}
    - Tercih Edilen Stil: ${traderProfile.preferredStyle}
    - Win Rate: ${(traderProfile.winRate ?? 0).toFixed(1)}%
    - Ortalama R:R: 1:${(traderProfile.avgRR ?? 0).toFixed(2)}
    - Toplam İşlem: ${traderProfile.totalTrades ?? 0}
    - Favori Asset'ler: ${(traderProfile.favoriteAssets ?? []).join(', ')}
    - Favori Setup'lar: ${(traderProfile.favoriteSetups ?? []).join(', ')}
    
    SON İŞLEMLER (Öğrenme için):
    ${recentTrades.slice(0, 10).map(t => 
      `- ${t.type} (${t.asset}): ${t.status}, R:R: ${t.riskReward || 'N/A'}`
    ).join('\n')}
    
    Bu bilgilere göre kişiselleştirilmiş, trader'ın stilini yansıtan planlar oluştur.
    Trader'ın geçmiş başarılarına ve tercihlerine uygun öneriler ver.
  `;

  try {
    // Get available models (cache on first call)
    if (!cachedModels) {
      cachedModels = await getAvailableModels();
    }
    
    // Try different models in order
    let lastError: any = null;
    
    for (const modelConfig of cachedModels) {
      try {
        const apiUrl = getGeminiApiUrl(modelConfig.name, modelConfig.version);
        
        const response = await fetch(
          `${apiUrl}?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
              }
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            model: modelConfig.name,
            version: modelConfig.version
          };

          // If 404 (model not found), try next model
          if (response.status === 404) {
            console.warn(`Model ${modelConfig.name} (${modelConfig.version}) not found (404), trying next...`);
            continue;
          }

          // For other errors, try next model
          if (response.status !== 400 && response.status !== 403) {
            continue;
          }

          // For 400/403, throw error
          const errorMessage = errorData?.error?.message || `API request failed (${response.status})`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Plan oluşturulamadı.";
      } catch (error: any) {
        // If it's a 400/403 error, don't try next model
        if (error.message?.includes('400') || error.message?.includes('403')) {
          throw error;
        }
        lastError = error;
        continue;
      }
    }
    
    // If all models failed, throw last error
    if (lastError) {
      throw new Error(lastError.error?.message || lastError.message || 'All models failed');
    }
    
    throw new Error('No models available');
  } catch (error: any) {
    const errorMsg = error.message || 'Bilinmeyen hata';
    // API key kontrolü
    if (errorMsg.includes('API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
      return `⚠️ HATA: API anahtarı geçersiz veya eksik. Lütfen VITE_API_KEY environment variable'ını kontrol edin.`;
    }
    // Rate limit kontrolü
    if (errorMsg.includes('429') || errorMsg.includes('quota')) {
      return `⚠️ HATA: API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.`;
    }
    return `⚠️ HATA: ${errorMsg}`;
  }
};

/**
 * 5. MULTI-TURN CONVERSATIONS
 */
export const chatWithAI = async (
  userMessage: string,
  conversationHistory: Array<{role: 'user' | 'model', content: string}>
): Promise<string> => {
  if (!API_KEY) {
    return "⚠️ HATA: API Anahtarı Bulunamadı. Lütfen .env dosyasında VITE_API_KEY değişkenini kontrol edin.";
  }

  // Get available models (use cached if available)
  const getModels = async () => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          const supportedModels = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => ({ name: m.name.replace(`models/`, ''), version: 'v1beta' }));
          if (supportedModels.length > 0) return supportedModels;
        }
      }
    } catch (error) {
      // Fallback to default models
    }
    return [
      { name: 'gemini-1.5-flash', version: 'v1beta' },
      { name: 'gemini-1.5-pro', version: 'v1beta' },
      { name: 'gemini-pro', version: 'v1beta' }
    ];
  };

  const models = await getModels();
  let lastError: any = null;

  // Try different models
  for (const modelConfig of models) {
    try {
      const contents = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const apiUrl = getGeminiApiUrl(modelConfig.name, modelConfig.version);
      const response = await fetch(
        `${apiUrl}?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          model: modelConfig.name,
        };

        // If rate limit, wait and try next
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // If 404, try next model
        if (response.status === 404) {
          continue;
        }

        // For other errors, try next model
        if (response.status !== 400 && response.status !== 403) {
          continue;
        }
      } else {
        // Success!
        const data = await response.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt oluşturulamadı.";
        return result;
      }
    } catch (fetchError: any) {
      lastError = {
        ...fetchError,
        model: modelConfig.name,
      };
      continue;
    }
  }

  // All models failed
  const errorMsg = lastError?.error?.message || lastError?.statusText || 'Bilinmeyen hata';
  const statusCode = lastError?.status || 'Unknown';
  
  if (statusCode === 404) {
    return `⚠️ HATA: Model bulunamadı (404). Lütfen API anahtarınızın geçerli olduğundan ve Generative Language API'nin etkinleştirildiğinden emin olun.`;
  }
  
  if (statusCode === 429) {
    return `⚠️ HATA: API rate limit aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.`;
  }
  
  return `⚠️ HATA: API isteği başarısız oldu (${statusCode}). ${errorMsg}`;
};

/**
 * Helper: Get trader profile from trades
 */
export const buildTraderProfile = (trades: JournalEntry[]): TraderProfile => {
  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  const wins = closedTrades.filter(t => t.status === 'WIN');
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  
  const rrs = closedTrades
    .filter(t => t.riskReward)
    .map(t => t.riskReward || 0);
  const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  
  // Count favorite assets
  const assetCounts = closedTrades.reduce((acc, t) => {
    acc[t.asset] = (acc[t.asset] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const favoriteAssets = Object.entries(assetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([asset]) => asset);
  
  // Count favorite setups
  const setupCounts = closedTrades.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const favoriteSetups = Object.entries(setupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([setup]) => setup);
  
  // Determine preferred style (simplified)
  const avgHoldingTime = 60; // minutes (simplified)
  let preferredStyle: 'SCALP' | 'SWING' | 'POSITION' = 'SWING';
  if (avgHoldingTime < 30) preferredStyle = 'SCALP';
  else if (avgHoldingTime > 240) preferredStyle = 'POSITION';
  
  // Determine risk tolerance
  const avgRisk = closedTrades.length > 0 
    ? closedTrades.reduce((sum, t) => {
        const entry = parseFloat(t.entry);
        const stop = parseFloat(t.stop);
        if (!isNaN(entry) && !isNaN(stop)) {
          return sum + Math.abs(entry - stop) / entry;
        }
        return sum;
      }, 0) / closedTrades.length
    : 0.01;
  
  let riskTolerance: 'Low' | 'Medium' | 'High' = 'Medium';
  if (avgRisk < 0.005) riskTolerance = 'Low';
  else if (avgRisk > 0.02) riskTolerance = 'High';

  return {
    tradingStyle: preferredStyle,
    preferredSetups: favoriteSetups,
    riskTolerance,
    averageHoldTime: `${avgHoldingTime} minutes`,
    strengths: [],
    weaknesses: [],
    improvementAreas: [],
    preferredStyle,
    winRate,
    avgRR,
    totalTrades: closedTrades.length,
    favoriteAssets,
    favoriteSetups,
  };
};

