import { useState, useEffect, useContext, createContext } from "react";
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
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===================================================
  // 🔹 Cria ou atualiza o perfil no Firestore
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
        };


        await setDoc(ref, userData);
        console.log("✅ Perfil criado:", userData.email);
      } else {
        console.log("ℹ️ Perfil já existe:", firebaseUser.email);
      }
    } catch (err) {
      console.error("❌ Erro ao criar/atualizar perfil:", err);
      throw new Error("Falha ao criar ou sincronizar o perfil do usuário.");
    }
  };

  // ===================================================
  // 🔹 Observa o estado de autenticação
  // ===================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) await criarUserProfileSeNaoExistir(firebaseUser);
    });
    return unsubscribe;
  }, []);

  // ===================================================
  // 🔹 Login tradicional (email/senha)
  // ===================================================
  const login = async (email, senha) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      await criarUserProfileSeNaoExistir(cred.user);
      return { success: true, user: cred.user };
    } catch (err) {
      console.error("Erro no login:", err.code);

      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password")
        throw new Error("Usuário ou senha incorretos.");
      if (err.code === "auth/user-not-found")
        throw new Error("Usuário não encontrado. Verifique o e-mail.");
      if (err.code === "auth/too-many-requests")
        throw new Error("Muitas tentativas. Tente novamente mais tarde.");
      throw new Error("Falha ao realizar login. Tente novamente.");
    }
  };

// ===================================================
// 🔹 Registro com checagem de duplicidade
// ===================================================
const register = async (email, senha, documento, tipoDoc, apelido = "") => {
  try {
    const cleanDoc = documento.replace(/\D/g, "");
    const emailLower = email.trim().toLowerCase();

    // 🔍 Verifica duplicidade de CPF/CNPJ
    const qDoc = query(collection(db, "users"), where("documento", "==", cleanDoc));
    const snapDoc = await getDocs(qDoc);
    if (!snapDoc.empty) {
      const existingUser = snapDoc.docs[0].data();
      throw new Error(
        `Já existe um usuário cadastrado com esse ${tipoDoc.toUpperCase()}.`
      );
    }

    // 🔍 Verifica duplicidade de e-mail
    const qEmail = query(collection(db, "users"), where("email", "==", emailLower));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      throw new Error("Esse e-mail já está cadastrado. Faça login ou use outro e-mail.");
    }

    // 🔐 Cria usuário no Auth
    const cred = await createUserWithEmailAndPassword(auth, emailLower, senha);
    const user = cred.user;

    // 🧾 Cria documento no Firestore
    const extraData = {
      documento: cleanDoc,
      tipoDocumento: tipoDoc,
      tipoUsuario: tipoDoc === "cnpj" ? "empresa" : "pessoa_fisica",
      plano: "free",
      tenantId: user.uid,
      apelido: apelido.trim(), // ✅ adiciona o campo “Como você quer ser chamado?”
    };

    await criarUserProfileSeNaoExistir(user, extraData);
    console.log("✅ Usuário registrado:", user.email);

    return { success: true, user };
  } catch (err) {
    console.error("Erro no registro:", err.message || err.code);
    throw err;
  }
};

  // ===================================================
  // 🔹 Logout
  // ===================================================
  const logout = async () => {
    await signOut(auth);
    console.log("👋 Usuário desconectado.");
  };

  // ===================================================
  // 🔹 Login com Google (Expo + Firebase)
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

      if (result.type === "success" && result.params.access_token) {
        const credential = GoogleAuthProvider.credential(null, result.params.access_token);
        await signInWithCredential(auth, credential);
        await criarUserProfileSeNaoExistir(auth.currentUser);
        return { success: true };
      } else {
        throw new Error("Login cancelado.");
      }
    } catch (error) {
      console.error("Erro no login com Google:", error);
      throw new Error("Falha ao autenticar com Google.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
