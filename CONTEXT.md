# Task Agent

Um assistente de IA que organiza tarefas por meio de conversa. O usuário interage via chat; o agente interpreta intenções, executa CRUD de tarefas e retorna resultados.

## Language

**Task (Tarefa)**:
Unidade de trabalho com atributos: título, descrição (opcional), prioridade, status, due_date e created_at. Criada exclusivamente por conversa com o agente.
_Avoid_: todo, item, card

**Agent (Agente)**:
LLM que recebe mensagens do usuário, interpreta intenções e dispara tools MCP para manipular tarefas.
_Avoid_: bot, assistente genérico

**MCP Server**:
Servidor que expõe tools padronizadas via Model Context Protocol. O agente (LLM) é o cliente que dispara essas tools.
_Ahave_: API, backend

**Tool (Ferramenta)**:
Função exposta pelo MCP Server que o agente pode chamar. Exemplos: create_task, list_tasks, update_task_status, search_tasks.
_Avoid_: endpoint, rota

**Priority (Prioridade)**:
Nível de urgência de uma tarefa: baixa, média ou alta.
_Avoid_: level, severity

**Status**:
Estado do ciclo de vida de uma tarefa: pending, in_progress ou done.
_Ahave_: state, fase

**Due Date**:
Data até a qual a tarefa deve ser realizada. Opcional.
_Ahave_: deadline, prazo

**Context (Contexto)**:
Conversa entre o usuário e o agente. Pode conter múltiplas mensagens e ações sobre tarefas.
_Ahave_: session, thread
