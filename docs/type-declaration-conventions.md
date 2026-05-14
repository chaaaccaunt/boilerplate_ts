# Правила объявления типов

## Типы уровня package

Все domain types и interfaces должны выноситься в package-local `@types` и размещаться в соответствующем файле согласно доменному namespace.

Для backend package используется:

```text
./@types
```

Для shared JSON/API/state contracts используется:

```text
./shared/@types
```

Frontend-local declaration files должны находиться внутри frontend package, например:

```text
./monolith/src/*.d.ts
```

Не следует объявлять domain types в runtime-файлах, кроме случаев, когда это оправдано локальным техническим использованием и не относится к доменной модели.
