# Longview — Vercel + MongoDB

index.html (الواجهة) + api/state.js (حفظ البيانات في MongoDB) + api/ai.js (الـ AI عبر Anthropic API).
مفاتيحك كلها في Environment Variables على Vercel، مش في الكود.

## 1) MongoDB Atlas
1. أنشئ cluster مجاني (M0) وuser وباسورد.
2. Network Access → Add IP → `0.0.0.0/0` (Vercel مش عنده IP ثابت).
3. Connect → Drivers → انسخ الـ connection string.

## 2) Anthropic API key
console.anthropic.com → API Keys. الاستهلاك بيتحاسب على حسابك.

## 3) Vercel
ارفع المشروع على GitHub وسوّيه Import في Vercel (أو `vercel` من الـ CLI)، وأضف Environment Variables:

| Name | Value |
|---|---|
| MONGODB_URI | connection string |
| MONGODB_DB | longview |
| ANTHROPIC_API_KEY | sk-ant-... |
| ANTHROPIC_MODEL | claude-sonnet-5-5 (اختياري) |
| APP_KEY | passphrase طويلة من اختيارك |

اعمل Redeploy بعد إضافة المتغيرات.

## 4) أول فتح
الموقع بيسألك "Access key" مرة واحدة على كل جهاز، اكتب نفس `APP_KEY`.
الـ status تحت اسم الموقع لازم يقول "Saved online". لو قال "Saved in this browser only" يبقى في مشكلة في MongoDB (راجع الـ Logs في Vercel).

## تشغيل محلي
XAMPP مش بيشغّل Node functions. استخدم:
```
npm i -g vercel
npm install
vercel dev
```
مع ملف `.env.local` منسوخ من `.env.example`.

## ملاحظات
- أي حد يعرف `APP_KEY` يقدر يقرأ بياناتك ويستهلك رصيد الـ API، فاختار مفتاح طويل ومتشاركوش.
- نسخة احتياطية: Me → Export as JSON، والـ Import بيرجّعها.
- بيانات الموقع كلها في document واحد (`state` / `_id: "main"`)، يعني مستخدم واحد بس.
