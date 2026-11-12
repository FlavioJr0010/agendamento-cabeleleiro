# Pesquisa de referências: webapp de agendamento para salão de beleza

> Pesquisa feita em 12/11/2026. **Atenção:** boa parte das fontes são blogs de fornecedores de software (Zenoti, GlossGenius, Koalendar etc.), então números e metas devem ser tratados como referência, não como verdade absoluta.

---

## Escopo do produto (ideias da equipe + complementos da pesquisa)

> Itens sem marcação vieram das ideias da equipe. Itens marcados com ➕ completam os "etc." com base na pesquisa (detalhes nas seções seguintes).

### A. Espaço do cliente
- Visualizar serviços e preços.
- Conhecer os profissionais.
- Consultar horários disponíveis.
- Escolher serviço, profissional, data e horário.
- Realizar e consultar agendamentos.
- ➕ Cancelar e reagendar sozinha, dentro do prazo da política de cancelamento.
- ➕ Opção "qualquer profissional disponível" (amplia os horários oferecidos).
- ➕ Agendar mais de um serviço na mesma visita (ex.: corte + escova), em sequência.
- ➕ Pagar sinal via Pix para garantir o horário.
- ➕ Receber confirmação e lembretes (WhatsApp/e-mail) com botões "Confirmar" / "Reagendar".
- ➕ Chat com o salão ligado ao agendamento.
- ➕ Entrar na lista de espera de um horário lotado.
- ➕ Ver histórico de atendimentos, saldo de pontos e benefícios.
- ➕ Avaliar o atendimento depois da visita.
- ➕ Galeria de trabalhos (antes/depois) por profissional.

### B. Espaço do empreendedor (dona e equipe)
- Visualizar agenda diária e semanal.
- Cadastrar serviços e preços.
- Cadastrar profissionais e horários de trabalho.
- Confirmar, cancelar e remarcar agendamentos.
- Consultar histórico dos atendimentos.
- ➕ Agenda com uma coluna por profissional e arrastar e soltar para remarcar.
- ➕ Bloqueios de agenda: almoço, folgas, férias, feriados.
- ➕ Agendamento manual pela recepção (cliente que liga ou chega sem horário marcado).
- ➕ Marcar falta (no-show) e registrar o atendimento como concluído.
- ➕ Cadastro de clientes: preferências, fórmula de coloração, ficha de anamnese, fotos.
- ➕ Estoque: uso interno separado de revenda, ficha técnica por serviço, baixa automática, alertas de reposição e de validade.
- ➕ Caixa, formas de pagamento, despesas e comissões por profissional.
- ➕ Painel de indicadores (ver seção 2.4).
- ➕ Perfis de acesso: a dona vê tudo, a profissional vê só a própria agenda e as próprias comissões.

### C. Regras de ouro (regras de negócio)
- Não permitir dois agendamentos no mesmo horário para o mesmo profissional ou para a mesma cliente.
- Considerar a duração de cada serviço.
- Respeitar os horários de trabalho dos profissionais.
- Atualizar a disponibilidade após cada agendamento.
- Fluxo de confirmação dos agendamentos.
- ➕ **Garantir as regras no banco de dados**, não só na tela: duas pessoas podem tentar o mesmo horário ao mesmo tempo (ver seção 6).
- ➕ Intervalo opcional entre atendimentos (limpeza/preparação), configurável por serviço.
- ➕ Antecedência mínima para agendar (ex.: 2h) e máxima (ex.: 60 dias).
- ➕ Prazo mínimo para cancelar sem perder o sinal (ex.: 24h).
- ➕ Cada profissional só aparece para os serviços que sabe fazer.
- ➕ Horário reservado sem pagamento expira depois de alguns minutos e volta a ficar livre.
- ➕ Fluxo de status: pendente → confirmado → em atendimento → concluído / faltou / cancelado.
- ➕ Tudo guardado em UTC e mostrado no fuso de São Paulo.
- ➕ Registro de quem criou, alterou ou cancelou cada agendamento (auditoria).

### D. Como inovar (diferenciais)
- Construir algo fácil e acessível para os usuários e empreendedores.
  - ➕ Mobile-first, botões grandes, poucos passos (meta: agendar em menos de 1 minuto).
  - ➕ Acessibilidade: bom contraste, fonte ajustável, leitores de tela.
  - ➕ PWA: a cliente "instala" o site no celular sem precisar de loja de aplicativos.
  - ➕ (Fase 2) Login sem senha, por código no WhatsApp ou link mágico no e-mail. No início será e-mail + senha (ver seção E).
- Pensar na melhor otimização dos horários e na redução de períodos ociosos da equipe.
  - ➕ Ao oferecer horários, priorizar os que ficam colados a atendimentos já marcados, evitando "buracos" de 15–30 min.
  - ➕ Lista de espera automática: quando alguém cancela, avisar quem está esperando.
  - ➕ "Horários promocionais": desconto em horários historicamente vazios.
  - ➕ Lembrete de retorno baseado no ciclo do serviço (ex.: "sua raiz deve estar aparecendo, vamos marcar?" ~30 dias após a coloração).
- Delimitar indicadores de qualidade e faturamento, serviços mais procurados e produtividade.
  - ➕ Ocupação por profissional, ticket médio, retenção, taxa de faltas, taxa de reagendamento, nota média das avaliações (ver seção 2.4).
- Pensar em mecanismos para estimular o uso do sistema: programa de pontos, recomendações e benefícios para clientes recorrentes.
  - ➕ Pontos por visita e por agendamento feito pelo app (incentiva sair do agendamento por telefone).
  - ➕ "Indique uma amiga": benefício para quem indica e para quem é indicada.
  - ➕ Benefício de aniversário.
  - ➕ Pacotes e assinaturas (ex.: 4 escovas por mês com desconto).
  - ➕ Vale-presente digital.
  - ➕ Recomendações: "quem fez X também gostou de Y" e produtos de revenda sugeridos após o serviço.

### E. Login e autenticação (decisão da equipe)
A conversa exige saber **quem** está falando, então o login entra cedo no projeto.

**Fase 1: simples**
- Cadastro com nome, telefone, e-mail e senha. **Sem confirmação de e-mail** por enquanto.
- Login com e-mail + senha; sessão mantida no navegador.
- Cada usuário tem um **papel**: `cliente`, `profissional` ou `dona` (admin).
  - Quem se cadastra pelo site vira sempre `cliente`.
  - Profissionais e a dona são criados/promovidos **pelo painel da dona**, nunca pelo cadastro público.
- Permissões verificadas **no servidor** (Server Actions / Route Handlers do Next.js checam o papel e o dono do registro), não só escondendo botões na tela.

**Riscos conhecidos de pular a confirmação de e-mail** (aceitáveis no início, resolver antes de lançar para valer):
- Alguém pode se cadastrar com o e-mail de outra pessoa.
- Recuperação de senha depende de o e-mail ser real.
- Mais fácil criar contas falsas para lotar a agenda → mitigar com limite de agendamentos pendentes por conta.

**Fase 2: evolução**
- Ativar confirmação de e-mail (exige um serviço de envio de e-mail, ex.: Resend ou SMTP).
- Recuperação de senha.
- Login sem senha (link mágico / código por WhatsApp).
- Botão "Entrar com Google".

### F. Conversação em threads (decisão da equipe)
Cada conversa é uma **thread** (tópico), com mensagens dentro dela.

**Como funciona**
- A cliente abre uma thread a partir de:
  - um **agendamento** ("Dúvida sobre meu horário de sábado"), ficando vinculada a ele; ou
  - uma **dúvida geral** ("Vocês fazem progressiva sem formol?").
- A equipe (dona e profissionais) vê uma **caixa de entrada** com todas as threads, filtrável por: abertas / respondidas / encerradas, e por profissional.
- Thread tem **status**: `aberta` → `aguardando cliente` → `encerrada` (pode ser reaberta).
- Mensagens novas aparecem **em tempo real** e geram **contador de não lidas**. Sugestão: Server-Sent Events (SSE) num Route Handler do Next.js, alimentado por `LISTEN/NOTIFY` do PostgreSQL. Alternativa mais simples para começar: polling a cada poucos segundos.
- Eventos do sistema podem virar mensagens automáticas na thread do agendamento ("Seu horário foi remarcado para 15/11 às 14h").
- (Fase 2) Anexar imagem, como a foto de referência do corte desejado.
- (Fase 2) Espelhar notificações no WhatsApp: "Você tem uma nova resposta do salão".

**Modelo de dados sugerido**
```text
usuarios         (id, nome, telefone, email, senha_hash, papel)
threads          (id, cliente_id, agendamento_id NULL, assunto, status,
                  criado_em, ultima_mensagem_em)
mensagens        (id, thread_id, autor_id, conteudo, tipo [texto|sistema],
                  criado_em)
leituras         (thread_id, usuario_id, lida_ate)   -- p/ contador de não lidas
```

**Regras de acesso**
- Cliente: lê e escreve **somente nas próprias threads**.
- Profissional: vê as threads dos agendamentos dela (ou todas, conforme configuração da dona).
- Dona: vê e responde todas.
- Ninguém edita ou apaga mensagem de outra pessoa; histórico preservado.

---

## 1. Produtos de referência (para estudar e se inspirar)

### Mercado brasileiro
| Produto | O que observar |
|---|---|
| **Trinks** | Agenda online + finanças, estoque, despesas, fechamento de caixa e **comissão de funcionários** num só lugar. Também funciona como marketplace para clientes encontrarem salões. |
| **Avec** (antigo Beauty Date) | Agendamento online, ferramentas de gestão e controle financeiro. |
| **Salão99** (do Grupo Boticário) | Comissões personalizadas, estoque com entradas/saídas, caixas individuais ou compartilhados. Planos ~R$ 72–105/mês (preço pode ter mudado). |
| **Booksy** | Forte no app da cliente e marketplace; foco mobile. |

### Mercado internacional
| Produto | Posicionamento | O que vale copiar |
|---|---|---|
| **Fresha** | Gratuito (ganha nas taxas de pagamento) | Simplicidade do fluxo de reserva |
| **Vagaro** | Muitos recursos por preço baixo | Marketplace para atrair clientes novas |
| **GlossGenius** | Profissionais solo e salões pequenos | Proteção contra falta (sinal, política de cancelamento), vale-presente digital, visual muito bonito |
| **Boulevard** | Premium / salões de alto padrão | Experiência premium, fichas digitais |
| **Zenoti / Phorest / Mangomint** | Salões médios e redes | Relatórios e indicadores (KPIs) |

**Dica prática:** crie contas de teste gratuitas no Fresha, Trinks e GlossGenius e passe pelo fluxo de agendamento como cliente e como dona. É a referência mais valiosa que existe.

---

## 2. Módulos e funcionalidades recomendados

### 2.1 Agendamento (lado da cliente)
- Fluxo em etapas: **serviço → profissional (ou "qualquer uma") → data/horário livre → confirmação**.
- Mostrar só horários realmente livres, já considerando a duração do serviço e intervalos.
- **Política de cancelamento visível no momento da reserva.**
- **Sinal via Pix** para reduzir faltas, com texto positivo: "Garanta seu horário com R$ X, descontado no valor final" funciona melhor do que "É obrigatório pagar sinal". As fontes sugerem algo entre 20% e 50% do valor do serviço.
- Reagendar/cancelar com um toque (link no lembrete).
- Lista de espera: quando alguém cancela, avisar quem estava aguardando.

### 2.2 Conversa (cliente ↔ salão)
- **Chat dentro do app em threads**, que podem ser ligadas a um agendamento (detalhes na seção F do escopo).
- **WhatsApp Business API oficial** (Meta) para confirmações e lembretes:
  - Modelos de mensagem (templates) aprovados pela Meta são obrigatórios para mensagens fora da janela de 24h.
  - Botões interativos **"Confirmar" / "Reagendar"** dentro da mensagem.
  - Transferir para atendimento humano quando o bot não entender a resposta.
  - ⚠️ Evite APIs não oficiais: o número do salão pode ser banido.
- Sequência de lembretes sugerida: confirmação imediata → lembrete 24h antes (com botões) → aviso no dia.

### 2.3 Painel da dona (administração)
**Agenda visual**
- Visão dia/semana com **uma coluna por profissional**, arrastar e soltar para remarcar.
- Status: agendado → confirmado → em atendimento → concluído / faltou / cancelado.
- Bloqueios (almoço, folga, férias).

**Estoque**
- **Separar produto de uso interno (consumido nos serviços) de produto de revenda.** Segundo as fontes, misturar os dois é o erro mais comum; contabilmente um vira custo do serviço e o outro custo de mercadoria vendida.
- **Ficha técnica do serviço:** ex. "Coloração = 60 ml de tinta + 60 ml de oxidante". Ao concluir o atendimento, o sistema dá **baixa automática** no estoque.
- Estoque mínimo + alerta de reposição; controle de **validade e lote**; cadastro de fornecedores.
- Custo real do serviço = produtos usados + hora técnica + custos fixos + margem (ajuda a precificar).

**Financeiro**
- Caixa (abertura/fechamento), formas de pagamento (Pix, cartão, dinheiro), despesas.
- **Comissões por profissional** (percentual por serviço/produto, diferentes por pessoa).

**CRM / Clientes**
- Histórico de atendimentos, preferências, **fórmula de coloração usada**, fotos de antes/depois.
- Aniversariantes do mês e **clientes sumidas** (ex.: sem visita há 60+ dias) para campanhas de reativação.

### 2.4 Estatísticas (KPIs que realmente importam)
| Indicador | O que é | Meta de referência* |
|---|---|---|
| **Taxa de reagendamento** | % de clientes que saem já com o próximo horário marcado | > 60% |
| **Taxa de faltas (no-show)** | % de agendamentos em que a cliente não apareceu | quanto menor, melhor |
| **Ticket médio** | Faturamento ÷ nº de atendimentos | acompanhar a evolução |
| **Retenção de clientes** | % que volta em 12 meses | > 60% (recorrentes 75–85%) |
| **Retenção de clientes novas** | % de novas que voltam | média ~35%, meta 50% |
| **Ocupação da agenda** | horas vendidas ÷ horas disponíveis por profissional | 75–85% (< 70% = problema de agenda; > 90% = falta de capacidade) |
| Extras úteis | faturamento por profissional, serviços mais rentáveis, horários de pico, produtos mais vendidos | — |

\* metas de fornecedores (Zenoti, Meevo); variam bastante entre fontes.

---

## 3. Referências de design (UI/UX)
- **Princípio-chave:** o sistema precisa de **duas experiências distintas**: a agenda de recepção/administração (densa, rápida) e a reserva da cliente (simples, bonita, mobile-first).
- Dribbble: [Booking app dashboard (beleza e bem-estar)](https://dribbble.com/shots/23610070-Booking-app-dashboard-Main-screen), [Premium Salon & Spa Booking UI](https://dribbble.com/services/168685-Premium-Salon-Spa-Booking-Website-UI)
- Contra: [Salon & SPA Dashboard (Cansaas)](https://contra.com/p/3APMbrqe-salon-and-spa-dashboard-or-product-design), [Beauty dashboard (Hyperactive)](https://contra.com/p/23slmLOb-product-design-for-beauty-dashboard-or-hyperactive), [Salon Management System](https://contra.com/p/FERN7AA7-salon-management-system), [SalonMate](https://contra.com/p/NkE3X7rv-uiux-design-and-frontend-structure-for-salon-mate)
- Sites de salão para inspiração visual: [htmlburger](https://htmlburger.com/blog/salon-websites/), [GlossGenius – hair salon websites](https://glossgenius.com/blog/hair-salon-websites)
- Guia de design: [Affective – apps para beleza e salões](https://weareaffective.com/learning-centre/how-should-i-design-apps-for-beauty-and-salon-businesses)
- Termos de busca úteis no Dribbble/Behance: `salon dashboard`, `beauty booking app`, `appointment calendar`, `barbershop app`.

---

## 4. Projetos open source para estudar o código
- [**Easy!Appointments**](https://easyappointments.org/): o mais maduro (desde 2014, GPL-3.0). Ótimo para estudar a lógica de disponibilidade/horários.
- [**clawnify/open-salon**](https://github.com/clawnify/open-salon): plataforma de agendamento para salão.
- [**lebtoki/saloncrm**](https://awesome.ecosyste.ms/projects/github.com%2Flebtoki%2Fsaloncrm): agenda + clientes + faturamento (MIT).
- [**sohaibkhaliq/style-and-schedule**](https://awesome.ecosyste.ms/projects/github.com%2Fsohaibkhaliq%2Fstyle-and-schedule): Laravel, controle de acesso por papel (RBAC), pagamentos.
- Cal.com também é open source e vale como referência de UX de agendamento.

---

## 5. Cuidados legais (LGPD)
- **Coletar só o necessário** (nome, telefone e e-mail bastam para agendar).
- **Consentimento específico e separado** para marketing (promoções por WhatsApp/e-mail). Autorização genérica é nula.
- **Ficha de anamnese** (alergias, gestação, tratamentos) = **dado sensível de saúde** → regras mais rígidas, acesso restrito e consentimento explícito.
- Permitir que a cliente veja/exclua seus dados. Ver a [cartilha LGPD do Sebrae-DF](https://sebrae.com.br/Sebrae/Portal%20Sebrae/UFs/DF/Anexos/cartilha%20LGPD%20Sebrae%20DF%202021.pdf).

---

## 6. Dicas técnicas
- **Evitar agendamento duplicado no banco:** no PostgreSQL, uma *exclusion constraint* com `tstzrange` + `btree_gist` impede dois horários sobrepostos, mesmo com requisições simultâneas. Use **duas** restrições, uma por profissional e outra por cliente, ignorando agendamentos cancelados:
  ```sql
  create extension if not exists btree_gist;

  alter table agendamentos
    add constraint sem_conflito_profissional
      exclude using gist (profissional_id with =, periodo with &&)
      where (status not in ('cancelado', 'faltou')),
    add constraint sem_conflito_cliente
      exclude using gist (cliente_id with =, periodo with &&)
      where (status not in ('cancelado', 'faltou'));
  -- periodo = tstzrange(inicio, inicio + duração do serviço + intervalo)
  ```
- **Disponibilidade calculada, não armazenada:** horários livres = expediente da profissional − bloqueios − agendamentos ativos, fatiados pela duração do serviço. Assim a agenda "se atualiza sozinha" após cada agendamento.
- **Guardar horários em UTC** e converter para `America/Sao_Paulo` na tela.
- **Webhooks idempotentes** (WhatsApp/Pix) para não duplicar confirmações ou pagamentos.
- **Stack definida pela equipe:**
  | Camada | Tecnologia |
  |---|---|
  | Framework | Next.js (App Router) + React |
  | Linguagem | TypeScript |
  | Estilo | Tailwind CSS |
  | Banco | PostgreSQL 17 em Docker, porta **55432** no host (`docker-compose.yml`) |
  | ORM | Drizzle ORM (migrations em `drizzle/`) |
  | Autenticação | Better Auth, e-mail + senha, sessão no banco |
- **Ainda a decidir:**
  - **Tempo real do chat:** SSE + `LISTEN/NOTIFY` (o banco já emite `nova_mensagem` a cada mensagem inserida) ou polling no começo.
  - **Pagamentos (fase posterior):** gateway com Pix (Mercado Pago, Asaas, Efí etc.).

---

## 7. Sugestão de MVP (ordem de construção)
1. **Login simples** (e-mail + senha, sem confirmação) + papéis cliente/profissional/dona.
2. Cadastro de serviços, preços, profissionais e horários de trabalho (espaço do empreendedor).
3. Regras de ouro no banco + cálculo de disponibilidade.
4. Espaço do cliente: ver serviços/profissionais, agendar, consultar, cancelar/reagendar.
5. Agenda diária/semanal da dona + confirmar/cancelar/remarcar + fluxo de status.
6. **Conversação em threads** (tempo real, ligada ou não a um agendamento).
7. Lembretes (e-mail primeiro; WhatsApp oficial depois).
8. Cadastro de clientes + histórico de atendimentos.
9. Estoque com ficha técnica e baixa automática.
10. Caixa + comissões.
11. Painel de indicadores.
12. Diferenciais: sinal via Pix, lista de espera, programa de pontos, indicações, confirmação de e-mail/login sem senha.

---

## Fontes
- [Koalendar – melhores apps para salão](https://koalendar.com/pt-br/blog/melhor-aplicativo-de-agendamento-para-salao)
- [Koalendar – softwares por porte do salão](https://koalendar.com/pt-br/blog/melhor-aplicativo-para-salao-de-cabeleireiro)
- [Capterra – Trinks](https://www.capterra.com/p/252863/Trinks/)
- [Mobile Time – Trinks](https://www.mobiletime.com.br/noticias/04/12/2017/trinks-ajuda-clientes-a-encontrar-salao-de-beleza-e-estabelecimentos-ganham-em-agilidade/)
- [App Store – Salão99](https://apps.apple.com/BR/app/id1518718411)
- [CB Insights – Beauty Date vs Trinks](https://www.cbinsights.com/compare/beauty-date-vs-trinks)
- [Mio Salon – 10 best salon software 2026](https://blog.miosalon.com/10-best-salon-software-hands-on-comparison-for-salons-in-2026/)
- [Zenoti – best salon booking software](https://zenoti.com/thecheckin/best-salon-booking-software)
- [GlossGenius – Fresha vs Vagaro](https://glossgenius.com/blog/fresha-vs-vagaro)
- [Zenoti – salon and barbershop metrics guide](https://www.zenoti.com/thecheckin/salon-and-barbershop-metrics-guide)
- [Zenoti – 30 KPIs for salons and spas](https://resources.zenoti.com/blogs/30-key-performance-indicators-kpis-for-salons-and-spas)
- [Phorest – insights from 10,000 salons](https://www.phorest.com/gb/blog/phorest-insights-data-and-learnings-from-over-10000-salons)
- [Bookedby – 30+ KPIs](https://bookedby.com/post/30-essential-kpis-for-your-salon)
- [SimplyBook – lembretes automáticos](https://simplybook.me/br/blog/automated-appointment-reminders)
- [Aurora Inbox – agendamento via WhatsApp 2026](https://www.aurorainbox.com/pt/2026/05/03/sistema-de-agendamento-via-whatsapp-para-barbearias-e-saloes-de-beleza/)
- [Kommo – modelos de WhatsApp para salões](https://www.kommo.com/br/blog/modelos-whatsapp-para-saloes-de-beleza/)
- [Whapi – automação de agendamento](https://whapi.cloud/blog/pt/how-to-automate-appointment-bookings-on-whatsapp-without-meta-verification)
- [ChatSac – automação de WhatsApp](https://chatsac.com/blog/automacao-de-whatsapp/)
- [Hora de Codar – automações n8n para salão](https://horadecodar.com.br/automacoes-n8n-salao-cabeleireiro/)
- [Cal.com – reduzir no-shows](https://cal.com/es/blog/reduce-no-show-appointments)
- [Acuity – custo das faltas](https://de.acuityscheduling.com/learn/cost-of-no-shows)
- [Lilach Bullock – booking systems reduce no-shows](https://www.lilachbullock.com/online-booking-systems-reduce-no-shows/)
- [Beancount – gestão financeira de salão](https://beancount.io/pt/blog/2026/03/14/beauty-salon-financial-management-complete-guide)
- [Omie – como escolher sistema para salão](https://www.omie.com.br/blog/sistema-para-salao-de-beleza-como-escolher-o-melhor/index.md)
- [Sebrae – Organização e Controle de Estoque](https://datasebrae.com.br/wp-content/uploads/2024/06/Organizacao-e-Controle-de-Estoque-CS11002-3.pdf)
- [Sebrae – Boas práticas no segmento de beleza](https://datasebrae.com.br/wp-content/uploads/2020/04/Boas-Práticas-no-Segmento-de-Beleza-MMP14040-2.pdf)
- [Movimento Econômico – consentimento e LGPD](https://movimentoeconomico.com.br/artigos/2021/07/15/carmina-hissa-sua-impressao-digital-e-o-falso-consentimento-que-custou-mais-de-meio-milhao-de-reais/)
- [Migalhas – LGPD para clínicas](https://www.migalhas.com.br/depeso/374216/5-pontos-da-lgpd-para-clinicas-medicas)
- [TCC Fatec – sistema web integrado para salão](https://ric.cps.sp.gov.br/bitstream/123456789/37315/1/analiseedesenvolvimentodesistemas_2025_1_andreynagon%c3%a7alvesbastos_sistemawebintegradoparasalaodebeleza.pdf)
- [Easy!Appointments](https://easyappointments.org/) · [open-salon](https://github.com/clawnify/open-salon)
