# Aqlli Ustoz — Biznes reja (MVP)

**Versiya:** 1.0  
**Sana:** 18-noyabr 2026  
**Loyiha:** O‘zbekiston o‘quvchilari uchun o‘zbek tilidagi AI ta’lim platformasi

## 1. Muammo va yechim

O‘quvchilar ko‘pincha murakkab mavzularni o‘zbek tilida sodda tushuntirib beradigan, muntazam mashq va natijalarni bir joyda kuzatadigan yordamchiga ehtiyoj sezadi. Aqlli Ustoz Telegram botdan boshlanadi va web-platforma orqali IELTS hamda boshqa fanlarni birlashtiradi.

**Qiymat taklifi:** o‘quvchi savolni Telegramda berishi, web-platformada mashq qilishi, shaxsiy reja tuzishi va o‘z o‘sishini kuzatishi mumkin.

## 2. Mijoz segmentlari

- Maktab o‘quvchilari: matematika, ingliz tili, tabiiy fanlar va dasturlash.
- Abituriyentlar: fanlarni takrorlash va diagnostik mashqlar.
- IELTS o‘rganuvchilar: to‘rt ko‘nikma bo‘yicha mashq va AI feedback.
- Ota-onalar: keyingi bosqichda farzandning o‘qish jarayonini kuzatish.
- O‘quv markazlari va maktablar: keyingi bosqichda guruh boshqaruvi va o‘quv analitikasi.

## 3. Mahsulot

### Hozirgi MVP
- Telegram AI tutor va suhbat xotirasi.
- Web dashboard va profil.
- IELTS Listening, Reading, Writing, Speaking namunaviy mashqlari.
- 12 savolli mini diagnostik mock.
- Writing va Speaking uchun AI feedback.
- Lug‘at kartalari, kunlik reja va progress.
- Telegram Mini App sessiyasi orqali progress sinxronlash.

### Keyingi mahsulot bosqichlari
- Haqiqiy IELTS formatidagi kengaytirilgan va litsenziyalangan savollar banki.
- Speaking uchun ishonchli audio tahlil va talaffuz feedback.
- O‘quvchi darajasiga mos adaptiv reja.
- Ota-ona va o‘qituvchi kabineti.
- O‘quv markazlari uchun guruhlar, topshiriqlar va hisobotlar.
- Kurslar va ustozlar marketplace'i.

## 4. Daromad modeli

| Manba | Taklif | Holati |
|---|---|---|
| Freemium | Bepul asosiy mashqlar va limitli AI | MVP |
| Premium | Taklif: 29 000 so‘m/oy | To‘lov integratsiyasi kutilmoqda |
| Pro | Taklif: 59 000 so‘m/oy | To‘lov integratsiyasi kutilmoqda |
| Kurslar | IELTS va fan kurslarini bir martalik sotish | Keyingi bosqich |
| B2B | Maktab/o‘quv markaziga o‘quvchi kabinetlari | Keyingi bosqich |
| Marketplace | Ustoz kurslari sotuviga komissiya | Keyingi bosqich |

Narxlar bozor sinovi uchun taxmin. Foydalanuvchi intervyulari va pullik konversiya natijasiga qarab qayta ko‘rib chiqiladi. Cheksiz AI va'da qilinmaydi; har bir tarif uchun AI xarajati, limit va yalpi marja hisoblanadi.

## 5. Daromad ssenariylari

29 000 so‘mlik Premium obunada:

| Pullik obunachi | Oylik yalpi tushum |
|---:|---:|
| 50 | 1 450 000 so‘m |
| 100 | 2 900 000 so‘m |
| 500 | 14 500 000 so‘m |
| 1 000 | 29 000 000 so‘m |

Bu prognoz emas, oddiy matematik ssenariy. AI, hosting, to‘lov komissiyasi, soliqlar, qaytarishlar va boshqa xarajatlar ayrilmagan.

## 6. Bozorga chiqish rejasi

### 0–30 kun: muammoni tasdiqlash
- 20–50 nafar maqsadli foydalanuvchi bilan beta sinov.
- 10–15 ta qisqa suhbat: qaysi fan, muammo va hozirgi alternativalar.
- Har haftada foydalanuvchi feedbacki asosida tuzatish.
- Qaysi 2–3 funksiya ko‘p ishlatilishini o‘lchash.

### 31–60 kun: retention va narx sinovi
- Onboarding, eslatmalar va shaxsiy reja.
- Premium funksiyalarni aniq ajratish, ammo to‘lovdan oldin narxga qiziqishni tekshirish.
- 29 000/59 000 so‘m narx gipotezasini intervyu va kutish ro‘yxati bilan tekshirish.
- AI har bir faol foydalanuvchiga qancha xarajat qilishini o‘lchash.

### 61–90 kun: ilk daromad va B2B
- To‘lov provayderi va qonuniy merchant hisobini tayyorlash.
- Bir yoki ikki o‘quv markazi bilan kichik pilot.
- Faqat xarajat va talab tasdiqlangach pullik rejani ishga tushirish.
- Mijoz fikriga qarab kurs yoki B2B yo‘nalishini tanlash.

## 7. Asosiy ko‘rsatkichlar

- Activation: ro‘yxatdan o‘tganlarning birinchi mashqni tugatgan ulushi.
- D7 retention: 7 kundan keyin qaytib kelganlar ulushi.
- WAU/MAU: haftalik/oylik faol foydalanuvchilar.
- Mashq yakunlash darajasi va qayta urinishlar.
- Free-to-paid konversiya.
- Har bir faol foydalanuvchiga AI xarajati.
- Oylik tushum, qaytarish va yalpi marja.
- B2B pilotlardan foydalanish va davom ettirish ulushi.

Boshlang‘ich maqsadlar (kafolat emas): 50 beta foydalanuvchi, D7 retention 20%+, birinchi oyda 10 ta chuqur feedback intervyusi. Natijalar asosida maqsadlar yangilanadi.

## 8. Texnik arxitektura

- Frontend: Cloudflare Worker'dan beriladigan responsive web ilova.
- Backend/API: Cloudflare Worker.
- AI: Cloudflare Workers AI.
- Ma’lumot: Cloudflare KV (MVP; katta relational ma’lumot uchun keyinchalik D1/Postgres ko‘rib chiqiladi).
- Telegram: webhook + Mini App initData tekshiruvi.
- Web progress: Telegram orqali kirilganda server KV, oddiy brauzerda qurilma localStorage.

Production bosqichida autentifikatsiya, zaxira nusxa, audit log, monitoring, abuse/rate limit va ma’lumotlarni o‘chirish jarayonlari kuchaytiriladi.

## 9. Ishonch va xavfsizlik

- AI bergan IELTS band — o‘quv taxmini, rasmiy IELTS bahosi emas.
- Hozirgi mock — qisqa diagnostik namuna, rasmiy imtihon emas.
- Speaking transkriptidan talaffuzni baholab bo‘lmaydi; audio asosidagi scoring alohida tekshirilishi kerak.
- Foydalanuvchi ma’lumotlari uchun aniq maxfiylik siyosati va saqlash muddati kerak.
- Voyaga yetmagan foydalanuvchilar bo‘lishi mumkinligi sababli ota-ona roziligi, xavfsiz kontent va tegishli mahalliy qonunchilik tekshiriladi.
- To‘lov hisoblari va merchant shartnomalari tegishli huquqiy layoqatga ega katta yoshli shaxs yoki ro‘yxatdan o‘tgan biznes orqali rasmiylashtiriladi.

## 10. Hozirgi cheklovlar

- Click/Payme yoki boshqa to‘lov tizimi ulanmagan.
- Premium/Pro faqat tarif sahifasida ko‘rsatilgan; pul olinmaydi.
- IELTS savollar banki hozircha kichik namunaviy mashqlardan iborat.
- AI baholash inson ekspertining rasmiy bahosini almashtirmaydi.
- Web progress Telegram Mini App sessiyasi tasdiqlanganda server bilan sinxronlanadi; tashqi brauzerda MVP ma’lumotlari shu qurilmada saqlanadi.

## 11. Eng yaqin vazifalar

1. Web-platformani turli telefon va brauzerlarda tekshirish.
2. Telegram /start ichidagi Web App tugmasini sinash.
3. IELTS mashqlari va AI Writing/Speaking feedback sifatini tekshirish.
4. 20–50 beta foydalanuvchidan fikr yig‘ish.
5. Maxfiylik siyosati va foydalanish shartlarini yozish.
6. To‘lov provayderini faqat talab va huquqiy tayyorgarlik tasdiqlangach ulash.
