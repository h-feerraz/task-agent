# ADR-0003: LangChain.js com MCP SDK como client

## Status: Aceito

## Contexto

O agente precisa usar tools do MCP Server para manipular tarefas. Precisamos de um framework LLM e de uma forma de conectar ao MCP Server.

## Decisão

Usar LangChain.js como framework do agente, com `@modelcontextprotocol/sdk` como client MCP dentro do agente. O LangChain registra as tools MCP como LangChain tools, permitindo que o LLM (via LangChain agent) as dispare diretamente.

## Alternativas rejeitadas

- **Chamadas HTTP diretas ao MCP Server**: não usa o protocolo MCP real, perde padronização e compatibilidade com o ecossistema.
