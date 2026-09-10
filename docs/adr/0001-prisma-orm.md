# ADR-0001: Prisma como ORM

## Status: Aceito

## Contexto

Precisamos de um ORM para acessar Postgres no Node.js. As opções consideradas foram Prisma, Drizzle ORM e SQL crua com driver `pg`.

## Decisão

Usar Prisma. Apesar de ser mais pesado que Drizzle, oferece client gerado tipado, migrações automáticas e ecossistema maduro. Para um MVP com schema simples, o overhead é aceitável e ganhamos produtividade.

## Alternativas rejeitadas

- **Drizzle ORM**: mais leve, mas menos documentação e ecossistema menor
- **SQL crua (`pg` driver)**: controle total, mas mais verboso e propenso a erros de query
