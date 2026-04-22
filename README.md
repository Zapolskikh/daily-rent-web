# Rent Prague — аренда товаров в Праге

Сайт аренды товаров с категориями, заявками на Gmail, доставкой по Праге и админ-панелью.

## Стек

- Backend: FastAPI (Python), PostgreSQL (Neon)
- Frontend: React + Vite + Tailwind CSS
- Хранение изображений: Cloudinary (object storage)
- Деплой: Vercel (frontend + Python API)

## Функционал

- Каталог по категориям:
  - Для тусовок (премиум): гриль, пивная система, кальян
  - Для путешествий: бокс на машину, автокресло, крепления для велика
  - Для ремонта: шуруповерт, дрель и др.
- Заявка обратной связи отправляется на Gmail
- Услуга доставки по Праге
- Админ-панель:
  - вход по паролю
  - добавление/редактирование/удаление товара
  - установка цены
  - загрузка изображения

## Локальный запуск

### 1) Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Заполните в `backend/.env`:

- `DATABASE_URL` (Neon connection string)
- `APP_SECRET`
- `ADMIN_PASSWORD`
- `GMAIL_SENDER`
- `GMAIL_APP_PASSWORD` (Google App Password)
- `GMAIL_RECEIVER`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (опционально)

Запуск:

```bash
uvicorn main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

По умолчанию frontend работает на `http://localhost:5173`.

## API

- `GET /api/health`
- `GET /api/categories`
- `GET /api/products?category=party|travel|repair`
- `POST /api/contact`
- `POST /api/admin/login`
- `POST /api/admin/upload-image` (Bearer token)
- `POST /api/admin/products` (Bearer token)
- `PUT /api/admin/products/{id}` (Bearer token)
- `DELETE /api/admin/products/{id}` (Bearer token)

## Деплой на Vercel

1. Подключите репозиторий в Vercel.

2. В Project Settings → Environment Variables добавьте:

- `DATABASE_URL` (Neon URL, с `sslmode=require`)
- `APP_ORIGIN` = ваш frontend URL
- `APP_SECRET`
- `ADMIN_PASSWORD`
- `GMAIL_SENDER`
- `GMAIL_APP_PASSWORD`
- `GMAIL_RECEIVER`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (опционально)
- `VITE_API_BASE_URL` = ваш production домен (например, <https://your-domain.vercel.app>)

1. Деплой использует `vercel.json` в корне.

## Примечания по best practices

- Валидация входных данных на backend через Pydantic
- Безопасное сравнение пароля админа (`secrets.compare_digest`)
- Временный подписанный токен админа
- Ограничение форматов и размера изображений
- Хранение секретов только в переменных окружения
