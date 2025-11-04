import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !senhaAtual || !novaSenha || !confirmarSenha)
      return global.alertaGlobal({
        titulo: "Atenção",
        mensagem: "Preencha todos os campos.",
        tipo: "alert",
      });

    if (novaSenha !== confirmarSenha)
      return global.alertaGlobal({
        titulo: "Erro",
        mensagem: "As senhas não coincidem.",
        tipo: "error",
      });

    try {
      setLoading(true);

      // Faz login para reautenticar o usuário
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), senhaAtual);
      const user = userCredential.user;

      // Atualiza a senha
      await updatePassword(user, novaSenha);

      global.alertaGlobal({
        titulo: "Sucesso",
        mensagem: "Senha redefinida com sucesso!",
        tipo: "success",
      });

      navigation.navigate("Login");
    } catch (error) {
      console.error(error);
      global.alertaGlobal({
        titulo: "Erro",
        mensagem: "Não foi possível redefinir a senha. Verifique seus dados.",
        tipo: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[globalStyles.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
      {/* Logo / Cabeçalho */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }}
        />
        <Text style={[globalStyles.screenTitle, { textAlign: "center" }]}>Redefinir senha</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
          Informe seus dados abaixo
        </Text>
      </View>

      <TextInput
        style={globalStyles.input}
        placeholder="E-mail"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[globalStyles.input, { marginTop: 12 }]}
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

      <TouchableOpacity
        onPress={handleResetPassword}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={globalStyles.saveButtonText}>Redefinir senha</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.primary, textAlign: "center" }}>Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}
