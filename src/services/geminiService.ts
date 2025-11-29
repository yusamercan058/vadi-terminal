
import { SMCZone, MarketBias, JournalEntry, LiquidityLevel } from "../types";

// API Key from environment variable
// Vite automatically exposes variables with VITE_ prefix
const API_KEY = (import.meta as any).env?.VITE_API_KEY || "";

// Get available models from API (as suggested by error message)
const getAvailableModels = async (): Promise<Array<{name: string, version: string}>> => {
  const versions = ['v1beta', 'v1'];
  const models: Array<{name: string, version: string}> = [];
  
  for (const version of versions) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          // Filter models that support generateContent
          const supportedModels = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => ({ name: m.name.replace(`models/`, ''), version }));
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
      { name: 'gemini-pro', version: 'v1beta' },
      { name: 'gemini-1.5-flash', version: 'v1beta' },
      { name: 'gemini-1.5-pro', version: 'v1beta' }
    ];
  }
  
  return models;
};

// Cache for available models
let cachedModels: Array<{name: string, version: string}> | null = null;

// Gemini API endpoint - Correct format based on official documentation
const getGeminiApiUrl = (model: string, version: string = 'v1beta') => {
  // Try different endpoint formats
  if (version === 'v1') {
    return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
};

const getSessionContext = () => {
    const hour = new Date().getUTCHours();
    if (hour >= 6 && hour < 10) return "LONDON OPEN (Volatilite ve Manipülasyon Yüksek)";
    if (hour >= 10 && hour < 13) return "LUNCH TIME (Düşük Hacim / Konsolidasyon)";
    if (hour >= 13 && hour < 17) return "NEW YORK OPEN (Trend Devamı veya Reversal)";
    if (hour >= 21 || hour < 6) return "ASIA SESSION (Genellikle Range/Konsolidasyon)";
    return "SESSION CLOSE / LOW VOLUME";
};

export const generateTradePlan = async (
  asset: string,
  zone: SMCZone,
  bias: MarketBias | null,
  liquidityLevels: LiquidityLevel[],
  currentPrice: number
): Promise<string> => {
  // API Key validation
  if (!API_KEY) {
    return "⚠️ HATA: API Anahtarı Bulunamadı. Lütfen .env dosyasında VITE_API_KEY değişkenini kontrol edin.";
  }

  // Validate API key format (should start with AIza)
  if (!API_KEY.startsWith('AIza')) {
    console.warn('⚠️ API key format may be incorrect. Expected format: AIza...');
  }

  // Kritik Kontrol
  if (!API_KEY) {
    console.error("API Key check:", { hasKey: !!API_KEY, keyLength: API_KEY?.length });
    return "⚠️ HATA: API Anahtarı Bulunamadı. Lütfen .env dosyasında VITE_API_KEY değişkenini kontrol edin.";
  }

  // 1. Context Building
  const session = getSessionContext();
  const zoneRange = Math.abs(zone.priceTop - zone.priceBottom).toFixed(5);
  
  // Calculate proximity to major liquidity (PDH/PDL/ASIA)
  let liquidityContext = "Likidite seviyelerine uzak.";
  const nearbyLiq = liquidityLevels.find(l => Math.abs(currentPrice - l.price) < (currentPrice * 0.002)); // 0.2% proximity
  if (nearbyLiq) {
      liquidityContext = `⚠️ DİKKAT: Fiyat ${nearbyLiq.label} seviyesine çok yakın (${nearbyLiq.price}). Stop Avı (Turtle Soup) riski yüksek.`;
  }
  
  // Midnight Open Analysis
  let midnightContext = "Nötr";
  if (bias?.midnightOpen) {
      midnightContext = currentPrice > bias.midnightOpen ? "Midnight Open ÜZERİNDE (Bullish/Premium)" : "Midnight Open ALTINDA (Bearish/Discount)";
  }

  let setupNarrative = "";
  if (zone.type === 'Unicorn Setup') setupNarrative = "🦄 UNICORN (A+ SETUP): Order Block ve FVG aynı noktada. Kurumsal ayak izi çok güçlü.";
  else if (zone.type.includes('FVG')) setupNarrative = "🌊 IMBALANCE FILL: Fiyat verimsizliği (FVG) dolduruyor. IPDA burayı onarmak istiyor.";
  else if (zone.type.includes('OB')) setupNarrative = "📦 ORDER BLOCK: Kurumsal emirlerin yığıldığı potansiyel destek/direnç.";

  // 2. IMPROVED PROMPT with Few-Shot Examples
  const prompt = `
    Rol: Kıdemli Hedge Fund Risk Yöneticisi ve ICT Mentoru. (Sert, Disiplinli, Teknik)
    
    ANALİZ EDİLECEK SETUP VERİLERİ:
    -----------------------------------------
    Varlık: ${asset} | Fiyat: ${currentPrice.toFixed(5)}
    Setup Tipi: ${zone.type} (${setupNarrative})
    Bölge: ${zone.priceBottom.toFixed(5)} - ${zone.priceTop.toFixed(5)} (Genişlik: ${zoneRange})
    Algoritma Skoru: ${zone.score}/100
    Zone Durumu: ${zone.status}${zone.testCount ? ` (${zone.testCount} test)` : ''}${zone.age ? ` (${zone.age} bar yaşında)` : ''}
    Confluence: ${zone.confluence.join(', ')}
    
    PİYASA ORTAMI (CONTEXT):
    -----------------------------------------
    Oturum (Time & Price): ${session}
    Trend (M15): ${bias?.mtf?.m15 || bias?.trend}
    Trend (H1): ${bias?.mtf?.h1 || bias?.trend}
    Trend (H4): ${bias?.mtf?.h4 || bias?.trend}
    Market Yapısı: ${bias?.structure}
    Premium/Discount: ${bias?.premiumDiscount} (IPDA Mantığı: ${bias?.premiumDiscount === 'Premium' ? 'Satış için uygun' : 'Alış için uygun'})
    Midnight Open Durumu: ${midnightContext}
    Likidite Durumu: ${liquidityContext}
    Volatilite: ${bias?.volatility || 'MEDIUM'}
    ATR: ${bias?.atrValue?.toFixed(5) || 'N/A'}
    
    ÖRNEK ANALİZ (Few-Shot Learning):
    -----------------------------------------
    Örnek 1 - Yüksek Kalite Setup:
    - Unicorn Setup, Skor: 85/100, Fresh, MTF uyumlu
    → Güven: 8.5/10, Risk: %0.5, Öneri: "Agresif giriş, LTF onayı ile"
    
    Örnek 2 - Orta Kalite Setup:
    - Bullish OB, Skor: 65/100, Tested (1x), H1 uyumlu
    → Güven: 6/10, Risk: %0.3, Öneri: "LTF onayı bekle, ChoCh + FVG"
    
    Örnek 3 - Düşük Kalite Setup:
    - Bearish FVG, Skor: 55/100, Likidite yakın
    → Güven: 4/10, Risk: %0.1, Öneri: "Dokunma, tuzak riski yüksek"
    
    GÖREV:
    Bu verileri kullanarak profesyonel, "No-Nonsense" bir işlem planı oluştur. Acemi trader gibi konuşma, kurumsal algo (IPDA) dilini kullan.
    Yukarıdaki örneklere benzer şekilde analiz yap.

    ÇIKTI FORMATI (TÜRKÇE):

    1. 🧠 KURUMSAL BAKIŞ (INSTITUTIONAL BIAS):
       - Algoritma şu an neden buraya geldi? (Likidite avı mı, Yeniden fiyatlama mı?)
       - "Inducement" (Tuzak) var mı? (Eğer konfirmasyon yoksa "Tuzak olabilir" diye uyar).
       - Zone yaşı ve test durumu değerlendirmesi
    
    2. 🛡️ GİRİŞ MODELİ (EXECUTION):
       - Nasıl girmeliyiz? (Agresif Market Emir mi? Yoksa LTF'de "ChoCh + FVG" onayı mı beklenmeli?)
       - Hangi mum formasyonunu aramalıyız?
       - Entry fiyatı önerisi (tam sayı)
       
    3. 🎯 HEDEFLER & GEÇERSİZLİK (TP & INVALIDATION):
       - Hedef 1 (Internal Liq - Zone genişliğinin 1.5-2x'i):
       - Hedef 2 (External Liq - PDH/PDL/Asia High-Low):
       - Setup ne zaman ÇÖP olur? (Hangi seviye kırılırsa?)
       - Stop Loss seviyesi (tam sayı)
       
    4. ⚖️ RİSK YÖNETİMİ & KARAR:
       - Güven Puanın (1-10 arası tam sayı, örnek: "Güven: 7/10"):
       - Önerilen Risk: (Örn: %0.5 veya %1.0)
       - R:R Oranı: (Risk/Reward hesaplaması)
       - SON SÖZ: (Kısa ve net bir emir cümlesi. Örn: "Onay yoksa dokunma.")

    Not: Emojileri stratejik kullan, metni boğma. Çıktı Markdown formatında olsun.
    Güven puanını mutlaka belirt (format: "Güven: X/10" veya "Confidence: X/10").
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
        
        // Simple: API key in query parameter
        const response = await fetch(`${apiUrl}?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            model: modelConfig.name,
            version: modelConfig.version
          };

          // If rate limit, wait a bit and try next model
          if (response.status === 429) {
            console.warn(`Rate limit for ${modelConfig.name}, trying next model...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            continue; // Try next model
          }

          // For 404, try next model (wrong model name or endpoint)
          if (response.status === 404) {
            const errorMsg = errorData?.error?.message || 'Model not found';
            console.warn(`Model ${modelConfig.name} (${modelConfig.version}) not found (404): ${errorMsg}`);
            
            // If all models fail with 404, provide helpful error message
            if (modelConfig === cachedModels![cachedModels!.length - 1]) {
              console.error('⚠️ All models returned 404. Possible issues:');
              console.error('1. API key may be invalid or expired');
              console.error('2. Generative Language API may not be enabled in Google Cloud Console');
              console.error('3. Billing may not be enabled for the project');
              console.error('4. API key restrictions may be blocking the request');
            }
            continue;
          }

          // For other errors, try next model
          if (response.status !== 400 && response.status !== 403) {
            continue;
          }

          // For 400/403, log and try next model
          console.warn(`Model ${modelConfig.name} failed with ${response.status}, trying next...`);
          continue;
        }

        // Success!
        const data = await response.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                       data?.response?.text || 
                       "Plan oluşturulamadı.";
        
        // IMPROVED Confidence Score Calculation
        // Try to extract confidence from AI response first
        let aiConfidenceFromText = 0;
        const confidenceMatch = result.match(/[Gg]üven[:\s]*(\d+(?:\.\d+)?)/i) || 
                                 result.match(/[Cc]onfidence[:\s]*(\d+(?:\.\d+)?)/i) ||
                                 result.match(/(\d+(?:\.\d+)?)\s*\/\s*10/i);
        if (confidenceMatch) {
            aiConfidenceFromText = parseFloat(confidenceMatch[1]);
        }
        
        // Base confidence calculation
        let confidence = 5; // Base confidence
        
        // Setup type confidence (weighted)
        if (zone.type === 'Unicorn Setup') confidence += 2.5;
        else if (zone.type.includes('OB')) confidence += 1.5;
        else if (zone.type.includes('FVG')) confidence += 1;
        
        // Zone score confidence (more weight)
        confidence += (zone.score / 100) * 2.5; // 0-2.5 points from score
        
        // Market bias confidence
        if (bias?.trend && bias.trend !== 'Range') confidence += 0.5;
        if (bias?.structure === 'BOS') confidence += 0.5;
        if (bias?.mtf?.m15 === bias?.trend && bias?.mtf?.h1 === bias?.trend) confidence += 0.5; // MTF alignment
        
        // Premium/Discount alignment
        if (zone.type.includes('Bullish') && bias?.premiumDiscount === 'Discount') confidence += 0.5;
        if (zone.type.includes('Bearish') && bias?.premiumDiscount === 'Premium') confidence += 0.5;
        
        // Liquidity proximity (negative if too close)
        if (nearbyLiq) confidence -= 1.5;
        
        // Session confidence
        const hour = new Date().getUTCHours();
        if ((hour >= 6 && hour < 10) || (hour >= 13 && hour < 17)) confidence += 0.5; // London/NY open
        
        // Zone age (fresher is better, but tested once is also good)
        if (zone.status === 'FRESH') confidence += 0.3;
        else if (zone.status === 'TESTED' && zone.testCount === 1) confidence += 0.5; // First test is often best
        
        // Combine with AI confidence if available
        if (aiConfidenceFromText > 0) {
            confidence = (confidence * 0.4) + (aiConfidenceFromText * 0.6); // 60% weight to AI
        }
        
        // Clamp to 1-10
        confidence = Math.max(1, Math.min(10, Math.round(confidence * 10) / 10));
        
        console.log(`Success with model: ${modelConfig.name}, Confidence: ${confidence}/10`);
        
        // Store confidence in result (we'll parse it later)
        return `[CONFIDENCE:${confidence}]${result}`;
      } catch (fetchError: any) {
        console.warn(`Error with model ${modelConfig.name}:`, fetchError);
        lastError = {
          ...fetchError,
          model: modelConfig.name,
          version: modelConfig.version
        };
        continue; // Try next model
      }
    }

    // All models failed
    if (lastError) {
      console.error("All Gemini models failed. Last error:", lastError);
      
      if (lastError.status === 429) {
        return "⚠️ HATA: API rate limit aşıldı. Tüm modeller denendi. Lütfen 1-2 dakika bekleyip tekrar deneyin. (Not: Ücretsiz API anahtarları için günlük limit sınırlıdır)";
      }
      if (lastError.status === 403) {
        return "⚠️ HATA: API erişim izni reddedildi. API anahtarınızın geçerli olduğundan ve Gemini API erişimine sahip olduğundan emin olun.";
      }
      if (lastError.status === 400) {
        return "⚠️ HATA: API isteği geçersiz. Lütfen API anahtarınızı ve model erişimini kontrol edin.";
      }
      
      // More detailed error message for 404
      if (lastError.status === 404) {
        const errorDetail = lastError?.error?.message || 'Model not found';
      return `⚠️ HATA: API erişim hatası (404).\n\n` +
             `Lütfen şunları kontrol edin:\n` +
             `1. Google Cloud Console'da "Generative Language API"nin etkinleştirildiğinden emin olun\n` +
             `2. API anahtarınızın geçerli olduğundan emin olun (AIza... formatında)\n` +
             `3. Projenizde faturalandırmanın etkinleştirildiğinden emin olun\n` +
             `4. API anahtarı kısıtlamalarının isteği engellemediğinden emin olun\n\n` +
             `Denenen modeller: ${cachedModels?.map(m => `${m.name} (${m.version})`).join(', ') || 'Yükleniyor...'}\n` +
             `Detay: ${errorDetail}`;
      }
      
      return `⚠️ HATA: Tüm modeller başarısız oldu. Son hata: ${lastError.status || lastError.message || 'Bilinmeyen'} (Model: ${lastError.model || 'N/A'}, Version: ${lastError.version || 'N/A'}). Lütfen birkaç dakika sonra tekrar deneyin.`;
    }

    return "⚠️ HATA: API çağrısı başarısız oldu.";
  } catch (error: any) {
    console.error("Gemini API Error Details:", {
      message: error?.message,
      error: error
    });
    
    if (error?.message?.includes('fetch')) {
      return "⚠️ HATA: İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.";
    }
    
    return `API Hatası: ${error?.message || 'Bilinmeyen hata'}. Lütfen internet bağlantınızı ve API anahtarınızı kontrol edin.`;
  }
};

export const analyzeJournal = async (trades: JournalEntry[]): Promise<string> => {
  if (!API_KEY) {
    return "⚠️ HATA: API Anahtarı Bulunamadı. Lütfen .env dosyasında VITE_API_KEY değişkenini kontrol edin.";
  }

  const tradeSummary = trades
    .map(t => `- ${t.date}: ${t.trader} ${t.asset} (${t.type}) -> ${t.status}. Not: ${t.note}`)
    .join('\n');

  const prompt = `
    Sen Vadi Terminal'in Baş Trader'ısın. Ekipten gelen işlem raporlarını acımasızca eleştir.
    
    İŞLEM GEÇMİŞİ:
    ${tradeSummary}

    RAPOR FORMATI (TÜRKÇE):
    1. 🛑 KIRMIZI BAYRAKLAR: Nerede hata yapılıyor? (Psikoloji, Teknik, Risk)
    2. ✅ YEŞİL BAYRAKLAR: Neler doğru yapılıyor?
    3. 🚀 GELİŞİM PLANI: Önümüzdeki hafta için net, uygulanabilir 3 teknik kural koy.
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
        
        // Simple: API key in query parameter (most reliable method)
        const response = await fetch(`${apiUrl}?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            model: modelConfig.name,
            version: modelConfig.version
          };

          // If rate limit, wait a bit and try next model
          if (response.status === 429) {
            console.warn(`Rate limit for ${modelConfig.name}, trying next model...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // For 404, try next model
          if (response.status === 404) {
            console.warn(`Model ${modelConfig.name} (${modelConfig.version}) not found (404), trying next...`);
            continue;
          }

          // For other errors, try next model
          if (response.status !== 400 && response.status !== 403) {
            continue;
          }

          console.warn(`Model ${modelConfig.name} failed with ${response.status}, trying next...`);
          continue;
        }

        // Success!
        const data = await response.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                       data?.response?.text || 
                       "Analiz yapılamadı.";
        
        return result;
      } catch (fetchError: any) {
        console.warn(`Error with model ${modelConfig.name}:`, fetchError);
        lastError = {
          ...fetchError,
          model: modelConfig.name,
          version: modelConfig.version
        };
        continue;
      }
    }

    // All models failed
    if (lastError) {
      if (lastError.status === 429) {
        return "⚠️ HATA: API rate limit aşıldı. Lütfen 1-2 dakika bekleyip tekrar deneyin.";
      }
      return `Analiz servisi başarısız: ${lastError.status || lastError.message || 'Bilinmeyen hata'}`;
    }

    return "Analiz servisi başarısız oldu.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Analiz servisi başarısız: ${error?.message || 'Bilinmeyen hata'}`;
  }
};
