// src/components/SeletorConexoes.js
// Lista de conexões aceitas com busca por nome + seleção — extraído de
// ModalCompartilharDespesa.js (seção 11.3, 2026-08-17). Estendido
// (2026-08-17) para também listar Membros sem conta (seção 7) numa segunda
// seção — mesmo componente de busca+lista, dois espaços de id diferentes
// (`usuarioConectadoId` vs `membroId`), nunca misturados. Puramente
// apresentacional: recebe tudo por prop, nunca busca dados por conta própria
// (ver ARQUITETURA.md seção 19).
import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import AvatarRenderer from './AvatarRenderer';

function filtrarPorNome(lista, campoNome, termo) {
  if (!termo) return lista;
  return lista.filter((item) => (item[campoNome] || '').toLowerCase().includes(termo));
}

export default function SeletorConexoes({
  conexoes,
  selecionados,
  onToggle,
  textoVazio = 'Você ainda não tem nenhuma conexão aceita.',
  renderExtra,
  membros = [],
  membrosSelecionados,
  onToggleMembro,
  renderExtraMembro,
}) {
  const [busca, setBusca] = useState('');

  const termo = busca.trim().toLowerCase();
  const conexoesFiltradas = useMemo(
    () => filtrarPorNome(conexoes, 'nomeExibicao', termo),
    [conexoes, termo]
  );
  const membrosFiltrados = useMemo(() => filtrarPorNome(membros, 'nome', termo), [membros, termo]);

  if (conexoes.length === 0 && membros.length === 0) {
    return <Text style={{ color: colors.textSecondary }}>{textoVazio}</Text>;
  }

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.cardBackground,
          borderRadius: 8,
          paddingHorizontal: 12,
          marginBottom: 12,
        }}
      >
        <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar..."
          placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.textPrimary, paddingVertical: 10, marginLeft: 8 }}
        />
      </View>

      {conexoesFiltradas.length === 0 && membrosFiltrados.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>Nenhuma conexão encontrada.</Text>
      ) : (
        <>
          {conexoesFiltradas.map((c) => {
            const uid = c.usuarioConectadoId;
            const selecionado = selecionados.has(uid);
            return (
              <View
                key={c.id}
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => onToggle(uid)}
                >
                  <AvatarRenderer avatar={c.avatarSnapshot} nome={c.nomeExibicao} variante="mini" />
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 15,
                      fontWeight: '600',
                      marginLeft: 10,
                      flex: 1,
                    }}
                  >
                    {c.nomeExibicao || 'Usuário'}
                  </Text>
                  <MaterialCommunityIcons
                    name={selecionado ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={22}
                    color={selecionado ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>

                {selecionado && renderExtra ? renderExtra(c) : null}
              </View>
            );
          })}

          {/* Membro sem conta (seção 7) — pessoa que não usa o app; entra
              direto como confirmada, sem convite. Nunca no mesmo espaço de
              seleção das conexões (id diferente: membroId, não uid). Seção
              sempre visível, mesmo com zero Membro cadastrado (2026-08-17,
              feedback de teste manual: sem isso, ninguém descobria que a
              opção existia) — nesse caso mostra como criar um. */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              textTransform: 'uppercase',
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            Sem conta no app
          </Text>
          {membros.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
              Nenhuma pessoa sem conta cadastrada ainda. Adicione uma em "Gerenciar Membros" pra
              poder dividir com ela por aqui.
            </Text>
          ) : (
            membrosFiltrados.map((m) => {
              const selecionado = !!membrosSelecionados?.has(m.id);
              return (
                <View
                  key={m.id}
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => onToggleMembro?.(m.id)}
                  >
                    <AvatarRenderer avatar={m.avatar} nome={m.nome} variante="mini" />
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: 15,
                        fontWeight: '600',
                        marginLeft: 10,
                        flex: 1,
                      }}
                    >
                      {m.nome || 'Membro'}
                    </Text>
                    <MaterialCommunityIcons
                      name={selecionado ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={22}
                      color={selecionado ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {selecionado && renderExtraMembro ? renderExtraMembro(m) : null}
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}
