# Longview — Vercel + Upstash Redis

index.html (الواجهة) + api/state.js (حفظ البيانات في Upstash Redis) + api/ai.js (الـ AI عبر Anthropic API).
مفاتيحك كلها في Environment Variables على Vercel، مش في الكود.

## 1) التخزين: Upstash Redis (فيه خطة مجانية)
- من Vercel: المشروع ← **Storage** ← **Upstash** (Redis) ← Create ← اختار الخطة المجانية ← Connect to project.
  ده بيضيف `KV_REST_API_URL` و`KV_REST_API_TOKEN` تلقائياً.
- أو من upstash.com: أنشئ database، وانسخ REST URL وREST Token، وضيفهم في Vercel بنفس الأسماء دي (أو `UPSTASH_REDIS_REST_URL` و`UPSTASH_REDIS_REST_TOKEN`).

## 2) Anthropic API key
console.anthropic.com → API Keys. الاستهلاك بيتحاسب على حسابك.

## 3) Vercel
ارفع المشروع على GitHub وسوّيه Import في Vercel (أو `vercel` من الـ CLI)، وأضف Environment Variables:

| Name | Value |
|---|---|
| KV_REST_API_URL / KV_REST_API_TOKEN | من Upstash (تتضاف تلقائياً مع التكامل) |
| ANTHROPIC_API_KEY | sk-ant-... |
| ANTHROPIC_MODEL | claude-sonnet-5-5 (اختياري) |
| APP_KEY | passphrase طويلة من اختيارك |

اعمل Redeploy بعد إضافة المتغيرات.

## 4) أول فتح
الموقع بيسألك "Access key" مرة واحدة على كل جهاز، اكتب نفس `APP_KEY`.
الـ status تحت اسم الموقع لازم يقول "Saved online". لو قال "Saved in this browser only" يبقى في مشكلة في التخزين (Upstash) (راجع الـ Logs في Vercel).

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
- بيانات الموقع كلها في key واحد (`longview:state`)، يعني مستخدم واحد بس.
