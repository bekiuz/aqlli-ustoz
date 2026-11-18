# 🎓 Aqlli Ustoz — O‘zbek tilida AI O‘qituvchi

O‘zbekiston maktab o‘quvchilari va abituriyentlari uchun maxsus yaratilgan **Telegram bot**.  
Matematika, Ingliz tili, Fizika va boshqa fanlarda 24/7 yordam beradi.

---

## ✨ Xususiyatlar

- To‘liq **o‘zbek tilida** tushuntirish
- Matematika, Ingliz tili, Fizika, Kimyo, Biologiya, Dasturlash
- DTS va IELTS ga tayyorlovga mos
- Suhbat tarixini eslab qoladi
- **Bepul AI** lardan foydalanadi (Groq yoki Gemini)

---

## 🤖 Qaysi AI ishlatiladi?

| Provider     | Model                    | Afzalligi              | Bepulmi? |
|--------------|--------------------------|------------------------|----------|
| **Groq** (tavsiya) | Qwen 3.8 27B / GPT-OSS  | Juda tez               | ✅ Ha    |
| **Gemini**   | Gemini 2.5 Flash / 3.8   | Yuqori sifat           | ✅ Ha    |

**Tavsiya:** Avval **Groq** ni ulang (tez va bepul). Keyinroq sifat uchun Gemini ga o‘tishingiz mumkin.

---

## 🚀 O‘rnatish

### 1. Repositoryni klonlang

```bash
git clone https://github.com/bekiuz/aqlli-ustoz.git
cd aqlli-ustoz
```

### 2. Virtual environment

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment sozlang

```bash
cp .env.example .env
```

`.env` faylini ochib to‘ldiring:

```env
TELEGRAM_BOT_TOKEN=123456:ABC...          # @BotFather dan

AI_PROVIDER=groq                          # yoki gemini

GROQ_API_KEY=gsk_...                      # console.groq.com
GROQ_MODEL=qwen/qwen3.8-27b

# Agar Gemini ishlatmoqchi bo‘lsangiz:
# AI_PROVIDER=gemini
# GEMINI_API_KEY=AIza...
# GEMINI_MODEL=gemini-2.5-flash
```

### 4. Botni ishga tushiring

```bash
python bot/main.py
```

---

## 🔑 API kalitlarini qayerdan olish

### Telegram Bot Token
1. Telegramda [@BotFather](https://t.me/BotFather) ga kiring
2. `/newbot` buyrug‘ini yuboring
3. Nom va username bering
4. Berilgan tokenni `.env` ga yozing

### Groq API Key (bepul)
1. [console.groq.com](https://console.groq.com) ga kiring
2. Ro‘yxatdan o‘ting
3. API Keys bo‘limidan yangi key yarating

### Google Gemini API Key (bepul)
1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) ga kiring
2. “Create API key” bosing

---

## 📁 Loyiha strukturasi

```
aqlli-ustoz/
├── bot/
│   ├── main.py          # Asosiy bot kodi
│   └── ai_client.py     # Groq / Gemini klient
├── prompts/
│   └── system_prompt.txt
├── .env.example
├── requirements.txt
└── README.md
```

---

## 🛠️ Keyingi reja

- [ ] Foydalanuvchi progressini saqlash (database)
- [ ] Ovozli xabarlar (Speech-to-Text + TTS)
- [ ] Fanlar bo‘yicha maxsus rejimlar
- [ ] Ota-ona paneli
- [ ] Mobil ilova (Flutter)


## ☁️ Cloudflare'da 24/7 webhook rejimi

Tavsiya etilgan deploy varianti — Cloudflare Workers. Bu versiya polling emas, Telegram webhook bilan ishlaydi.

- AI: Cloudflare Workers AI, model `@cf/google/gemma-4-26b-a4b-it`
- Suhbat tarixi: Cloudflare KV (`HISTORY`), 30 kun saqlanadi
- Bot buyruqlari: `/start`, `/help`, `/clear`
- Sirlari: `TELEGRAM_BOT_TOKEN` va `TELEGRAM_WEBHOOK_SECRET` Cloudflare Worker Secrets ichida saqlanadi.

### Deploy

1. Cloudflare'da Worker yarating yoki `aqlli-ustoz` nomli Worker'ni tanlang.
2. Root'dagi `wrangler.toml` sozlamasini ishlating; KV namespace ID loyiha uchun yaratilgan.
3. Worker Secrets ichiga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_WEBHOOK_SECRET` qo‘shing. `SETUP_KEY` ham bir martalik webhook sozlash uchun kerak.
4. Worker'ni deploy qiling.
5. `GET /setup?key=<SETUP_KEY>` manzilini bir marta ochib Telegram webhook'ni ulang.
6. `GET /health` orqali holatini tekshiring.

> Workers AI bepul rejada kunlik foydalanish limiti bilan ishlaydi. Limit tugasa, AI javoblari keyingi resetgacha to‘xtashi mumkin.


---

## 📄 Litsenziya

MIT

---

**Yaratuvchi:** bekiuz  
**Loyiha:** Aqlli Ustoz — O‘zbek tilida AI o‘qituvchi
