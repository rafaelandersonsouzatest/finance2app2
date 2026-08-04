import { useEffect } from 'react';
import { memo } from 'react';
import { View, Text, TextInput } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { formatarBRL } from '../utils/formatarValor';

// =========================================================
// 🔹 Único componente de entrada monetária do app — toda tela que precisa
// editar um valor em reais deve usar exatamente este componente, nunca uma
// máscara/parse própria. Por baixo, usa sempre `useCurrencyInput` (digitação
// em centavos, formatação via `formatarBRL`) — o mesmo mecanismo já usado
// em todo o resto do app antes deste componente existir; ele só passou a
// ser compartilhado, não mudou de comportamento.
// =========================================================
const CampoMonetario = memo(
  ({ label, valor, onChange, placeholder = 'R$ 0,00', style, textInputStyle }) => {
    const { texto, handleChange, setTexto } = useCurrencyInput(valor || 0, onChange);

    // 🔹 Ressincroniza o texto exibido quando o valor vem de fora (reset de
    // formulário, "Restaurar parcelas iguais", troca de item ao editar etc.).
    useEffect(() => {
      setTexto(formatarBRL(valor || 0));
    }, [valor]);

    return (
      <View style={[globalStyles.inputGroup, style]}>
        {!!label && <Text style={globalStyles.label}>{label}</Text>}
        <TextInput
          style={[globalStyles.input, textInputStyle]}
          value={texto}
          onChangeText={handleChange}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
        />
      </View>
    );
  }
);

export default CampoMonetario;
