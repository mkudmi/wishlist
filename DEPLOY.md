# Deploy

Деплой настроен для GitHub Actions и `nginx`.

## Как работает

- Пуш в `main` запускает workflow `.github/workflows/deploy.yml`.
- GitHub Actions собирает Vite-приложение.
- Готовый `dist` заливается на сервер в `/var/www/wishlist/releases/<commit_sha>`.
- Симлинк `/var/www/wishlist/current` переключается на новый релиз.
- `nginx` отдает `/var/www/wishlist/current`.

## GitHub Secrets

Нужно добавить в репозиторий Secrets:

- `DEPLOY_HOST`: `109.73.202.216`
- `DEPLOY_PORT`: `22`
- `DEPLOY_USER`: `root`
- `DEPLOY_PATH`: `/var/www/wishlist`
- `DEPLOY_SSH_KEY`: приватный SSH-ключ для деплоя
- `VITE_API_URL`: URL вашего backend API (например, `http://109.73.202.216:8080`)

## Сервер

На сервере должны существовать:

- `/var/www/wishlist/releases`
- `/var/www/wishlist/current`
- конфиг `nginx`, который смотрит в `/var/www/wishlist/current`

Готовый шаблон конфига: `deploy/nginx/wishlist.conf`.

## Первый запуск

После добавления Secrets:

1. Закоммить изменения.
2. Запушь в `main`.
3. Проверь workflow `Deploy` в GitHub Actions.
4. Открой `http://109.73.202.216`.
