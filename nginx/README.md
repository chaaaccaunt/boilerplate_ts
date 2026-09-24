# Nginx

## Назначение

Nginx является edge boundary для frontend, HTTP gateway и WebSocket gateway.

Development-конфиги лежат в корне директории `nginx` и подключаются в локальный nginx config:

- `development.frontend.conf` для frontend hostname из `localhost.httpOrigin`;
- `development.api.conf` для HTTP/WebSocket API hostname из `localhost.baseUrl`.

Команда `npm run project -- init ...` перезаписывает оба файла из шаблонов `development.frontend.template.conf` и `development.api.template.conf`.
Генератор подставляет frontend origin, server names и актуальные package-local gateway ports.
Vue dev-server работает на внутреннем порту `8081`, а nginx проксирует к нему frontend requests.

Если `httpOrigin` или `baseUrl` используют `https`, сгенерированный development nginx продолжает слушать внутренний HTTP port. TLS должен завершаться внешним reverse proxy или tunnel, потому что локальные пути сертификатов не входят в конфигурацию boilerplate.

Конфиг рассчитан на текущие package-local dev ports:

- `monolith` dev-server: `8081`;
- `gateways/public`: `4200`;
- `gateways/authorization`: `4201`;
- `gateways/files`: `4202`;
- `gateways/chat-realtime`: `4203`.

`development.api.conf` задает upload limit через `client_max_body_size`.
Если upload request превышает лимит, nginx должен вернуть `413` с JSON response envelope и CORS headers для разрешенного frontend origin.
Frontend не должен дублировать этот лимит в коде.

При добавлении нового gateway нужно обновить nginx upstream и routing location в том же изменении, где gateway становится публичной boundary.
Если gateway уже входит в поддерживаемую публичную routing-схему, его upstream port берется из `package.config.json` автоматически.
