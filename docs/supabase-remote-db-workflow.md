# Как переносить изменения БД в удаленный Supabase

Эта инструкция описывает безопасный порядок действий для K-nig-Food, когда изменения сделаны локально, закоммичены, runner/деплой сработал, и нужно обновить удаленную БД Supabase.

## Главное правило

Git commit не переносит строки из локальной базы данных.

В commit попадают:

- новая структура БД: `prisma/schema.prisma`;
- SQL-миграции: `prisma/migrations/**/migration.sql`;
- скрипты, которые явно создают или обновляют данные, например `prisma/seed.js`.

В commit не попадают:

- локальные товары, созданные через админку;
- локальный admin user;
- любые строки из локального Postgres.

Поэтому структура БД переносится через `prisma migrate deploy`, а данные переносятся отдельным seed/import-скриптом.

## Что должно быть настроено один раз

В Supabase:

- взять `Project Ref`;
- взять Database password;
- использовать строки подключения из раздела Database settings.

В Vercel или GitLab CI/CD variables:

- `DATABASE_URL` - строка для приложения, обычно transaction pooler `:6543`;
- `DIRECT_URL` - строка для миграций, предпочтительно direct connection `db.<project-ref>.supabase.co:5432`;
- `ADMIN_AUTH_SECRET` - обязательный production secret для подписи admin-cookie;
- `ADMIN_USERNAME` и `ADMIN_PASSWORD` - только если runner должен создавать/обновлять админа через seed.

Не добавляй `.env` в git. Все production-секреты хранятся только в Vercel/GitLab/Supabase.

## Локальная разработка структуры БД

1. Измени модели в `prisma/schema.prisma`.

2. Создай миграцию локально:

```powershell
pnpm exec prisma migrate dev --name short_change_name
```

3. Проверь, что появилась новая папка в `prisma/migrations/`.

4. Проверь локальную работу приложения:

```powershell
pnpm run db:generate
pnpm run build
```

5. Закоммить изменения:

```powershell
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add short change description"
```

## Что делает runner после commit

Runner должен выполнить на удаленной production БД:

```powershell
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

В этом проекте для Vercel уже есть команда:

```powershell
pnpm run build:vercel
```

Она выполняет:

```powershell
prisma generate && prisma migrate deploy && next build
```

В логах runner обязательно проверь строку datasource. Для production там должен быть Supabase host, а не `localhost:3550`.

Правильно:

```text
Datasource "db": PostgreSQL database "postgres" ... at "...supabase..."
```

Неправильно:

```text
Datasource "db": PostgreSQL database "dbname" ... at "localhost:3550"
```

Если видишь `localhost`, значит runner взял dev `.env`, а не production variables.

## Твои действия после сработавшего runner

1. Открой логи runner/deploy.

2. Найди блок `prisma migrate deploy`.

3. Убедись, что:

- host - Supabase, не localhost;
- нет ошибок `P1000`, `P1001`, `P1017`;
- есть сообщение `No pending migrations to apply` или список успешно примененных migrations.

4. Проверь таблицы в Supabase Table Editor.

5. Если менялся только schema, дополнительные действия не нужны.

6. Если нужно перенести или создать данные, запусти seed/import отдельно.

## Как переносить данные

### Admin user

Admin user создается не миграцией, а seed-скриптом. Для удаленного Supabase runner или локальная PowerShell-сессия должны иметь production `DATABASE_URL`.

Пример для runner:

```powershell
pnpm run db:seed
```

Перед этим должны быть заданы:

```text
DATABASE_URL
ADMIN_USERNAME
ADMIN_PASSWORD
```

`ADMIN_PASSWORD` должен быть сильным: минимум 16 символов, маленькая буква, большая буква, цифра и символ.

### Homepage settings и другие дефолтные настройки

Их тоже лучше создавать через idempotent seed: `upsert` или `insert ... on conflict do update/do nothing`.

Такой seed можно запускать много раз без дублей и без потери данных.

### Товары и другие строки, созданные локально

Prisma migrations не переносят такие строки.

Есть два безопасных варианта:

1. Сделать отдельный import/seed-скрипт, который читает данные из JSON/CSV и делает `upsert` по стабильному ключу, например `id` или `slug`.

2. Если перенос одноразовый, экспортировать данные из локальной БД и импортировать в Supabase вручную, но перед этим обязательно проверить конфликты `id`, `slug` и уникальных индексов.

Для проекта предпочтителен первый вариант: данные, которые должны попасть в production, должны быть описаны скриптом и закоммичены.

## Ручной запуск миграций на Supabase

Если нужно применить миграции вручную с локального компьютера, сначала временно переопредели env vars в текущей PowerShell-сессии.

```powershell
$ProjectRef = "your-project-ref"
$DbPassRaw = Read-Host "Supabase DB password"
$DbPass = [uri]::EscapeDataString($DbPassRaw)

$env:DATABASE_URL = "postgresql://postgres.${ProjectRef}:${DbPass}@aws-1-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
$env:DIRECT_URL = "postgresql://postgres:${DbPass}@db.${ProjectRef}.supabase.co:5432/postgres?sslmode=require"

pnpm exec prisma migrate deploy
```

После этого очисти временные переменные:

```powershell
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\DIRECT_URL -ErrorAction SilentlyContinue
```

Если локально direct connection `db.<project-ref>.supabase.co:5432` недоступен, запускай миграции из runner, у которого есть доступ к Supabase direct connection, или используй вариант подключения, который Supabase показывает в Database settings для твоего проекта.

## Частые ошибки

### `prisma` не найден

Используй локальную Prisma:

```powershell
pnpm exec prisma migrate deploy
```

или проектный script:

```powershell
pnpm run db:deploy
```

### В логах `localhost:3550`

Команда применяет изменения к локальной БД, а не к Supabase.

Проверь `DATABASE_URL` и `DIRECT_URL` в runner/Vercel. Production runner не должен брать локальный `.env`.

### `P1000 Authentication failed`

Неверный Database password или пароль не URL-encoded.

Используй именно Supabase Database password, не anon key, не service role key и не пароль от аккаунта Supabase.

### `P1001 Can't reach database server`

Окружение не может достучаться до host/port. Часто это direct connection, который недоступен из локальной сети.

Запусти миграции из runner или проверь connection string в Supabase Dashboard.

### `P1017 Server has closed the connection`

Обычно проблема с неподходящим pooler/direct connection для migration engine.

Для `migrate deploy` предпочтителен `DIRECT_URL` на direct connection. Если direct connection недоступен локально, не пытайся заменить его вслепую transaction pooler; лучше запускай миграции из runner или используй SQL/connection string, который Supabase рекомендует для миграций в твоем окружении.

### После логина на Vercel `500 Internal Server Error`

Если неверный пароль дает `401`, а правильный пароль дает `500`, чаще всего в Vercel отсутствует:

```text
ADMIN_AUTH_SECRET
```

Добавь его в Vercel Environment Variables и redeploy.

## Чеклист перед production deploy

- Есть новая миграция в `prisma/migrations/`.
- `prisma/schema.prisma` закоммичен.
- Если нужны данные, есть idempotent seed/import script.
- В runner/Vercel заданы production `DATABASE_URL` и `DIRECT_URL`.
- В runner/Vercel задан `ADMIN_AUTH_SECRET`.
- В логах runner datasource указывает на Supabase, не на localhost.
- `prisma migrate deploy` прошел без ошибок.
- Seed/import запускался только если он действительно нужен.
