# Nginx

## Назначение

Nginx является edge boundary для frontend, HTTP gateway и WebSocket gateway.

Development-конфиг `development.conf` является самостоятельным nginx config и подключает отдельные server configs:

- `conf.d/development.frontend.conf` для `node-dev.ru`;
- `conf.d/development.api.conf` для HTTP/WebSocket API на `api.node-dev.ru`.

Конфиг рассчитан на текущие package-local dev ports:

- `monolith` dev-server: `8080`;
- `gateways/public`: `4200`;
- `gateways/authorization`: `4201`;
- `gateways/files`: `8090`;
- `gateways/chat-realtime`: `8091`.

Для локального fallback frontend server также принимает дефолтные имена:

```nginx
server_name node-dev.ru localhost _;
```

При добавлении нового gateway нужно обновить nginx upstream и routing location в том же изменении, где gateway становится публичной boundary.

Для проверки standalone-конфига нужно запускать nginx с prefix директории `nginx`, чтобы `include conf.d/*.conf` резолвился относительно нее.
