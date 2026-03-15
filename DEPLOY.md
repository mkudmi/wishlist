# Deploy

Деплой настроен для GitHub Actions, `nginx` и backend service `wishlist-api.service`.

## Как работает

- Пуш в `main` запускает workflow `.github/workflows/deploy.yml`.
- GitHub Actions собирает Vite-приложение.
- `dist` заливается на сервер в `/var/www/wishlist/releases/<commit_sha>`.
- Симлинк `/var/www/wishlist/current` переключается на новый релиз.
- Backend-код синхронизируется в `/opt/wishlist/backend`.
- На сервере выполняются `npm ci`, `npm run db:migrate` и `systemctl restart wishlist-api.service`.
- `nginx` отдает `/var/www/wishlist/current` и проксирует `/api/*` в backend.

## GitHub Secrets

Нужно добавить в репозиторий Secrets:

- `DEPLOY_HOST`: `109.73.202.216`
- `DEPLOY_PORT`: `22`
- `DEPLOY_USER`: `root`
- `DEPLOY_PATH`: `/var/www/wishlist`
- `DEPLOY_SSH_KEY`: приватный SSH-ключ для деплоя
- `VITE_API_URL`: origin backend API, например `https://списокжеланий.рф`
- `VITE_GOOGLE_CLIENT_ID`: Google Web Client ID

## Сервер

На сервере должны существовать:

- `/var/www/wishlist/releases`
- `/var/www/wishlist/current`
- `/opt/wishlist`
- systemd unit `wishlist-api.service`
- конфиг `nginx`, который смотрит в `/var/www/wishlist/current` и проксирует `/api/`

Готовый шаблон конфига: `deploy/nginx/wishlist.conf`.

## Первый запуск

После добавления Secrets:

1. Закоммить изменения.
2. Запушь в `main`.
3. Проверь workflow `Deploy` в GitHub Actions.
4. Убедись, что backend service перезапустился без ошибок.
5. Открой `https://списокжеланий.рф`.
