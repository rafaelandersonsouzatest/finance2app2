import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [emailValido, setEmailValido] = useState(null); // null = vazio, true válido, false inválido
  const [erroLogin, setErroLogin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validarEmail = (txt) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt);

  // Carrega último e-mail usado
  useEffect(() => {
    (async () => {
      const salvo = await AsyncStorage.getItem("@ultimoEmail");
      if (salvo) setEmail(salvo);
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !senha)
      return global.alertaGlobal({
        titulo: "Atenção",
        mensagem: "Preencha todos os campos.",
        tipo: "alert",
      });

    try {
      setErroLogin(false);
      setLoading(true);

      await login(email.trim(), senha);

      await AsyncStorage.setItem("@ultimoEmail", email.trim());

      global.alertaGlobal({
        titulo: "Sucesso",
        mensagem: "Login realizado com sucesso!",
        tipo: "success",
      });
      } catch (e) {
      setErroLogin(true);

      global.alertaGlobal({
        titulo: "Erro",
        mensagem: e?.message || "Falha ao realizar login.",
        tipo: "error",
      });
        } finally {
          setLoading(false);
        }
    };

  const handleLoginGoogle = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();

      global.alertaGlobal({
        titulo: "Sucesso",
        mensagem: "Login com Google realizado!",
        tipo: "success",
      });
    } catch {
      global.alertaGlobal({
        titulo: "Erro",
        mensagem: "Falha ao autenticar com Google.",
        tipo: "error",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View
      style={[
        globalStyles.container,
        { justifyContent: "center", paddingHorizontal: 24 },
      ]}
    >
      {/* Logo */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }}
        />
        <Text style={[globalStyles.screenTitle, { textAlign: "center" }]}>
          FinanceApp
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          Bem-vindo(a) de volta!
        </Text>
      </View>

      {/* E-mail */}
      <TextInput
        style={[
          globalStyles.input,
          email.length > 0 && {
            borderColor: emailValido ? colors.balance : colors.gasto,
          },
          erroLogin && { borderColor: colors.gasto },
        ]}
        placeholder="E-mail"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={(txt) => {
          setEmail(txt);
          setEmailValido(validarEmail(txt));
          setErroLogin(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {email.length > 0 && (
        <Text
          style={{
            fontSize: 12,
            marginTop: 4,
            textAlign: "right",
            color: emailValido ? colors.balance : colors.gasto,
          }}
        >
          {emailValido ? "E-mail válido" : "E-mail inválido"}
        </Text>
      )}

      {/* Senha + Olho */}
      <View style={{ marginTop: 12, position: "relative" }}>
        <TextInput
          style={[
            globalStyles.input,
            erroLogin && { borderColor: colors.gasto },
            { paddingRight: 44 },
          ]}
          placeholder="Senha"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!mostrarSenha}
          value={senha}
          onChangeText={(txt) => {
            setSenha(txt);
            setErroLogin(false);
          }}
        />

        <TouchableOpacity
          onPress={() => setMostrarSenha((prev) => !prev)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: [{ translateY: -11 }],
          }}
        >
          <MaterialCommunityIcons
            name={mostrarSenha ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Erro login */}
      {erroLogin && (
        <Text
          style={{
            color: colors.gasto,
            textAlign: "right",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          Usuário ou senha incorretos
        </Text>
      )}

      {/* Botão Entrar */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={globalStyles.saveButtonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      {/* Google */}
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
          elevation: 2,
        }}
      >
        {googleLoading ? (
          <ActivityIndicator color="#DB4437" />
        ) : (
          <>
            <MaterialCommunityIcons
              name="google"
              size={20}
              color="#DB4437"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: "#DB4437",
                fontWeight: "bold",
                fontSize: 15,
              }}
            >
              Entrar com Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Links */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword")}
        style={{ marginTop: 16 }}
      >
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          Esqueceu a senha?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Register")}
        style={{ marginTop: 12 }}
      >
        <Text style={{ color: colors.primary, textAlign: "center" }}>
          Criar nova conta
        </Text>
      </TouchableOpacity>
    </View>
  );
}
