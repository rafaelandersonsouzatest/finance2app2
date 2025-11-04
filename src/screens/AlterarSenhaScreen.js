import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { auth } from "../config/firebase";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";

export default function AlterarSenhaScreen({ navigation }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return global.alertaGlobal({
        titulo: "Atenção",
        mensagem: "Preencha todos os campos.",
        tipo: "alert",
      });
    }

    if (novaSenha !== confirmarSenha) {
      return global.alertaGlobal({
        titulo: "Erro",
        mensagem: "As senhas não coincidem.",
        tipo: "error",
      });
    }

    try {
      setLoading(true);
      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error("Usuário não autenticado");
      }

      // Reautentica com a senha atual
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credential);

      // Atualiza senha
      await updatePassword(user, novaSenha);

      global.alertaGlobal({
        titulo: "Sucesso",
        mensagem: "Senha alterada com sucesso!",
        tipo: "success",
      });

      navigation.goBack();
    } catch (error) {
      console.error(error);
      global.alertaGlobal({
        titulo: "Erro",
        mensagem:
          error.code === "auth/wrong-password"
            ? "Senha atual incorreta."
            : "Não foi possível alterar a senha. Tente novamente.",
        tipo: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[globalStyles.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
      {/* Cabeçalho */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }}
        />
        <Text style={[globalStyles.screenTitle, { textAlign: "center" }]}>Alterar senha</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
          Digite sua senha atual e a nova senha abaixo
        </Text>
      </View>

      {/* Campos */}
      <TextInput
        style={globalStyles.input}
        placeholder="Senha atual"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={senhaAtual}
        onChangeText={setSenhaAtual}
      />

      <TextInput
        style={[globalStyles.input, { marginTop: 12 }]}
        placeholder="Nova senha"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={novaSenha}
        onChangeText={setNovaSenha}
      />

      <TextInput
        style={[globalStyles.input, { marginTop: 12 }]}
        placeholder="Confirmar nova senha"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
      />

      {/* Botão */}
      <TouchableOpacity
        onPress={handleChangePassword}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={globalStyles.saveButtonText}>Salvar nova senha</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.primary, textAlign: "center" }}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}
