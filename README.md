# FlameWall 🔥

Платформа: публикуй пост за $1, собирай огни за 24 часа, топ забирает 50% банка.

## Стек
- **Frontend** — чистые HTML/CSS/JS (без сборки), 2 темы (тёмная/светлая)
- **Backend** — Node.js, Vercel serverless-функции, чистый JavaScript ESM (`/api`)
- **Database** — Supabase (PostgreSQL) через клиент `@supabase/supabase-js`

## Структура
```
flamewall/
├── index.html          — главная (лента, таймер, статистика раунда)
├── about.html          — страница «как это работает»
├── style.css           — стили + светлая тема
├── package.json        — зависимости + vercel
├── vercel.json         — конфиг Vercel
├── .env.example        — переменные окружения
├── lib/
│   ├── supabase.js     — клиент Supabase (anon + service role)
│   ├── auth.js         — проверка JWT
│   └── http.js         — CORS + хелперы ответов
├── api/
│   ├── register.js     — POST: регистрация пользователя
│   ├── login.js        — POST: вход
│   ├── me.js           — GET: текущий пользователь
│   ├── round.js        — GET: активный раунд с постами
│   ├── posts.js        — GET: все посты
│   ├── post.js         — POST: создать пост (оплата $1)
│   └── vote.js         — POST: проголосовать 🔥
└── supabase/
    └── schema.sql      — схема БД: profiles, rounds, posts, votes + RPC
```

## 1. Supabase
1. Создай проект на [supabase.com](https://supabase.com).
2. В SQL Editor выполни весь файл `supabase/schema.sql`.
3. Включи Email auth (Authentication → Providers → Email).
4. Возьми `URL`, `anon key`, `service_role key` из Settings → API.

## 2. Локальный запуск API
```bash
npm install
cp .env.example .env.local   # заполни ключи
npx vercel dev               # API на http://localhost:3000/api
```

## 3. Деплой на Vercel
```bash
npx vercel
```
Или через дашборд Vercel → Import repo → добавь Environment Variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POST_PRICE_CENTS=100`
- `APP_URL=https://<твой-app>.vercel.app`
- `DEMO_MODE=true` — если платёж ещё не подключён (посты создаются без реальной оплаты)

## 4. Авто-закрытие раундов
В Supabase Dashboard → Cron (pg_cron) добавь вызов раз в минуту:
```sql
select public.close_expired_rounds();
```

## API

### POST /api/register
```json
{ "email": "a@b.c", "password": "secret1", "username": "alex", "display_name": "Alex" }
```
Ответ: `201` + `{ user, session }`.

### POST /api/login
```json
{ "email": "a@b.c", "password": "secret1" }
```
Ответ: `200` + `{ user, session }`. Токен из `session.access_token` отправляй как `Authorization: Bearer <token>`.

### POST /api/post  (создать пост)
```json
{ "text": "Привет!", "link": "https://site.com", "author_name": "Alex", "demo_payment": true }
```
Требует `Authorization`. В демо-режиме передай `demo_payment: true`.

### POST /api/vote
```json
{ "post_id": "<uuid>" }
```
Требует `Authorization`. Один голос на пост на пользователя.

### GET /api/round
Возвращает активный раунд с постами (сортировка по голосам).
