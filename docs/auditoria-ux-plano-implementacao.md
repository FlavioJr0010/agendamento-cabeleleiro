# Auditoria crítica das telas e plano de implementação

Data: 12/11/2026.

## Escopo e limite da avaliação

Inspeção dos componentes, rotas, estilos, formulários e consultas do repositório. Foram avaliadas as nove telas existentes: início, entrar, cadastro, conta, painel, serviços, edição de serviço, profissionais e edição de profissional.

Não houve inspeção de telas renderizadas em navegador, screenshots, medição de contraste, teste com leitor de tela ou observação de usuários. Portanto, quebras de layout, qualidade visual final e conformidade de acessibilidade precisam de validação prática. Os achados abaixo distinguem comportamentos presentes no código de riscos a verificar. O documento de referências foi usado para entender o escopo, sem tratar funcionalidades planejadas como implementadas.

## Diagnóstico

O projeto tem uma base coerente de componentes, mas hoje entrega autenticação e cadastros administrativos. A experiência central de um sistema de agendamento ainda não existe nas telas. A maior dívida é a distância entre a promessa e o que alguém consegue concluir.

O problema visual mais relevante na estrutura atual é a falta de hierarquia por tarefa: muitos cartões e formulários recebem importância semelhante, enquanto consultar, decidir e agir exigem procurar informações. A cor principal, bordas arredondadas e espaços consistentes ajudam a unidade, mas não resolvem essa hierarquia.

Prioridades: **P0** bloqueia a tarefa principal ou comunica capacidade inexistente; **P1** prejudica fortemente uma tarefa existente; **P2** reduz eficiência e clareza; **P3** é refinamento. São prioridades de produto, não uma classificação de vulnerabilidades.

## Achados por tela

| Tela / evidência | Crítica e consequência | Mudança proposta | Prioridade |
|---|---|---|---|
| Início — `src/app/page.tsx` | Promete escolher serviço, profissional, horário e conversar. Só oferece criar conta/entrar; não há catálogo público ou rota de agendamento. A expectativa criada não se cumpre. | Enquanto o fluxo não existir, ajustar a promessa. Depois, catálogo com preço, duração, disponibilidade e CTA “Agendar horário”; autenticar próximo da confirmação. | P0 |
| Início e cabeçalho — `page.tsx`, `components/cabecalho.tsx` | “Salão” é uma identidade genérica; faltam localização, horários e informações para decidir se vale a visita. O CTA pede compromisso antes de oferecer contexto. | Identificar o estabelecimento com dados reais; mostrar serviços e informações úteis antes do cadastro. Usar fotografia apenas se representar o salão e ajudar a decisão. | P2 |
| Entrar — `(auth)/entrar/form-entrar.tsx` | Não há recuperação de acesso nem mostrar senha. Sucesso sempre envia a `/conta`, inclusive para a dona, criando um passo intermediário. | Mostrar/ocultar senha com nome acessível, recuperar senha com entrega real de e-mail e retomar o destino pretendido com validação de destino interno. Padrão por papel quando não houver destino. | P1 |
| Entrar e cadastro — formulários de autenticação | `enviando` volta a falso apenas depois de um `await` bem-sucedido. Uma exceção pode deixar o botão bloqueado. Erros aparecem em bloco, sem associação ao campo. | `try/catch/finally`, preservar valores, mensagens por campo, foco no primeiro erro e estado de envio anunciado. | P1 |
| Cadastro — `(auth)/cadastro/form-cadastro.tsx` | Cinco campos antes de oferecer valor. WhatsApp não é identificado como opcional e a regra de senha só fica explícita após falha. Confirmar senha adiciona esforço. | Explicitar obrigatoriedade, regra de senha antes do envio e finalidade do telefone. Avaliar retirar confirmação quando houver controle de visibilidade; testar impacto, sem presumir ganho de conversão. | P2 |
| Conta — `conta/page.tsx` | Para cliente e profissional, a tela mostra dados e sair. Não existe próximo passo útil. A profissional também não chega à agenda prometida no painel. | Separar início por papel: cliente com próximo horário e agendar; profissional com agenda própria; dona com painel. Manter dados de conta em área secundária. | P0 |
| Painel — `painel/page.tsx` | Contar serviços e profissionais responde à configuração, não à operação diária. Não há agenda ou atendimentos. Pendências da mesma pessoa podem virar duas entradas. | No MVP atual, assumir “Configuração do salão” com checklist agrupado por profissional. Após implementar agenda, priorizar dia atual, próximos atendimentos e pendências operacionais. | P1 |
| Serviços — `painel/servicos/page.tsx` | O formulário de novo serviço vem antes da lista. Cada visita cobra rolagem de quem só quer consultar ou editar. Não há busca ou filtro. | Lista primeiro, “Novo serviço” no cabeçalho e formulário em rota dedicada; busca por nome e filtro ativo/inativo. Preservar filtros ao voltar da edição. | P1 |
| Serviços — lista e `campos-servico.tsx` | “60 min + 15 min” não explica se a cliente fica 75 minutos. Profissionais são contadas por vínculo, sem verificar atividade/expediente. O selo verde pode sugerir disponibilidade que não foi comprovada. | Separar duração do atendimento e intervalo interno. Diferenciar “vinculadas” de “aptas para agendamento”; centralizar a regra de aptidão com a futura disponibilidade. | P1 |
| Editar serviço — `painel/servicos/[id]/page.tsx` | A informação sobre efeito em novos agendamentos é útil. Falta um caminho explícito para resolver vínculos com profissionais e aviso de alterações não salvas. | Resumo de preço/duração/estado; link contextual para equipe; voltar/cancelar; proteção contra perda de edição quando houver alterações. | P2 |
| Profissionais — `painel/profissionais/page.tsx` | Repete cadastro acima da consulta. Selos de serviços e expediente fragmentam a leitura; contar serviços não informa se estão ativos. | Lista primeiro, busca, filtros e estado composto: “Pronta”, “Falta serviço ativo”, “Falta expediente” ou “Inativa”; detalhar causas. | P1 |
| Editar profissional — `painel/profissionais/[id]/page.tsx` | Serviços, expediente, dados, acesso e desativação formam uma página longa com salvamentos independentes. Não há resumo de progresso. | Cabeçalho com estado e pendências; primeira configuração guiada por dados → serviços → expediente → revisão. Na manutenção, manter seções identificáveis com salvamento local explícito. Acesso é opcional para ficar agendável. | P1 |
| Expediente — mesma tela | Remover faixa usa um botão de 24 px e efeito imediato. Não há editar faixa, copiar semana ou desfazer. “Folga” também representa ausência de configuração, embora sejam estados diferentes. | Diferenciar “Não configurado” de folga deliberada; editar/copiar intervalos, mostrar sobreposição junto ao campo e oferecer reversão após remoção. Ampliar área de toque sem aumentar obrigatoriamente o ícone. | P1 |
| Acesso — mesma tela | Exige que a profissional crie antes uma conta pública. A descrição promete agenda e conversas ausentes. `min-w-64` dentro de cartões com padding é um risco de overflow em viewport estreita. | Corrigir descrição agora; orientar o processo atual. Convite é evolução com e-mail e token. Remover largura mínima rígida em celular e verificar em 320 px. | P1 |

## Problemas transversais

1. **Feedback de formulário:** `FormAcao` desabilita campos, mas o botão não explica o que está acontecendo. Acrescentar texto de progresso por ação, `aria-busy` e confirmação próxima ao controle; padronizar erro recuperável e sucesso. Sucesso silencioso em remoções precisa de confirmação perceptível ou desfazer.
2. **Acessibilidade:** `Campo` mostra dicas sem `aria-describedby`; não há contrato para erro por campo/`aria-invalid`. Há foco customizado em inputs, mas links e botões dependem do navegador. Preservar o foco nativo até estabelecer um padrão visível; adicionar pular para conteúdo, revisão de ordem de tabulação e suporte a movimento reduzido nos esqueletos.
3. **Tema:** tokens usam `prefers-color-scheme`, mas variantes `dark:` precisam ser verificadas junto dessa configuração. Medir textos, bordas e estados nos dois temas, especialmente itens inativos com `opacity-60`. Não declarar falha de contraste sem medir a cor composta.
4. **Navegação:** o cabeçalho é comum a todos os papéis. Definir destino principal por perfil e preservar contexto após autenticação e edição. Manter navegação horizontal simples enquanto houver só três seções; sidebar só quando a densidade justificar.
5. **Estados incompletos:** existem esqueletos e mensagens vazias, mas não há `error.tsx`/`not-found.tsx` personalizados nas rotas analisadas. Planejar carregamento, vazio inicial, filtro sem resultado, falha recuperável, sessão expirada e registro inexistente.
6. **Consistência:** links de ação repetem estilos fora de `Botao`; CTAs públicos são pílulas e os internos usam retângulos arredondados. Isso pode ser intencional, mas precisa de regra por contexto. Definir primário, secundário, discreto e destrutivo, sem transformar todo elemento em CTA.
7. **Escala:** listagens carregam todos os registros. Busca/filtro devem ter estratégia de servidor e paginação quando o volume justificar; não adicionar paginação apenas como ornamento.

## Direção para as telas

- **Cliente:** identidade do salão → catálogo → serviço → profissional ou qualquer disponível → data/horário → identificação → revisão → confirmação. Preço, duração e escolhas permanecem visíveis. Voltar não apaga escolhas. Sem horários deve oferecer outra data/profissional.
- **Dona, estágio atual:** checklist de configuração → serviços e equipe → corrigir pendências → verificar aptidão para agendamento. Nenhum indicador deve fingir que uma operação ainda não implementada funciona.
- **Dona, após agenda:** hoje → próximos atendimentos → ações por atendimento → pendências. Cadastros ficam acessíveis em navegação secundária.
- **Profissional:** agenda própria e detalhes permitidos. Vincular acesso só deve prometer funcionalidades que estejam disponíveis.

## Plano de implementação

As estimativas abaixo são faixas iniciais em dias úteis para uma pessoa familiarizada com o projeto; incluem implementação e validação básica, sem garantia de prazo. Não são soma de sprints fixas. Integrações, revisão visual e decisões de negócio podem ampliá-las.

| Etapa | Entrega e arquivos/áreas | Dependências | Esforço indicativo | Critérios de aceite |
|---|---|---|---|---|
| 1 — Verdade e orientação | Corrigir promessas em início, metadados e descrição de acesso; reformular painel como configuração; agrupar pendências por profissional. | Confirmar identidade e dados reais do salão. | 1–2 dias | Toda ação anunciada tem destino funcional. Cliente e profissional entendem o estágio atual. Uma pessoa aparece uma vez no checklist com todas as causas. |
| 2 — Base de interação | Evoluir `ui.tsx`, `form-acao.tsx`, formulários de auth e `globals.css`: foco, erro por campo, dicas associadas, progresso, exceções, alvos de toque e movimento reduzido. | Contrato de erros tipados por campo em `lib/acao.ts` e actions. | 2–4 dias | Erro não apaga valores. Exceção permite reenviar. Campo inválido é identificado e alcançável. Teclado conclui os fluxos existentes. |
| 3 — Gestão de serviços e equipe | Lista primeiro; criação em páginas dedicadas; busca/filtros; estados claros; regra única de aptidão em `db/consultas/painel.ts` e camada de domínio. | Definir aptidão: ativo, serviço ativo vinculado e expediente válido; não confundir com horário livre. | 3–5 dias | Consultar não exige atravessar formulário. Filtros sobrevivem ao retorno. Serviço com vínculos somente inativos não é apresentado como pronto. |
| 4 — Configuração de profissional | Progresso, seções com escopo de salvamento, edição/cópia de faixas, prevenção de perda e reversão de remoção. | Etapas 2–3; definir semântica de folga e se exige alteração de schema. | 3–6 dias | Dados → serviço → expediente leva a estado pronto verificável. Acesso opcional não bloqueia aptidão. Sobreposição indica como corrigir. Nenhuma remoção fica sem retorno perceptível. |
| 5 — Agendamento completo | Catálogo público, disponibilidade no servidor, seleção, autenticação com retomada, confirmação e área da cliente. Consultar, cancelar e reagendar conforme regras definidas. | Decidir antecedência, cancelamento, duração + intervalo, fuso, bloqueios e estados. Revisar schema/migrations existentes. | 8–15 dias | Fluxo termina em registro persistido. Concorrência pelo mesmo horário tem um vencedor e mensagem recuperável. Reagendamento falho preserva reserva original. Voltar/login preservam seleção, que é revalidada antes da confirmação. |
| 6 — Operação diária | Agenda diária da dona e visão própria da profissional; ações de status com permissões no servidor. Começar com controles acessíveis de remarcação; arrastar é evolução. | Etapa 5 e política de acesso/status. | 5–9 dias | Dona consulta dia e profissional; profissional vê apenas dados permitidos; horários/status refletem banco. Estados vazios e falhas têm saída. |
| 7 — Recuperação e acabamento | Recuperação de senha com provedor real, identidade visual com conteúdo real, estados de erro e revisão responsiva final. | Serviço de e-mail e dados de marca. Recuperação pode ser antecipada após etapa 2. | 3–6 dias | Link de recuperação funciona de ponta a ponta. Telas verificadas nos dois temas e sem rolagem horizontal em 320 px. |

Conversas, financeiro, estoque, fidelidade e indicadores avançados entram em backlog separado. Se conversa for requisito de lançamento, incluir uma etapa explícita antes de voltar a anunciá-la: threads, permissões, envio, leitura, falhas e notificações. Não esconder esse custo dentro de um redesenho visual.

## Validação e definição de pronto

**Primeiro, auditoria visual real:** subir app e banco com dados de teste; capturar as nove rotas em 320, 390, 768 e 1440 px, nos temas claro/escuro. Cobrir nomes/e-mails longos, listas vazias e extensas, profissionais sem configuração e registros inativos. Conferir quebra de linha, cabeçalho, preço/duração, controles de expediente e acesso.

**Por entrega:** executar lint e typecheck; conferir mouse, toque e teclado; verificar foco após erro, carregamento e salvamento. Medir contraste e validar com leitor de tela os campos, mensagens, status e navegação. Verificação automatizada de acessibilidade complementa inspeção manual.

**Testes relevantes:** integração para regra de aptidão e permissões; teste de falha de autenticação sem botão travado; teste de jornada para criar/configurar profissional; testes de disponibilidade, concorrência, cancelamento e remarcação quando essas funções existirem. Não criar testes que apenas reproduzam classes CSS.

**Teste com pessoas:** pedir a clientes que encontrem preço/duração e agendem; à dona, que configure alguém e corrija uma pendência; à profissional, que encontre o próximo atendimento. Registrar conclusão sem ajuda, tempo, erros e hesitações. Estabelecer linha de base antes de atribuir percentuais de melhoria. A meta de agendar em menos de um minuto é uma hipótese do escopo, a validar considerando primeira visita e retorno separadamente.

## Ordem recomendada

Começar por promessa coerente, feedback confiável e cadastros orientados à consulta. Em seguida fechar agendamento e operação diária. Refinar a identidade visual sobre esses fluxos, sem usar decoração para encobrir ausência de tarefa concluível.
