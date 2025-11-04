import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "./useAuth";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !senha)
      return global.alertaGlobal({ titulo: "Atenção", mensagem: "Preencha todos os campos.", tipo: "alert" });

    try {
      setLoading(true);
      await register(email.trim(), senha);
      global.alertaGlobal({ titulo: "Sucesso", mensagem: "Conta criada com sucesso!", tipo: "success" });
      navigation.navigate("Login");
    } catch (e) {
      global.alertaGlobal({ titulo: "Erro", mensagem: "Falha ao registrar. Tente novamente.", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[globalStyles.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
    <Text style={[globalStyles.screenTitle, { textAlign: "center", marginBottom: 24 }]}>
      Criar nova conta 
    </Text>

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
        placeholder="Senha"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.saveButtonText}>Registrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.primary, textAlign: "center" }}>Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}
