# Supabase: миграции без потери данных

```powershell
pnpm exec prisma migrate dev --name opisanie_izmeneniy

$envs = @{}; Get-Content .env | ? { $_ -match '^\s*[^#][^=]+=' } | % { $k,$v = $_ -split '=',2; $envs[$k.Trim()] = $v.Trim().Trim('"') }
$pass = [uri]::EscapeDataString($envs.CLOUD_DB_PASS)
$env:DATABASE_URL = $envs.DATABASE_URL_PROD.Replace('${CLOUD_DB_PASS}', $pass); $env:DIRECT_URL = $envs.DIRECT_URL_PROD.Replace('${CLOUD_DB_PASS}', $pass)

pnpm exec prisma migrate deploy
pnpm run db:seed

Remove-Item Env:\DATABASE_URL, Env:\DIRECT_URL -ErrorAction SilentlyContinue
```

`migrate deploy` применяет локальные миграции к Supabase и не удаляет удаленные данные. Не запускай на Supabase `prisma db push`, `prisma migrate reset` и любые SQL с `DROP`/`TRUNCATE`.
