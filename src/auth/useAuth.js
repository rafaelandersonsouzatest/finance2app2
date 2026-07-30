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
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { gerarAvatarPadrao } from "../utils/avatar";
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
  // 🔥 Criar o membro-espelho do dono da conta, caso não exista
  // (autocura para contas criadas antes desta sprint — ver
  // SPRINT5_DISCOVERY.md seção 2.3. Usa `id` = uid do dono, então repetir a
  // chamada nunca duplica.)
  // ===================================================
  const criarMembroProprietarioSeNaoExistir = async (uid, nome) => {
    if (!uid) return;
    try {
      const ref = doc(db, "users", uid, "membros", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          nome: nome || "",
          ativo: true,
          avatar: gerarAvatarPadrao(uid),
          ehProprietario: true,
          uid,
          criadoEm: serverTimestamp(),
        });
      } else if (!snap.data().avatar) {
        // 🔹 Autocura específica do avatar: cobre membros criados entre o
        // incremento 1 (sem avatar) e este incremento. Checagem é sempre
        // pelo campo `avatar` em si, nunca pela existência do documento —
        // um avatar já presente (gerado ou, no futuro, personalizado pelo
        // usuário) nunca é sobrescrito.
        await updateDoc(ref, { avatar: gerarAvatarPadrao(uid) });
      }
    } catch (err) {
      console.error("❌ Erro ao criar/atualizar avatar do membro-proprietário:", err);
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
      let nomeParaMembro;

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

          // 🔥 Avatar vetorial gerado por seed (Sprint 5 — mesmo avatar do
          // membro-espelho, seed = uid, ver SPRINT5_DISCOVERY.md seção 5).
          avatarUrl: gerarAvatarPadrao(firebaseUser.uid),
        };

        await setDoc(ref, userData);
        console.log("✅ Perfil criado:", userData.email);
        nomeParaMembro = userData.apelido || userData.nome;
      } else {
        const dadosPerfil = snap.data();
        nomeParaMembro = dadosPerfil.apelido || dadosPerfil.nome;

        // 🔹 Mesma autocura do membro-proprietário: só gera se o campo
        // ainda não existir — nunca sobrescreve um avatar já presente.
        if (!dadosPerfil.avatarUrl) {
          await updateDoc(ref, { avatarUrl: gerarAvatarPadrao(firebaseUser.uid) });
        }
      }

      await criarMembroProprietarioSeNaoExistir(firebaseUser.uid, nomeParaMembro);
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
        // 🔥 Avatar vetorial gerado por seed (Sprint 5) — mesmo avatar do
        // membro-espelho, seed = uid, ver SPRINT5_DISCOVERY.md seção 5.
        avatarUrl: gerarAvatarPadrao(cred.user.uid),
      };

      // 🔹 Grava o perfil, a reserva do documento e o membro-espelho do
      // dono da conta juntos, em lote — nascem atomicamente (ou nenhum dos
      // três, se algo falhar no meio). Ver SPRINT5_DISCOVERY.md seção 2.3.
      const batch = writeBatch(db);
      batch.set(doc(db, "users", cred.user.uid), userData);
      batch.set(reservaRef, { reservado: true });
      batch.set(doc(db, "users", cred.user.uid, "membros", cred.user.uid), {
        nome: userData.apelido || userData.nome,
        ativo: true,
        avatar: userData.avatarUrl,
        ehProprietario: true,
        uid: cred.user.uid,
        criadoEm: serverTimestamp(),
      });
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
  // 🔥 Atualizar dados do próprio perfil (ex.: nome de exibição)
  // ===================================================
  const atualizarPerfil = async (dados) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    await updateDoc(doc(db, "users", user.uid), dados);
    setProfile((prev) => (prev ? { ...prev, ...dados } : prev));

    // 🔹 Mantém o nome e o avatar do membro-espelho sincronizados com o
    // perfil (decisão registrada em SPRINT5_DISCOVERY.md seção 2.4, agora
    // estendida ao avatar no editor) — um único lugar para editar o
    // próprio nome/avatar, para as duas superfícies (Conta e Membros)
    // nunca ficarem dessincronizadas.
    const sincronizacaoMembro = {};
    if (dados.apelido !== undefined) sincronizacaoMembro.nome = dados.apelido;
    if (dados.avatarUrl !== undefined) sincronizacaoMembro.avatar = dados.avatarUrl;

    if (Object.keys(sincronizacaoMembro).length > 0) {
      try {
        await updateDoc(doc(db, "users", user.uid, "membros", user.uid), {
          ...sincronizacaoMembro,
          atualizadoEm: serverTimestamp(),
        });
      } catch (err) {
        // Autocura (criarUserProfileSeNaoExistir) garante esse documento no
        // próximo login — não deve bloquear a edição do perfil.
        console.error("❌ Erro ao sincronizar membro-proprietário:", err);
      }
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
        atualizarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
