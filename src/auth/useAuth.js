// src/auth/useAuth.js
import { useState, useEffect, useContext, createContext } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "../config/firebase";

// 🔹 Importações necessárias para o login com Google
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

// Necessário para corrigir o fluxo no Expo (Android/iOS)
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Monitora o estado de login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ===================================================
  // 🔹 Login tradicional (email/senha)
  // ===================================================
  const login = async (email, senha) => {
    await signInWithEmailAndPassword(auth, email, senha);
  };

  // ===================================================
  // 🔹 Registro
  // ===================================================
  const register = async (email, senha) => {
    await createUserWithEmailAndPassword(auth, email, senha);
  };

  // ===================================================
  // 🔹 Logout
  // ===================================================
  const logout = async () => {
    await signOut(auth);
  };

  // ===================================================
  // 🔹 Login com Google (Expo + Firebase)
  // ===================================================
  const loginWithGoogle = async () => {
    try {
      // URL de redirecionamento do Expo
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "meuapp",
        useProxy: true,
        });


      // 🔸 Substitua aqui pelo SEU CLIENT ID DO GOOGLE (Web)
      const CLIENT_ID = "235824014044-5jri4robn2smlpaf6q46g4hin7bv8rlq.apps.googleusercontent.com";

      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth" +
        "?response_type=token" +
        `&client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        "&scope=profile%20email";

      const result = await AuthSession.startAsync({ authUrl });

      if (result.type === "success" && result.params.access_token) {
        const credential = GoogleAuthProvider.credential(
          null,
          result.params.access_token
        );
        await signInWithCredential(auth, credential);
        return true;
      } else {
        throw new Error("Login cancelado");
      }
    } catch (error) {
      console.error("Erro no login com Google:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, loginWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
