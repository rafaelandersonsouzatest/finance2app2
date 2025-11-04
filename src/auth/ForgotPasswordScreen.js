import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email)
      return global.alertaGlobal({ titulo: "Atenção", mensagem: "Informe seu e-mail.", tipo: "alert" });

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      global.alertaGlobal({ titulo: "Sucesso", mensagem: "E-mail de redefinição enviado!", tipo: "success" });
    } catch (e) {
      global.alertaGlobal({ titulo: "Erro", mensagem: "Não foi possível enviar o e-mail.", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[globalStyles.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
    <Text style={[globalStyles.screenTitle, { textAlign: "center", marginBottom: 24 }]}>
    Recuperar senha
    </Text>

      <TextInput
        style={globalStyles.input}
        placeholder="Digite seu e-mail"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        onPress={handleReset}
        disabled={loading}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.saveButtonText}>Enviar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.primary, textAlign: "center" }}>Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}
