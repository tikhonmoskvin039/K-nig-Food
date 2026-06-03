# Supabase: перенос без потери данных

```powershell
pnpm exec prisma migrate dev --name opisanie_izmeneniy
git add prisma/schema.prisma prisma/migrations && git commit -m "feat(db): opisanie"
git push

pnpm run db:sync:supabase
pnpm run db:sync:supabase -- --apply
```

`git push` должен запустить deploy/runner с `prisma migrate deploy`. `db:sync:supabase -- --apply` добавляет только отсутствующие локальные строки и не удаляет/не перезаписывает данные на Supabase.
