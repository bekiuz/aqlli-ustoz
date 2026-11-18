"""
AI client — Groq va Gemini ni qo‘llab-quvvatlaydi
"""

import os
from openai import AsyncOpenAI
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")

def load_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "Sen Aqlli Ustozsan. O‘zbek tilida tushuntir."


class AIClient:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "groq").lower()
        self.system_prompt = load_system_prompt()

        if self.provider == "groq":
            self.client = AsyncOpenAI(
                api_key=os.getenv("GROQ_API_KEY"),
                base_url="https://api.groq.com/openai/v1"
            )
            self.model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        elif self.provider == "gemini":
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=self.system_prompt
            )
        else:
            raise ValueError(f"Noma'lum AI_PROVIDER: {self.provider}. 'groq' yoki 'gemini' bo‘lishi kerak.")

    async def chat(self, user_message: str, history: list[dict] | None = None) -> str:
        """
        history formati: [{"role": "user"/"assistant", "content": "..."}, ...]
        """
        if history is None:
            history = []

        if self.provider == "groq":
            messages = [{"role": "system", "content": self.system_prompt}]
            messages.extend(history)
            messages.append({"role": "user", "content": user_message})

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            return response.choices[0].message.content.strip()

        elif self.provider == "gemini":
            # Gemini uchun history ni moslashtiramiz
            chat_history = []
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                chat_history.append({"role": role, "parts": [msg["content"]]})

            chat = self.model.start_chat(history=chat_history)
            response = await chat.send_message_async(user_message)
            return response.text.strip()

        return "Xatolik yuz berdi."
