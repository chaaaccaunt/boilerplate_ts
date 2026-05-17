# Nginx

## Назначение

Nginx является edge boundary для frontend, HTTP gateway и WebSocket gateway.

Development-конфиги лежат в корне директории `nginx` и подключаются в локальный nginx config по отдельности:

- `development.frontend.conf` для `node-dev.ru`;
- `development.api.conf` для HTTP/WebSocket API на `api.node-dev.ru`.

Конфиг рассчитан на текущие package-local dev ports:

- `monolith` dev-server: `8080`;
- `gateways/public`: `4200`;
- `gateways/authorization`: `4201`;
- `gateways/files`: `4202`;
- `gateways/chat-realtime`: `4203`.

`development.api.conf` задает upload limit через `client_max_body_size`.
Если upload request превышает лимит, nginx должен вернуть `413` с JSON response envelope и CORS headers для разрешенного frontend origin.
Frontend не должен дублировать этот лимит в коде.

Для локального fallback frontend server также принимает дефолтные имена:

```nginx
server_name node-dev.ru localhost _;
```

При добавлении нового gateway нужно обновить nginx upstream и routing location в том же изменении, где gateway становится публичной boundary.
