# Правила объявления типов

## Типы уровня package

Переиспользуемые domain types, public contracts и package-level interfaces должны выноситься в package-local `@types` и размещаться в соответствующем файле согласно доменному namespace.

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

Локальные технические types/interfaces, которые используются только внутри одного runtime-файла и не являются частью доменной модели или публичного contract, можно объявлять рядом с реализацией.
