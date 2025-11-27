
import { GoogleGenAI } from "@google/genai";
import { SMCZone, MarketBias, JournalEntry, LiquidityLevel } from "../types";

// Safely access process.env.API_KEY to prevent ReferenceError in strict browser environments
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
const ai = new GoogleGenAI({ apiKey });

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
  if (!apiKey) return "API Anahtarı bulunamadı (process.env.API_KEY).";

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

  // 2. The Prompt
  const prompt = `
    Rol: Kıdemli Hedge Fund Risk Yöneticisi ve ICT Mentoru. (Sert, Disiplinli, Teknik)
    
    ANALİZ EDİLECEK SETUP VERİLERİ:
    -----------------------------------------
    Varlık: ${asset} | Fiyat: ${currentPrice}
    Setup Tipi: ${zone.type} (${setupNarrative})
    Bölge: ${zone.priceBottom} - ${zone.priceTop} (Genişlik: ${zoneRange})
    Algoritma Skoru: ${zone.score}/100
    
    PİYASA ORTAMI (CONTEXT):
    -----------------------------------------
    Oturum (Time & Price): ${session}
    Trend (HTF): ${bias?.trend}
    Market Yapısı: ${bias?.structure}
    Premium/Discount: ${bias?.premiumDiscount} (IPDA Mantığı: ${bias?.premiumDiscount === 'Premium' ? 'Satış için uygun' : 'Alış için uygun'})
    Midnight Open Durumu: ${midnightContext}
    Likidite Durumu: ${liquidityContext}
    
    GÖREV:
    Bu verileri kullanarak profesyonel, "No-Nonsense" bir işlem planı oluştur. Acemi trader gibi konuşma, kurumsal algo (IPDA) dilini kullan.

    ÇIKTI FORMATI (TÜRKÇE):

    1. 🧠 KURUMSAL BAKIŞ (INSTITUTIONAL BIAS):
       - Algoritma şu an neden buraya geldi? (Likidite avı mı, Yeniden fiyatlama mı?)
       - "Inducement" (Tuzak) var mı? (Eğer konfirmasyon yoksa "Tuzak olabilir" diye uyar).
    
    2. 🛡️ GİRİŞ MODELİ (EXECUTION):
       - Nasıl girmeliyiz? (Agresif Market Emir mi? Yoksa LTF'de "ChoCh + FVG" onayı mı beklenmeli?)
       - Hangi mum formasyonunu aramalıyız?
       
    3. 🎯 HEDEFLER & GEÇERSİZLİK (TP & INVALIDATION):
       - Hedef 1 (Internal Liq):
       - Hedef 2 (External Liq - PDH/PDL/Asia High-Low):
       - Setup ne zaman ÇÖP olur? (Hangi seviye kırılırsa?)
       
    4. ⚖️ RİSK YÖNETİMİ & KARAR:
       - Güven Puanın (1-10):
       - Önerilen Risk: (Örn: %0.5 veya %1.0)
       - SON SÖZ: (Kısa ve net bir emir cümlesi. Örn: "Onay yoksa dokunma.")

    Not: Emojileri stratejik kullan, metni boğma. Çıktı Markdown formatında olsun.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7, // Slightly creative but grounded
      }
    });
    return response.text || "Plan oluşturulamadı.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "API Hatası: Analiz servisine ulaşılamadı. (API Key Kontrolü Yapın)";
  }
};

export const analyzeJournal = async (trades: JournalEntry[]): Promise<string> => {
  if (!apiKey) return "API Anahtarı bulunamadı.";

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
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Analiz yapılamadı.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analiz servisi başarısız.";
  }
};