const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const HISTORY_TTL = 60 * 60 * 24 * 30;
const APP_KEY = "web:app:html";
const APP_URL = "https://aqlli-ustoz.bekiuz67.workers.dev/app";

const SYSTEM_PROMPT = [
  "Sen Aqlli Ustoz — O‘zbekiston o‘quvchilari va abituriyentlari uchun sabrli, professional AI o‘qituvchisan.",
  "Odatiy javob tiling o‘zbek tili. Foydalanuvchi aniq ruscha yoki inglizcha so‘rasa, o‘sha tilda javob ber. Foydalanuvchi alohida so‘ramasa, turk tilida javob berma.",
  "Matematika, fizika, kimyo, biologiya, ingliz tili, IELTS, tarix, ona tili va dasturlashda yordam ber.",
  "Xatolarni muloyim tuzat. Misollar bilan tushuntir. Hisob-kitoblarni tekshir. Bilmaganingni to‘qima.",
  "Javobni kerakli darajada ixcham yoz, keraksiz uzun kirishlardan qoch."
].join("\n");

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function serveApp(env) {
  const page = await env.HISTORY.get(APP_KEY);
  if (!page) return new Response("Platforma HTML fayli topilmadi.", { status: 503 });
  return new Response(page, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}

async function telegram(env, method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description || "Telegram API xatosi");
  return data.result;
}

async function sendText(env, chatId, text, extra) {
  const safeText = String(text || "Kechirasiz, javob tayyorlay olmadim.").trim();
  const chunks = [];
  for (let i = 0; i < safeText.length; i += 3900) chunks.push(safeText.slice(i, i + 3900));
  if (!chunks.length) chunks.push("Javob bo‘sh qaytdi.");
  for (let i = 0; i < chunks.length; i++) {
    const payload = { chat_id: chatId, text: chunks[i] };
    if (i === 0 && extra) Object.assign(payload, extra);
    await telegram(env, "sendMessage", payload);
  }
}

function extractAIText(result) {
  return result && result.choices && result.choices[0] && result.choices[0].message
    ? result.choices[0].message.content
    : (result && (result.response || (result.result && result.result.response))) || "";
}

async function callAI(env, messages, maxTokens) {
  const result = await env.AI.run(MODEL, {
    messages: messages,
    max_tokens: maxTokens || 1100,
    temperature: 0.35,
    chat_template_kwargs: { enable_thinking: false }
  });
  const reply = extractAIText(result);
  if (typeof reply !== "string" || !reply.trim()) throw new Error("AI modeli bo‘sh javob qaytardi.");
  return reply.trim();
}

async function answerWithAI(env, userId, userText) {
  const key = "history:" + userId;
  const history = (await env.HISTORY.get(key, { type: "json" })) || [];
  const messages = [{ role: "system", content: SYSTEM_PROMPT }].concat(history, [{ role: "user", content: userText }]);
  const reply = await callAI(env, messages, 1100);
  const updated = history.concat([
    { role: "user", content: userText },
    { role: "assistant", content: reply }
  ]).slice(-16);
  await env.HISTORY.put(key, JSON.stringify(updated), { expirationTtl: HISTORY_TTL });
  return reply;
}

async function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!hash || !Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 86400) return null;
  params.delete("hash");
  const entries = [];
  for (const pair of params.entries()) entries.push(pair);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = entries.map(function (pair) { return pair[0] + "=" + pair[1]; }).join("\n");
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(botToken));
  const validationKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", validationKey, encoder.encode(dataCheckString));
  const hex = Array.from(new Uint8Array(signature)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  if (hex.length !== hash.length) return null;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const user = JSON.parse(params.get("user") || "null");
    return user && user.id ? user : null;
  } catch (_) {
    return null;
  }
}

async function rateLimit(env, request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const minute = Math.floor(Date.now() / 60000);
  const key = "rate:" + ip + ":" + minute;
  const count = Number(await env.HISTORY.get(key) || "0");
  if (count >= 20) return false;
  await env.HISTORY.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}

async function handleAI(request, env) {
  if (!(await rateLimit(env, request))) return json({ ok: false, error: "So‘rov limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring." }, 429);
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "Noto‘g‘ri JSON." }, 400); }
  const kind = String(body.kind || "tutor");
  const userText = String(body.text || "").trim();
  if (!userText || userText.length > 7000) return json({ ok: false, error: "Matn bo‘sh yoki juda uzun (maksimum 7000 belgi)." }, 400);

  let system = SYSTEM_PROMPT;
  let prompt = userText;
  if (kind === "writing") {
    const taskType = String(body.taskType || "task2");
    system = "Sen IELTS Writing bo‘yicha sinchkov, adolatli o‘quv murabbiyisan. O‘zbek tilida javob ber. Har bir mezonni alohida bahola: Task Achievement (Task 1) yoki Task Response (Task 2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Har biriga ehtiyotkor taxminiy band diapazoni va sabab yoz. Keyin umumiy taxminiy diapazon, 3 ta ustuvor xato, matndan qisqa misollar bilan tuzatishlar, yaxshilangan namunaviy jumlalar va keyingi mashqni ber. Faqat ko‘rinib turgan matnni bahola; grafik yoki rasm berilmagan bo‘lsa, u haqda ma’lumot to‘qima. Bu rasmiy IELTS bahosi emasligini aniq ay.";
    if (taskType === "task1") {
      prompt = "IELTS Academic Writing Task 1. Data: bus travel 45% in 2010 and 35% in 2020; walking 30% in 2010 and 40% in 2020; car travel 25% in both years.\nSummarise the main features and make comparisons.\n\nStudent report:\n" + userText;
    } else {
      prompt = "IELTS Writing Task 2: Some people believe that students should study online, while others think classroom learning is better. Discuss both views and give your opinion.\n\nStudent essay:\n" + userText;
    }
  } else if (kind === "speaking") {
    system = "Sen IELTS Speaking bo‘yicha o‘quv murabbiyisan. O‘zbek tilida feedback ber. Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy mezonlarini transkript asosida tahlil qil. Transkriptdan talaffuz, urg‘u yoki ravonlik tezligini ishonchli o‘lchab bo‘lmasligini ayt; Pronunciation uchun ball qo‘yma. Umumiy band faqat ehtiyotkor, norasmiy diapazon bo‘lsin. Kuchli tomonlar, 3 ta aniq yaxshilash nuqtasi, tabiiy iboralar va 2 ta keyingi mashq savolini ber.";
    prompt = "Speaking Part 2: Describe a skill you would like to learn in the future. Say what it is, why you want to learn it and how it could help you. Student speech transcript:\n" + userText;
  } else if (kind !== "tutor") {
    return json({ ok: false, error: "Noma’lum AI rejimi." }, 400);
  }

  try {
    const answer = await callAI(env, [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ], kind === "tutor" ? 1000 : 1300);
    return json({ ok: true, answer: answer });
  } catch (error) {
    console.error("AI request error:", error);
    return json({ ok: false, error: "AI hozir javob bera olmadi. Birozdan keyin qayta urinib ko‘ring." }, 503);
  }
}

async function saveProgress(request, env, restoreOnly) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "Noto‘g‘ri JSON." }, 400); }
  const user = await verifyTelegramInitData(String(body.initData || ""), env.TELEGRAM_BOT_TOKEN);
  if (!user) return json({ ok: false, error: "Telegram sessiyasi tasdiqlanmadi." }, 401);
  const key = "student:" + user.id;
  if (restoreOnly) {
    const progress = await env.HISTORY.get(key, { type: "json" });
    return json({
      ok: true,
      user: { id: user.id, first_name: user.first_name || "O‘quvchi", username: user.username || null },
      progress: progress
    });
  }

  const p = body.progress;
  if (!p || typeof p !== "object") return json({ ok: false, error: "Progress noto‘g‘ri." }, 400);
  const clean = {
    name: String(p.name || user.first_name || "O‘quvchi").slice(0, 35),
    target: String(p.target || "7.0").slice(0, 4),
    examDate: String(p.examDate || "").slice(0, 10),
    completed: Math.max(0, Math.min(100000, Number(p.completed) || 0)),
    correct: Math.max(0, Math.min(100000, Number(p.correct) || 0)),
    total: Math.max(0, Math.min(100000, Number(p.total) || 0)),
    words: Array.isArray(p.words) ? p.words.slice(0, 200).map(function (x) { return String(x).slice(0, 80); }) : [],
    tasks: Array.isArray(p.tasks) ? p.tasks.slice(0, 4).map(Boolean) : [],
    skills: {
      listening: Math.max(0, Number(p.skills && p.skills.listening) || 0),
      reading: Math.max(0, Number(p.skills && p.skills.reading) || 0),
      writing: Math.max(0, Number(p.skills && p.skills.writing) || 0),
      speaking: Math.max(0, Number(p.skills && p.skills.speaking) || 0)
    },
    week: Array.isArray(p.week) ? p.week.slice(0, 7).map(function (x) { return Math.max(0, Number(x) || 0); }) : [0,0,0,0,0,0,0],
    band: p.band ? String(p.band).slice(0, 4) : null
  };
  await env.HISTORY.put(key, JSON.stringify(clean), { expirationTtl: HISTORY_TTL });
  return json({ ok: true });
}

async function processUpdate(update, env) {
  const message = update && update.message;
  if (!message || !message.chat || !message.chat.id || !message.from || !message.from.id) return;
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = (message.text || "").trim();
  if (!text) {
    await sendText(env, chatId, "Hozircha matnli savollarga javob bera olaman. Savolingizni yozib yuboring.");
    return;
  }
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  if (command === "/start") {
    await env.HISTORY.delete("history:" + userId);
    await sendText(env, chatId,
      "Assalomu alaykum! 👋\n\nMen Aqlli Ustozman — o‘zbek tilidagi AI o‘qituvchingiz.\n\n📚 Matematika, ingliz tili, fizika, kimyo, biologiya, tarix va dasturlash bo‘yicha savol bering.\n\n🌐 IELTS mashqlari va shaxsiy o‘quv platformasini ham ochishingiz mumkin.\n\nBuyruqlar:\n/clear — suhbat xotirasini tozalash\n/help — yordam",
      { reply_markup: { inline_keyboard: [[{ text: "🌐 Aqlli Ustoz platformasini ochish", web_app: { url: APP_URL } }]] } }
    );
    return;
  }
  if (command === "/help") {
    await sendText(env, chatId, "Savolingizni oddiy matn ko‘rinishida yuboring. Misol: “2x + 5 = 15 tenglamani tushuntirib yech”.\n\n🌐 IELTS platformasi: " + APP_URL + "\n/clear — suhbat tarixini tozalash");
    return;
  }
  if (command === "/clear") {
    await env.HISTORY.delete("history:" + userId);
    await sendText(env, chatId, "✅ Suhbat xotirasi tozalandi. Yangi mavzudan boshlaymiz!");
    return;
  }
  if (text.startsWith("/")) return;
  await telegram(env, "sendChatAction", { chat_id: chatId, action: "typing" });
  try {
    const reply = await answerWithAI(env, userId, text);
    await sendText(env, chatId, reply);
  } catch (error) {
    console.error("Aqlli Ustoz xatoligi:", error);
    await sendText(env, chatId, "Kechirasiz, hozir javob tayyorlashda muammo bo‘ldi. Birozdan keyin yana urinib ko‘ring.");
  }
}

async function vocalLabFetch(env, path, options) {
  if (!env.VOICELAB_API_KEY) throw new Error("VOICELAB_API_KEY sozlanmagan. VocalLab kalitini Cloudflare Secrets ichiga qo‘ying.");
  const response = await fetch("https://api.vocallab.ai/api/v1" + path, {
    method: (options && options.method) || "GET",
    headers: {
      "Authorization": "Bearer " + env.VOICELAB_API_KEY,
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    },
    body: options && options.body ? JSON.stringify(options.body) : undefined
  });
  return response;
}

async function getVocalLabVoices(env) {
  const cacheKey = "vocallab:voices:v1";
  const cached = await env.HISTORY.get(cacheKey, { type: "json" });
  if (cached && Array.isArray(cached.voices) && cached.voices.length) return cached.voices;
  const response = await vocalLabFetch(env, "/voices?limit=500");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.message || ("VocalLab xatosi: " + response.status));
  const voices = Array.isArray(data.voices) ? data.voices : [];
  await env.HISTORY.put(cacheKey, JSON.stringify({ voices }), { expirationTtl: 86400 });
  return voices;
}

function isFemaleVoice(voice) {
  const metadata = [voice.gender, voice.sex, voice.name, voice.display_name, voice.description, voice.short_description]
    .concat(Array.isArray(voice.tags) ? voice.tags : [])
    .concat(Array.isArray(voice.labels) ? voice.labels : [])
    .join(" ").toLowerCase();
  return /female|woman|girl|feminine|ayol|женск|qiz/.test(metadata);
}

async function handleVoiceList(request, env) {
  try {
    const voices = await getVocalLabVoices(env);
    voices.sort((a, b) => Number(isFemaleVoice(b)) - Number(isFemaleVoice(a)));
    return json({ ok: true, voices });
  } catch (error) {
    console.error("VocalLab voices:", error);
    return json({ ok: false, error: error.message }, 502);
  }
}

async function handleTTS(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "Noto‘g‘ri JSON." }, 400); }
  const text = String(body.text || "").trim();
  if (!text || text.length > 260) return json({ ok: false, error: "Ovozli javob 260 belgigacha bo‘lishi kerak." }, 400);
  try {
    const voices = await getVocalLabVoices(env);
    const wanted = String(body.language || "uz").toLowerCase();
    const matches = voices.filter(v => Array.isArray(v.languages) && v.languages.some(l => String(l).toLowerCase().startsWith(wanted)));
    const female = matches.filter(isFemaleVoice);
    const chosen = female.find(v => v.type === "clone" || v.type === "designed") || female[0] ||
      voices.find(v => isFemaleVoice(v)) || matches.find(v => v.type === "clone" || v.type === "designed") || matches[0] || voices[0];
    if (!chosen) throw new Error("VocalLab katalogida ovoz topilmadi.");
    const response = await vocalLabFetch(env, "/tts", {
      method: "POST",
      body: { text, voice: chosen.id, model: "v-lite", format: "MP3", speed: 1 }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || data.message || ("VocalLab TTS xatosi: " + response.status));
    if (!data.audio_base64) throw new Error("VocalLab audio qaytarmadi.");
    return json({ ok: true, audio_base64: data.audio_base64, points_used: data.points_used || 0, voice: chosen.name || chosen.id });
  } catch (error) {
    console.error("VocalLab TTS:", error);
    return json({ ok: false, error: error.message }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/app")) return serveApp(env);


    if (request.method === "GET" && url.pathname === "/health") {
      const app = await env.HISTORY.get(APP_KEY);
      return json({
        ok: true,
        service: "Aqlli Ustoz",
        model: MODEL,
        web: Boolean(app),
        configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET && env.AI && env.HISTORY)
      });
    }

    if (request.method === "GET" && url.pathname === "/api/voices") return handleVoiceList(request, env);
    
    if (request.method === "POST" && url.pathname === "/api/tts") return handleTTS(request, env);
    if (request.method === "POST" && url.pathname === "/api/ai") return handleAI(request, env);
    if (request.method === "POST" && url.pathname === "/api/session") return saveProgress(request, env, true);
    if (request.method === "POST" && url.pathname === "/api/progress") return saveProgress(request, env, false);

    if (request.method === "GET" && url.pathname === "/setup") {
      return json({ ok: false, error: "Webhook allaqachon sozlangan; qayta sozlash yopiq." }, 410);
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      const secret = request.headers.get("x-telegram-bot-api-secret-token");
      if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) return json({ ok: false }, 401);
      const update = await request.json();
      ctx.waitUntil(processUpdate(update, env).catch(function (error) {
        console.error("Update bajarilmadi:", error);
      }));
      return json({ ok: true });
    }

    return json({ ok: false, error: "Not found" }, 404);
  }
};
