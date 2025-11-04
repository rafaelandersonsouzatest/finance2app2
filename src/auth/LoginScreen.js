import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useAuth } from "./useAuth";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha)
      return global.alertaGlobal({ titulo: "Atenção", mensagem: "Preencha todos os campos.", tipo: "alert" });

    try {
      setLoading(true);
      await login(email.trim(), senha);
      global.alertaGlobal({ titulo: "Sucesso", mensagem: "Login realizado com sucesso!", tipo: "success" });
    } catch (e) {
      global.alertaGlobal({ titulo: "Erro", mensagem: "Usuário ou senha incorretos.", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginGoogle = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      global.alertaGlobal({ titulo: "Sucesso", mensagem: "Login com Google realizado!", tipo: "success" });
    } catch {
      global.alertaGlobal({ titulo: "Erro", mensagem: "Falha ao autenticar com Google.", tipo: "error" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[globalStyles.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
      {/* Logo ou ícone */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }}
        />
        <Text style={[globalStyles.screenTitle, { textAlign: "center" }]}>FinanceApp</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Gerencie suas finanças com facilidade</Text>
      </View>

      {/* Inputs */}
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

      {/* Botão Entrar */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.saveButtonText}>Entrar</Text>}
      </TouchableOpacity>

      {/* Login Google */}
      <TouchableOpacity
        onPress={handleLoginGoogle}
        disabled={googleLoading}
        style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
            paddingVertical: 12,
            marginTop: 20,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
        }}
        >
        {googleLoading ? (
            <ActivityIndicator color="#DB4437" />
        ) : (
            <>
            <Image
                source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Google_%22G%22_Logo.svg" }}
                style={{ width: 20, height: 20, marginRight: 10 }}
            />
            <Text style={{ color: "#DB4437", fontWeight: "bold", fontSize: 15 }}>
                Entrar com Google
            </Text>
            </>
        )}
        </TouchableOpacity>


      {/* Links extras */}
      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>Esqueceu a senha?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={{ marginTop: 12 }}>
        <Text style={{ color: colors.primary, textAlign: "center" }}>Criar nova conta</Text>
      </TouchableOpacity>
    </View>
  );
}
