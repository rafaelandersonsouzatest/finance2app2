// src/auth/useAuth.js
import { useState, useEffect, useContext, createContext, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth, db } from "../config/firebase";
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Firebase Auth
  const [profile, setProfile] = useState(null); // Firestore profile
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // 🔒 Evita que o listener abaixo tente criar o perfil ao mesmo tempo que
  // register() já está criando o dele (com os dados completos) — sem isso,
  // os dois disputam quem grava primeiro e o perfil pode nascer incompleto.
  const registrandoRef = useRef(false);

  // ===================================================
  // 🔥 Carregar perfil completo do Firestore
  // ===================================================
  const carregarPerfil = async (uid) => {
    try {
      setProfileLoading(true);

      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProfile(snap.data());
      }
    } catch (error) {
      console.log("Erro carregando perfil:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  // ===================================================
  // 🔥 Criar perfil caso não exista
  // ===================================================
  const criarUserProfileSeNaoExistir = async (firebaseUser, extraData = {}) => {
    if (!firebaseUser?.uid) return;

    try {
      const ref = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          nome: firebaseUser.displayName || "",
          apelido: extraData.apelido || firebaseUser.displayName || "",
          tipoUsuario: extraData.tipoUsuario || "pessoa_fisica",
          plano: extraData.plano || "free",
          tenantId: extraData.tenantId || firebaseUser.uid,
          documento: extraData.documento || "",
          tipoDocumento: extraData.tipoDocumento || "",
          criadoEm: new Date().toISOString(),

          // 🔥 Controle de primeiro acesso
          primeiroAcesso: true,
          jaViuOnboarding: false,
        };

        await setDoc(ref, userData);
        console.log("✅ Perfil criado:", userData.email);
      }

    } catch (err) {
      console.error("❌ Erro ao criar/atualizar perfil:", err);
    }
  };

  // ===================================================
  // 🔥 Listener do Firebase Auth
  // ===================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      // Durante o cadastro, é o próprio register() quem cria o perfil e
      // recarrega — evita a corrida com os dados completos (ver registrandoRef).
      if (registrandoRef.current) return;

      await criarUserProfileSeNaoExistir(firebaseUser);
      await carregarPerfil(firebaseUser.uid);
    });

    return unsubscribe;
  }, []);

  // ===================================================
  // 🔥 Login
  // ===================================================
  const login = async (email, senha) => {
    try {
      const emailNormalizado = email.trim().toLowerCase();

      const cred = await signInWithEmailAndPassword(auth, emailNormalizado, senha);

      await criarUserProfileSeNaoExistir(cred.user);
      await carregarPerfil(cred.user.uid);

      return { success: true, user: cred.user };
    } catch (err) {
      console.error("Erro no login:", err);

      switch (err.code) {
        case "auth/invalid-email":
          throw new Error("E-mail inválido.");
        case "auth/user-not-found":
          throw new Error("Usuário não encontrado.");
        case "auth/wrong-password":
        case "auth/invalid-credential":
          throw new Error("E-mail ou senha incorretos.");
        case "auth/too-many-requests":
          throw new Error("Muitas tentativas. Tente novamente mais tarde.");
        case "auth/network-request-failed":
          throw new Error("Erro de conexão. Verifique sua internet.");
        default:
          throw new Error(err?.message || "Falha ao realizar login.");
      }
    }
  };
  // ===================================================
  // 🔥 Registro
  // ===================================================
  const register = async (email, senha, documento, tipoDoc, apelido = "") => {
    registrandoRef.current = true;

    try {
      const cleanDoc = documento.replace(/\D/g, "");
      const emailLower = email.trim().toLowerCase();

      // 🔹 Verifica duplicidade de CPF/CNPJ antes de criar qualquer coisa,
      // usando a reserva (documentosCadastrados) — não é possível mais
      // consultar a coleção "users" inteira sob as novas regras de segurança.
      const reservaRef = doc(db, "documentosCadastrados", cleanDoc);
      const reservaSnap = await getDoc(reservaRef);
      if (reservaSnap.exists()) {
        throw new Error(`Já existe um usuário com esse ${tipoDoc.toUpperCase()}.`);
      }

      // 🔹 Duplicidade de e-mail: o próprio Firebase Authentication já
      // impede e-mail repetido nativamente (erro auth/email-already-in-use,
      // tratado no catch abaixo) — não precisa de checagem própria.
      const cred = await createUserWithEmailAndPassword(auth, emailLower, senha);

      const extraData = {
        documento: cleanDoc,
        tipoDocumento: tipoDoc,
        tipoUsuario: tipoDoc === "cnpj" ? "empresa" : "pessoa_fisica",
        plano: "free",
        tenantId: cred.user.uid,
        apelido: apelido.trim(),
      };

      const userData = {
        uid: cred.user.uid,
        email: cred.user.email || "",
        nome: cred.user.displayName || "",
        apelido: extraData.apelido || cred.user.displayName || "",
        tipoUsuario: extraData.tipoUsuario,
        plano: extraData.plano,
        tenantId: extraData.tenantId,
        documento: extraData.documento,
        tipoDocumento: extraData.tipoDocumento,
        criadoEm: new Date().toISOString(),
        primeiroAcesso: true,
        jaViuOnboarding: false,
      };

      // 🔹 Grava o perfil e a reserva do documento juntos, em lote — os dois
      // nascem atomicamente (ou nenhum dos dois, se algo falhar no meio).
      const batch = writeBatch(db);
      batch.set(doc(db, "users", cred.user.uid), userData);
      batch.set(reservaRef, { reservado: true });
      await batch.commit();

      await carregarPerfil(cred.user.uid);

      return { success: true, user: cred.user };
    } catch (err) {
      console.error("Erro no registro:", err);

      switch (err.code) {
        case "auth/email-already-in-use":
          throw new Error("Esse e-mail já está cadastrado.");
        case "auth/invalid-email":
          throw new Error("E-mail inválido.");
        case "auth/weak-password":
          throw new Error("Senha muito fraca. Use pelo menos 6 caracteres.");
        default:
          throw err;
      }
    } finally {
      registrandoRef.current = false;
    }
  };

  // ===================================================
  // 🔥 Logout
  // ===================================================
  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  // ===================================================
  // 🔥 Login Google
  // ===================================================
  const loginWithGoogle = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "meuapp",
        useProxy: true,
      });

      const CLIENT_ID =
        "235824014044-5jri4robn2smlpaf6q46g4hin7bv8rlq.apps.googleusercontent.com";

      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth" +
        "?response_type=token" +
        `&client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        "&scope=profile%20email";

      const result = await AuthSession.startAsync({ authUrl });

      if (result.type === "success") {
        const credential = GoogleAuthProvider.credential(null, result.params.access_token);
        const cred = await signInWithCredential(auth, credential);
        await criarUserProfileSeNaoExistir(cred.user);
        await carregarPerfil(cred.user.uid);
      }
    } catch (error) {
      console.error("Erro Google:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        login,
        register,
        logout,
        loginWithGoogle,
        carregarPerfil, // 🔥 agora está no contexto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
