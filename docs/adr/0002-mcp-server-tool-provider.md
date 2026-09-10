# ADR-0002: MCP Server como tool provider

## Status: Aceito

## Contexto

A arquitetura define três camadas: UI → LLM Agent → MCP Server → Postgres. O papel do MCP Server precisa ser definido.

## Decisão

O MCP Server funciona como **tool provider**: expõe tools padronizadas via Model Context Protocol, e o LLM (agente) é quem decide e dispara qual tool chamar com base na conversa do usuário.

Isso é o caso de uso padrão do `@modelcontextprotocol/sdk`: o LLM usa tools via protocolo padronizado. É mais simples e mais alinhado com o ecossistema MCP.

## Alternativas rejeitadas

- **MCP Server como orquestrador**: o servidor receberia a mensagem, consultaria o LLM para interpretar, e executaria. Mais complexo, menos flexível, e não aproveita o protocolo MCP como foi projetado.
