# 🚀 Deployment Rehberi

## Vercel ile Deploy (Önerilen)

### 1. GitHub'a Push
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git push -u origin main
```

### 2. Vercel'e Deploy
1. [vercel.com](https://vercel.com) adresine git
2. "Sign Up" ile GitHub hesabınla giriş yap
3. "Add New Project" butonuna tıkla
4. GitHub repo'nu seç
5. **Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build` (otomatik)
   - Output Directory: `dist` (otomatik)
6. **Environment Variables:**
   - `VITE_API_KEY` = Google Gemini API anahtarın
7. "Deploy" butonuna tıkla

### 3. Domain Ayarları (Opsiyonel)
- Vercel otomatik bir domain verir: `proje-adi.vercel.app`
- Custom domain eklemek için:
  - Project Settings > Domains
  - Domain'ini ekle ve DNS ayarlarını yap

---

## Netlify ile Deploy

### 1. GitHub'a Push (yukarıdaki gibi)

### 2. Netlify'e Deploy
1. [netlify.com](https://netlify.com) adresine git
2. "Sign up" ile GitHub hesabınla giriş yap
3. "Add new site" > "Import an existing project"
4. GitHub repo'nu seç
5. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
6. **Environment variables:**
   - `VITE_API_KEY` = Google Gemini API anahtarın
7. "Deploy site" butonuna tıkla

---

## Cloudflare Pages ile Deploy

### 1. GitHub'a Push (yukarıdaki gibi)

### 2. Cloudflare Pages'e Deploy
1. [dash.cloudflare.com](https://dash.cloudflare.com) adresine git
2. "Workers & Pages" > "Create application" > "Pages" > "Connect to Git"
3. GitHub repo'nu seç
4. **Build settings:**
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Environment variables:**
   - `VITE_API_KEY` = Google Gemini API anahtarın
6. "Save and Deploy" butonuna tıkla

---

## ⚠️ Önemli Notlar

### Environment Variables
- **Vercel/Netlify/Cloudflare'de** Environment Variables kısmından `VITE_API_KEY` ekle
- `.env` dosyasını **ASLA** GitHub'a push etme (güvenlik riski)
- `.env` dosyasını `.gitignore`'a ekle

### API Key Güvenliği
- Google Gemini API key'ini environment variable olarak ekle
- Production'da rate limiting yapılandırması yapabilirsin

### Build Optimizasyonu
- Vite otomatik olarak code splitting yapar
- Büyük chunk uyarısı normal (lightweight-charts kütüphanesi büyük)

---

## 🎯 Hangi Platformu Seçmeliyim?

| Platform | Hız | Kolaylık | Ücretsiz Limit | Önerilen |
|----------|-----|----------|----------------|----------|
| **Vercel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Çok iyi | ✅ En iyi seçim |
| **Netlify** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | İyi | ✅ İyi alternatif |
| **Cloudflare Pages** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Çok iyi | ✅ Çok hızlı |
| **GitHub Pages** | ⭐⭐⭐ | ⭐⭐⭐ | Sınırlı | ⚠️ Basit projeler için |

**Öneri:** Vercel - React/Vite projeleri için en optimize platform.

---

## 📝 Hızlı Başlangıç (Vercel)

```bash
# 1. GitHub'a push
git add .
git commit -m "Ready for deployment"
git push

# 2. Vercel CLI ile (opsiyonel)
npm i -g vercel
vercel
```

Vercel otomatik olarak:
- ✅ Build yapar
- ✅ Deploy eder
- ✅ Her push'ta yeniden deploy eder (CI/CD)
- ✅ Preview URL verir

---

## 🔗 Faydalı Linkler

- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

