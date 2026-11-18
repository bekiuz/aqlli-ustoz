"""
Aqlli Ustoz — O‘zbek tilida AI o‘qituvchi Telegram bot
"""

import asyncio
import logging
import os
from collections import defaultdict

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command, CommandStart
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from dotenv import load_dotenv

from ai_client import AIClient

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bot
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN topilmadi! .env faylini tekshiring.")

bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# AI client
ai = AIClient()

# Har bir foydalanuvchi uchun suhbat tarixi (xotirada saqlanadi)
# Keyinchalik database ga o‘tkazish mumkin
user_histories: dict[int, list] = defaultdict(list)
MAX_HISTORY = 10  # Oxirgi 10 ta xabar


# ========== Handlers ==========

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_histories[message.from_user.id].clear()

    text = (
        "Assalomu alaykum! 👋\n\n"
        "Men <b>Aqlli Ustoz</b>man — o‘zbek tilida gaplashadigan AI o‘qituvchi.\n\n"
        "📚 Men yordam bera olaman:\n"
        "• Matematika\n"
        "• Ingliz tili\n"
        "• Fizika, Kimyo, Biologiya\n"
        "• Dasturlash asoslari\n"
        "• DTS va IELTS ga tayyorlov\n\n"
        "Shunchaki savolingizni yozing yoki misol yuboring!\n\n"
        "Buyruqlar:\n"
        "/start — Qayta boshlash\n"
        "/clear — Suhbat tarixini tozalash\n"
        "/help — Yordam"
    )
    await message.answer(text)


@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    text = (
        "<b>Aqlli Ustoz — Yordam</b>\n\n"
        "Men sizga maktab fanlari bo‘yicha tushuntirish beraman.\n\n"
        "<b>Qanday ishlatish:</b>\n"
        "1. Oddiy savol yozing (masalan: “Kvadrat tenglama nima?”)\n"
        "2. Misollarni yuboring (masalan: “2x + 5 = 15 ni yech”)\n"
        "3. Ingliz tili qoidalarini so‘rang\n\n"
        "<b>Buyruqlar:</b>\n"
        "/start — Botni qayta ishga tushirish\n"
        "/clear — Suhbat xotirasini tozalash\n"
        "/help — Ushbu yordam\n\n"
        "Savolingizni yozing, men yordam beraman! 🚀"
    )
    await message.answer(text)


@dp.message(Command("clear"))
async def cmd_clear(message: types.Message):
    user_histories[message.from_user.id].clear()
    await message.answer("✅ Suhbat tarixi tozalandi. Yangi savol berishingiz mumkin!")


@dp.message(F.text)
async def handle_message(message: types.Message):
    user_id = message.from_user.id
    user_text = message.text.strip()

    if not user_text:
        return

    # Typing holati
    await bot.send_chat_action(message.chat.id, "typing")

    try:
        history = user_histories[user_id]

        # AI dan javob olish
        reply = await ai.chat(user_text, history)

        # Tarixga qo‘shish
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": reply})

        # Tarixni cheklash
        if len(history) > MAX_HISTORY * 2:
            user_histories[user_id] = history[-(MAX_HISTORY * 2):]

        await message.answer(reply)

    except Exception as e:
        logger.error(f"Xatolik: {e}", exc_info=True)
        await message.answer(
            "Kechirasiz, hozir javob bera olmadim. 😔\n"
            "Birozdan keyin qayta urinib ko‘ring yoki /clear buyrug‘ini bosing."
        )


# ========== Main ==========

async def main():
    logger.info(f"Aqlli Ustoz ishga tushmoqda... Provider: {ai.provider}")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
