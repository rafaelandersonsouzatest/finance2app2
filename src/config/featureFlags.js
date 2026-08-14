// src/config/featureFlags.js
// Colaboração entre Usuários (ver COLABORACAO_ARQUITETURA_V1.md) — só é
// oferecida de verdade quando existe backend real por trás: Blaze habilitado
// + Cloud Functions implantadas + firestore.rules publicadas nos 4 projetos.
// Nenhum desses três passos foi feito ainda (decisão registrada em
// ARQUITETURA.md seção 16.1/7.3) — até acontecer, a funcionalidade só roda
// de verdade contra o Firebase Local Emulator Suite.
//
// Quando o backend real estiver pronto, mude só a linha abaixo para `true`
// — nenhum componente de UI (UserMenu.js, ConexoesScreen.js) precisa ser
// tocado, os dois já leem esta mesma flag.
import { usandoEmulador } from './firebase';

const COLABORACAO_BACKEND_REAL_PRONTO = false;

export const colaboracaoDisponivel = usandoEmulador || COLABORACAO_BACKEND_REAL_PRONTO;
