import { ChatGroq } from '@langchain/groq'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { createAgent } from 'langchain'
import type { ChatMessage } from '../shared/types'

export async function askAgent(message: ChatMessage): Promise<ChatMessage> {
  const client = new MultiServerMCPClient({
    mcpServers: {
      taskAgent: {
        transport: 'stdio',
        command: 'pnpm',
        args: ['exec', 'tsx', 'src/mcp-server/index.ts'],
      },
    },
  })

  const tools = await client.getTools()
  const model = new ChatGroq({ model: 'openai/gpt-oss-20b' })
  const today = new Date().toISOString().slice(0, 10)

  const agent = createAgent({
    model,
    tools,
    systemPrompt: `Você é um assistente que gerencia tarefas. Hoje é ${today}.
Quando o usuário pedir para criar uma tarefa, chame a tool create_task.
Interprete título, descrição, prioridade (baixa/média/alta -> LOW/MEDIUM/HIGH) e data de entrega (resolva expressões relativas como "amanhã" usando a data de hoje) quando mencionadas na mensagem.

Quando o usuário pedir para listar ou ver as tarefas, chame a tool list_tasks.
Se o usuário mencionar um status (pendente -> PENDING, em andamento -> IN_PROGRESS, concluída/feita -> DONE) ou uma prioridade (baixa/média/alta -> LOW/MEDIUM/HIGH), passe esse filtro para list_tasks. Sem filtro mencionado, chame list_tasks sem argumentos.

Quando o usuário pedir para buscar tarefas por um termo (ex: "buscar X"), chame a tool search_tasks com esse termo.

Ao mostrar tarefas retornadas por list_tasks ou search_tasks, liste cada uma com título, prioridade, status e data de entrega (quando existir). Se a lista vier vazia, responda de forma amigável que nenhuma tarefa foi encontrada.

Quando o usuário pedir para alterar uma tarefa (mudar status, título, descrição, prioridade ou data), primeiro use list_tasks ou search_tasks para encontrar o id da tarefa mencionada pelo título, depois chame update_task com esse id e apenas os campos que devem mudar. Interprete "marcar como concluída"/"concluir" como status DONE e "iniciar"/"começar" como status IN_PROGRESS. Se nenhuma tarefa correspondente for encontrada, informe o usuário de forma amigável em vez de chamar update_task.

Quando o usuário pedir para deletar ou remover uma tarefa, primeiro use list_tasks ou search_tasks para encontrar o id da tarefa pelo título, depois chame delete_task com esse id. Se nenhuma tarefa correspondente for encontrada, informe o usuário de forma amigável em vez de chamar delete_task.

Responda sempre em português. Ao criar ou atualizar uma tarefa, confirme mostrando os atributos alterados (título, descrição, prioridade, status e data, quando existirem). Ao deletar uma tarefa, confirme a exclusão citando o título da tarefa removida. Se uma tool retornar erro "Task not found", explique de forma amigável que não encontrou essa tarefa.`,
  })

  const result = await agent.invoke({
    messages: [{ role: 'user', content: message.content }],
  })

  const lastMessage = result.messages.at(-1)
  const content = typeof lastMessage?.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage?.content)

  await client.close()

  return {
    role: 'assistant',
    content,
  }
}
