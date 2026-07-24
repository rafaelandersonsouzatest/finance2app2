# Product Discovery

> Registrado em 2026-07-24, antes do início oficial das sprints de desenvolvimento. Este documento consolida a visão de produto — não é arquitetura técnica (`ARQUITETURA.md`) nem estado de execução (`PROJECT_STATUS.md`), é a análise de produto/UX/negócio que orienta o `ROADMAP.md`.

## Contexto

Análise feita no papel de Product Manager / UX Designer / cofundador, sem olhar código — só o produto como um usuário final o experimentaria, e o mercado em que ele compete.

## 1. O que faria um usuário amar este app

- Sentir controle sem se sentir julgado — tom acolhedor e mascote (coruja) são ativos reais, raros na categoria.
- Ver progresso, não só lançar dados — vitórias pequenas e visíveis geram apego.
- Ser usado a dois sem constrangimento — reduz atrito de casal com dinheiro.
- Nunca ser pego de surpresa — lembrete antes do vencimento gera gratidão genuína.

## 2. O que faria alguém abandonar o app

- Digitação manual cansa depois de 2-3 semanas sem importação automática (Open Finance/PIX) — maior ameaça de retenção de médio prazo no mercado de finanças pessoais no Brasil.
- Erro em número financeiro quebra confiança instantaneamente.
- Fricção na entrada (documento sem explicação, onboarding sem opção de pular).
- Nenhum gatilho de retorno (sem notificação, sem resumo).
- Medo de perder dados sem backup/exportação visível.

## 3. Funcionalidades de maior valor percebido hoje

1. Antecipação de parcela com desconto (raro entre concorrentes).
2. Modo privacidade (ocultar valores).
3. Modelos recorrentes (lançamento automático de fixos).
4. Resumo consolidado de todos os domínios financeiros num só lugar.

## 4. Diferenciação frente à concorrência

Mobills, Organizze, Money Lover, Minhas Economias etc. escolhem um público (pessoa física OU empresa) e tratam família como add-on caro. A aposta deste projeto — uma única base de código acompanhando a pessoa da vida solo até família e pequeno negócio — é rara e defensável, mas só vira diferenciação real se for comunicada ao usuário (hoje é uma decisão técnica invisível).

**Achado central do discovery:** o Brasil tem ~14 milhões de MEIs que misturam dinheiro pessoal e de negócio sem ferramenta simples para isso. O app já grava `tipoUsuario`/`tipoDocumento` (CNPJ) desde o cadastro — o gancho técnico para um "Modo MEI" simples já existe, e é um nicho pouco disputado.

## 5. O que falta para parecer premium

- Trava de segurança do próprio app (PIN/biometria).
- Insight/inteligência sobre os dados, não só formulário.
- Polimento visual consistente (ícones de categoria, gráfico real).
- Transparência sobre dados (tela de privacidade/exclusão de conta).

## 6. O que deveria existir antes da publicação

- Fluxo de exclusão de conta dentro do app — possível **exigência de política do Google Play** para apps com criação de conta (verificar antes de submeter).
- Lembrete de vencimento — reavaliado como **notificação local** (sem infraestrutura de push no servidor), custo de engenharia provavelmente menor do que parecia; um dos recursos de maior valor percebido do produto inteiro.
- PIN/biometria ao abrir o app.
- Onboarding sem fricção desnecessária (CPF/CNPJ explicado, opção de pular).

## 7. O que pode esperar para versões futuras

- Open Finance/importação bancária (grande, regulatório — maior alavanca de retenção de longo prazo, mas não é MVP).
- Modo Empresa completo (nota fiscal, centro de custo).
- Web.
- IA de verdade (categorização preditiva, assistente).
- Widget de tela inicial (Android).

## 8. Funcionalidades que gerariam maior retenção

1. Lembrete de vencimento (maior gatilho de retorno).
2. Resumo mensal por notificação ("seu mês em números", estilo Wrapped) — barato, efeito desproporcional.
3. Modo Família/Casal funcional — uso compartilhado cria motivo social para continuar.
4. Metas com progresso visual, estendidas de investimento para gasto por categoria.
5. Hábito leve e recompensado (streak de registro), sem gamificação excessiva.

## 9. Funcionalidades que poderiam gerar receita

Campo `plano: "free"` já gravado desde o cadastro — intenção de monetizar já prevista, não implementada.

- Plano Família/Casal como parte do Premium — cuidado: 1º membro extra deve continuar grátis (efeito viral); limitar membros extras ou recursos avançados de família como pagos.
- Histórico estendido (grátis = últimos meses, premium = histórico completo).
- Relatórios/exportação (PDF/planilha).
- Modo Empresa/MEI como tier separado.
- Plano vitalício (pagamento único) como alternativa à assinatura recorrente.
- ⚠️ Recomendação de produtos financeiros por comissão — tensiona com o maior ativo do produto (confiança); só considerar com transparência total, se em algum momento avaliado.

## 10. Funcionalidades ainda não pensadas

1. "Modo MEI" (ver item 4).
2. Notificação local de vencimento sem servidor.
3. Resumo mensal por notificação estilo "Wrapped".
4. Convite por link/código para família — também vira mecanismo de crescimento orgânico.
5. Rateio entre membros da família (quem deve pra quem, tipo Splitwise).
6. PIN/biometria para abrir o app.
7. Categorização automática por regra simples (não IA — "se contém 'Uber', sugerir Transporte").
8. Tela de privacidade/exclusão de conta (também possível exigência de publicação).
9. Indicador simples de "saúde financeira" (termômetro de organização, não score de crédito).
10. Exportar/baixar dados do usuário (reforça "seus dados são seus", relevante para LGPD).

## Proposta de roadmap (camada sobre o `ROADMAP.md`)

| Fase do `ROADMAP.md` | Adições sugeridas por este discovery |
|---|---|
| MVP Mobile / Publicação | + Lembrete local de vencimento · + PIN/biometria · + Tela de privacidade/exclusão de conta · + Onboarding sem fricção |
| Modo Família | + Convite por link · + Rateio entre membros |
| Web | sem mudança |
| Modo Empresa | + Considerar "Modo MEI" como degrau intermediário antes do Modo Empresa completo |
| Premium | + Definir tiers: histórico estendido, relatórios/export, família ampliada, MEI/empresa |
| IA | + Categorização automática por regra simples pode vir antes da IA de verdade |
| Nova fase a considerar | Open Finance/importação bancária — não está no roadmap atual; maior alavanca de retenção de longo prazo, avaliar posicionamento (depois de Web, antes ou junto de Empresa) |

## Se fosse cofundador, ordem de implementação sugerida

1. Corrigir bugs de confiança financeira já mapeados (valores, recálculo de empréstimo, saldo de investimento).
2. PIN/biometria ao abrir o app.
3. Lembrete local de vencimento.
4. Resumo mensal por notificação.
5. Reduzir fricção do cadastro (explicar documento, permitir pular onboarding).
6. Tela de privacidade + exclusão de conta.
7. Só depois, Modo Família — com convite por link já pensado desde o início.
