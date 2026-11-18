const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const HISTORY_TTL = 60 * 60 * 24 * 30;
const MAX_TURNS = 8;
const SYSTEM_PROMPT = `Sen Aqlli Ustoz — O‘zbekiston o‘quvchilari va abituriyentlari uchun sabrli, professional AI o‘qituvchisan.

QOIDALAR:
- Asosan o‘zbek tilida javob ber; foydalanuvchi boshqa tilni so‘rasa, o‘sha tilda javob ber.
- Sodda, tushunarli va bosqichma-bosqich tushuntir.
- Xatolarni muloyim tuzat, hech qachon kamsitma.
- Matematika, fizika, kimyo, biologiya, ingliz tili, tarix, ona tili va dasturlashda yordam ber.
- Misollar bilan tushuntir. Hisob-kitoblarda natijani tekshir.
- Bilmagan narsangni to‘qib chiqarmagin; noaniqlikni ochiq ayt.
- Nazorat yoki imtihonda tayyor javobni ko‘chirishga emas, mavzuni tushunishga yordam ber.
- Javoblarni ixcham, lekin yetarlicha tushunarli yoz.
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function telegram(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API ${response.status}`);
  }
  return data.result;
}

async function sendText(env, chatId, text) {
  const safeText = String(text || "Kechirasiz, javob tayyorlay olmadim.").trim();
  const chunks = [];
  for (let i = 0; i < safeText.length; i += 3900) chunks.push(safeText.slice(i, i + 3900));
  if (!chunks.length) chunks.push("Javob bo‘sh qaytdi.");
  for (const chunk of chunks) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: chunk });
  }
}

async function answerWithAI(env, userId, userText) {
  const key = `history:${userId}`;
  const history = (await env.HISTORY.get(key, { type: "json" })) || [];
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userText },
  ];

  const result = await env.AI.run(MODEL, {
    messages,
    max_tokens: 1100,
    temperature: 0.35,
    chat_template_kwargs: { enable_thinking: false },
  });

  const reply =
    result?.choices?.[0]?.message?.content ??
    result?.response ??
    result?.result?.response;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("AI modeli bo‘sh javob qaytardi.");
  }

  const updated = [
    ...history,
    { role: "user", content: userText },
    { role: "assistant", content: reply.trim() },
  ].slice(-MAX_TURNS * 2);

  await env.HISTORY.put(key, JSON.stringify(updated), {
    expirationTtl: HISTORY_TTL,
  });
  return reply.trim();
}

async function processUpdate(update, env) {
  const message = update?.message;
  if (!message?.chat?.id || !message?.from?.id) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = (message.text || "").trim();
  if (!text) {
    await sendText(env, chatId, "Hozircha matnli savollarga javob bera olaman. Savolingizni yozib yuboring.");
    return;
  }

  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  if (command === "/start") {
    await env.HISTORY.delete(`history:${userId}`);
    await sendText(env, chatId,
      "Assalomu alaykum! 👋\n\nMen Aqlli Ustozman — o‘zbek tilidagi AI o‘qituvchingiz.\n\n📚 Matematika, ingliz tili, fizika, kimyo, biologiya, tarix va dasturlash bo‘yicha savol bering.\n\nBuyruqlar:\n/clear — suhbat xotirasini tozalash\n/help — yordam"
    );
    return;
  }
  if (command === "/help") {
    await sendText(env, chatId, "Savolingizni oddiy matn ko‘rinishida yuboring. Misol: “2x + 5 = 15 tenglamani tushuntirib yech”.\n\n/clear — suhbat tarixini tozalash");
    return;
  }
  if (command === "/clear") {
    await env.HISTORY.delete(`history:${userId}`);
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "Aqlli Ustoz",
        model: MODEL,
        configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET && env.AI && env.HISTORY),
      });
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      const key = url.searchParams.get("key") || "";
      if (!env.SETUP_KEY || key !== env.SETUP_KEY) {
        return json({ ok: false, error: "Ruxsat yo‘q" }, 401);
      }
      if (await env.HISTORY.get("setup:done")) {
        return json({ ok: true, already_configured: true });
      }
      if (!env.TELEGRAM_BOT_TOKEN) {
        return json({ ok: false, error: "TELEGRAM_BOT_TOKEN sozlanmagan" }, 503);
      }

      const webhookUrl = `${url.origin}/telegram/webhook`;
      const result = await telegram(env, "setWebhook", {
        url: webhookUrl,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message"],
      });
      await env.HISTORY.put("setup:done", "1", { expirationTtl: HISTORY_TTL });
      return json({ ok: Boolean(result), webhook: webhookUrl });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      const secret = request.headers.get("x-telegram-bot-api-secret-token");
      if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return json({ ok: false }, 401);
      }
      const update = await request.json();
      ctx.waitUntil(processUpdate(update, env).catch((error) => {
        console.error("Update bajarilmadi:", error);
      }));
      return json({ ok: true });
    }

    return json({ ok: false, error: "Not found" }, 404);
  },
};
