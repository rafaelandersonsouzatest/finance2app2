import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "./useAuth";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";

// =======================================================
// 🔹 Funções utilitárias (CPF e CNPJ) + Máscara automática
// =======================================================
const formatarDocumento = (valor) => {
  const digits = valor.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  }
};

const validarCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.charAt(10));
};

const validarCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]+/g, "");
  if (cnpj.length !== 14) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho++;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
};

// =======================================================
// 🔹 Validação de senha
// =======================================================
// Em produção, exige senha forte de verdade (8+ caracteres, maiúscula,
// minúscula, número e símbolo — os mesmos critérios já mostrados na barra de
// força abaixo). Em desenvolvimento (__DEV__), mantemos só o mínimo de 6
// caracteres para facilitar testes.
const REGEX_SENHA_FORTE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;

const validarSenha = (senha) => {
  if (__DEV__) return senha.length >= 6;
  return REGEX_SENHA_FORTE.test(senha);
};

// =======================================================
// 🔹 Tela de Registro
// =======================================================
export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [senhaEmFoco, setSenhaEmFoco] = useState(false);
  const [documento, setDocumento] = useState("");
  const [tipoDoc, setTipoDoc] = useState(null);
  const [docValido, setDocValido] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDocumentoChange = (text) => {
    const formatted = formatarDocumento(text);
    setDocumento(formatted);

    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 11) {
      setTipoDoc("cpf");
      setDocValido(validarCPF(clean));
    } else if (clean.length === 14) {
      setTipoDoc("cnpj");
      setDocValido(validarCNPJ(clean));
    } else {
      setTipoDoc(null);
      setDocValido(null);
    }
  };

  const handleRegister = async () => {
    const cleanDoc = documento.replace(/\D/g, "");
    if (!email || !senha || !confirmarSenha || !cleanDoc)
      return global.alertaGlobal({
        titulo: "Atenção",
        mensagem: "Preencha todos os campos.",
        tipo: "alert",
      });

    if (senha !== confirmarSenha)
      return global.alertaGlobal({
        titulo: "Erro",
        mensagem: "As senhas não conferem.",
        tipo: "error",
      });

    if (!validarSenha(senha))
      return global.alertaGlobal({
        titulo: "Erro",
        mensagem: __DEV__
          ? "Senha muito curta. Use pelo menos 6 caracteres."
          : "Senha muito fraca. Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.",
        tipo: "error",
      });

    if (!docValido)
      return global.alertaGlobal({
        titulo: "Erro",
        mensagem: "CPF ou CNPJ inválido.",
        tipo: "error",
      });

    try {
      setLoading(true);
      await register(email.trim(), senha, cleanDoc, tipoDoc, apelido);

    } catch (e) {
      console.error("Erro ao registrar:", e);

      global.alertaGlobal({
        titulo: "Erro",
        mensagem: e?.message || "Falha ao registrar. Tente novamente.",
        tipo: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocLabel = () => {
    if (!tipoDoc) return "Digite seu CPF ou CNPJ";
    if (docValido) return tipoDoc === "cpf" ? "CPF válido" : "CNPJ válido";
    return tipoDoc === "cpf" ? "CPF inválido" : "CNPJ inválido";
  };

  // =======================================================
  // 🔹 Lógica de força da senha
  // =======================================================
  const forcaSenha = (senha) => {
    let score = 0;
    if (senha.length >= 8) score++;
    if (/[A-Z]/.test(senha)) score++;
    if (/[a-z]/.test(senha)) score++;
    if (/\d/.test(senha)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(senha)) score++;

    const cores = [colors.gasto, "#f39c12", "#f1c40f", "#2ecc71", colors.balance];
    const niveis = ["Muito fraca", "Fraca", "Média", "Forte", "Excelente"];

    return { score, cor: cores[score - 1] || "#ccc", nivel: niveis[score - 1] || "" };
  };

  const forca = forcaSenha(senha);

  return (
    <View
      style={[
        globalStyles.container,
        { justifyContent: "center", paddingHorizontal: 24 },
      ]}
    >
      <Text
        style={[
          globalStyles.screenTitle,
          { textAlign: "center", marginBottom: 24 },
        ]}
      >
        Criar nova conta
      </Text>
        {/* Campo apelido */}
        <TextInput
          style={[
            globalStyles.input,
            { marginBottom: 12 }
          ]}
          placeholder="Como você quer ser chamado(a)?"
          placeholderTextColor={colors.textSecondary}
          value={apelido}
          onChangeText={setApelido}
        />

      {/* Campo de e-mail */}
      <TextInput
        style={[
          globalStyles.input,
          email.length > 0 && {
            borderColor: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              ? colors.balance
              : colors.gasto,
          },
        ]}
        placeholder="E-mail"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {email.length > 0 && (
        <Text
          style={{
            color: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              ? colors.balance
              : colors.gasto,
            textAlign: "right",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? "E-mail válido"
            : "E-mail inválido"}
        </Text>
      )}

      {/* Campo de senha */}
      <View style={{ marginTop: 12, position: "relative" }}>
        <TextInput
          style={[
            globalStyles.input,
            senha.length > 0 && { borderColor: forca.cor },
            { paddingRight: 44 },
          ]}
          placeholder="Senha"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!mostrarSenha}
          value={senha}
          onChangeText={setSenha}
          onFocus={() => setSenhaEmFoco(true)}
          onBlur={() => setSenhaEmFoco(false)}
        />
        <TouchableOpacity
          onPress={() => setMostrarSenha(!mostrarSenha)}
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

      {senha.length > 0 && (
        <>
          <View
            style={{
              height: 6,
              borderRadius: 10,
              marginTop: 6,
              backgroundColor: "#eee",
            }}
          >
            <View
              style={{
                width: `${(forca.score / 5) * 100}%`,
                height: "100%",
                backgroundColor: forca.cor,
                borderRadius: 10,
              }}
            />
          </View>
          <Text
            style={{
              color: forca.cor,
              textAlign: "right",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {forca.nivel}
          </Text>
        </>
      )}

      {/* Critérios de senha */}
      {senhaEmFoco && (
        <View style={{ marginTop: 8 }}>
          {[
            { label: "Mínimo de 8 caracteres", check: senha.length >= 8 },
            { label: "Uma letra maiúscula", check: /[A-Z]/.test(senha) },
            { label: "Uma letra minúscula", check: /[a-z]/.test(senha) },
            { label: "Um número", check: /\d/.test(senha) },
            {
              label: "Um símbolo",
              check: /[!@#$%^&*(),.?\":{}|<>]/.test(senha),
            },
          ].map((item, index) => (
            <Text
              key={index}
              style={{
                color: item.check
                  ? colors.balance + "cc"
                  : colors.textSecondary,
                fontSize: 12,
                marginBottom: 2,
              }}
            >
              {item.label}
            </Text>
          ))}
        </View>
      )}

      {/* Campo de confirmar senha */}
      <View style={{ marginTop: 12, position: "relative" }}>
        <TextInput
          style={[
            globalStyles.input,
            confirmarSenha.length > 0 && {
              borderColor:
                confirmarSenha === senha ? colors.balance : colors.gasto,
            },
            { paddingRight: 44 },
          ]}
          placeholder="Confirmar senha"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!mostrarConfirmarSenha}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
        />
        <TouchableOpacity
          onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: [{ translateY: -11 }],
          }}
        >
          <MaterialCommunityIcons
            name={
              mostrarConfirmarSenha ? "eye-off-outline" : "eye-outline"
            }
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {confirmarSenha.length > 0 && (
        <Text
          style={{
            color:
              confirmarSenha === senha ? colors.balance : colors.gasto,
            textAlign: "right",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {confirmarSenha === senha
            ? "Senhas conferem"
            : "Senhas não conferem"}
        </Text>
      )}

      {/* Campo CPF/CNPJ */}
      <TextInput
        style={[
          globalStyles.input,
          {
            marginTop: 12,
            borderColor:
              docValido === null
                ? globalStyles.input.borderColor
                : docValido
                ? colors.balance
                : colors.gasto,
          },
        ]}
        placeholder="CPF ou CNPJ"
        placeholderTextColor={colors.textSecondary}
        value={documento}
        onChangeText={handleDocumentoChange}
        keyboardType="numeric"
        maxLength={18}
      />

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          marginTop: 4,
        }}
      >
        Pedimos isso para preparar sua conta para recursos futuros, como
        compartilhar as finanças com família ou parceiro(a).
      </Text>

      {documento.length > 0 && (
        <Text
          style={{
            color:
              docValido === null
                ? colors.textSecondary
                : docValido
                ? colors.balance
                : colors.gasto,
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {getDocLabel()}
        </Text>
      )}

      {/* Botão de registrar */}
      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={globalStyles.saveButtonText}>Registrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: 16 }}
      >
        <Text style={{ color: colors.primary, textAlign: "center" }}>
          Voltar ao login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
