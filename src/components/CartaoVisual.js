// src/components/CartaoVisual.js
// Representação visual única de um cartão cadastrado — inspirada em Apple
// Wallet/Google Wallet/apps de banco, mas genérica (nenhuma identidade
// visual de instituição específica é copiada). Único componente para isso
// no app: reaproveitado em GerenciarCartoesScreen (CartoesManager), no
// resumo por cartão (CartoesScreen "Por Cartão") e no CartaoSelect — nunca
// duplicado.
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

// 🔹 Escurece uma cor hex para compor o gradiente — sem dependência nova,
// só aritmética simples sobre o RGB.
function escurecerCor(hex, fator = 0.35) {
  if (typeof hex !== 'string') return '#333333';
  const limpo = hex.replace('#', '');
  const normalizado =
    limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo;
  const bigint = parseInt(normalizado, 16);
  if (isNaN(bigint) || normalizado.length !== 6) return hex;

  const r = Math.max(0, Math.floor(((bigint >> 16) & 255) * (1 - fator)));
  const g = Math.max(0, Math.floor(((bigint >> 8) & 255) * (1 - fator)));
  const b = Math.max(0, Math.floor((bigint & 255) * (1 - fator)));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function CartaoVisual({ cartao, tamanho = 'normal', onPress, arquivado = false, resumoMes }) {
  const compacto = tamanho === 'compacto';
  const cor = cartao?.cor || colors.primary;
  const conteudo = (
    <LinearGradient
      colors={[cor, escurecerCor(cor)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradiente,
        compacto ? styles.gradienteCompacto : styles.gradienteNormal,
        arquivado && styles.arquivado,
      ]}
    >
      <View style={styles.topo}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.nome, compacto && styles.nomeCompacto]} numberOfLines={1}>
            {cartao?.nome || 'Cartão'}
          </Text>
          {!!cartao?.banco && (
            <Text style={styles.banco} numberOfLines={1}>
              {cartao.banco}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons
          name="credit-card-wireless-outline"
          size={compacto ? 20 : 26}
          color="rgba(255,255,255,0.85)"
        />
      </View>

      {/* 🔹 Info contextual opcional (ex.: "3 compras este mês", no resumo
          "Por Cartão") — só no tamanho normal; não usada em
          Gerenciar Cartões/CartaoSelect, onde essa contagem não existe. */}
      {!!resumoMes && !compacto && <Text style={styles.resumoMes}>{resumoMes}</Text>}

      {!compacto && <View style={{ flex: 1 }} />}

      <View style={styles.rodape}>
        <Text style={styles.digitos}>•••• {cartao?.ultimos4Digitos || '••••'}</Text>
        {!!cartao?.diaVencimento && (
          <Text style={styles.vencimento}>Vencimento dia {cartao.diaVencimento}</Text>
        )}
      </View>

      {arquivado && (
        <View style={styles.selo}>
          <Text style={styles.seloTexto}>Arquivado</Text>
        </View>
      )}
    </LinearGradient>
  );

  if (!onPress) return conteudo;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      {conteudo}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradiente: {
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  gradienteNormal: {
    height: 170,
    justifyContent: 'space-between',
  },
  gradienteCompacto: {
    height: 84,
    justifyContent: 'space-between',
  },
  arquivado: {
    opacity: 0.55,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nome: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  nomeCompacto: {
    fontSize: 15,
  },
  banco: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },
  resumoMes: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 10,
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  digitos: {
    color: '#fff',
    fontSize: 15,
    letterSpacing: 1,
    fontWeight: '600',
  },
  vencimento: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  selo: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seloTexto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
