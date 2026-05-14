# Realtime слой

Realtime слой предназначен для WebSocket gateways.

WebSocket transport является базовой частью boilerplate и запускается по умолчанию.
`WebSocketServer` подключается в `services/monolith/src/bin/index.ts` к тому же native HTTP server.

Правила слоя:

- `WebSocketServer` принимает подключение, проверяет cookie/JWT, валидирует payload события и вызывает gateway.
- Gateway описывает события конкретного домена, проверяет доступ к событию и вызывает service.
- Service выполняет бизнес-логику и не должен зависеть от `socket.io`, socket instance или WebSocket protocol.
- Payload события логируется только один раз на уровне `WebSocketServer` и только через sanitized logger.
- Для каждого события должна быть своя validator-схема, если событие принимает payload.

Базовый chat gateway находится в `./chat`.
Новые gateways нужно явно подключать к `WebSocketServer`.
