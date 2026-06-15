import React, { useState } from 'react';
import { OfficialLogo } from './OfficialLogo';
import { Shield, Key, Mail, Award, Check, UserPlus, RotateCcw, ArrowLeft, Phone, User as UserIcon } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface LoginViewProps {
  onLogin: (role: 'admin' | 'aluno', email: string, alunoId?: string) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [regTab, setRegTab] = useState<'activate' | 'new'>('activate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>(['Kung Fu Garra de Águia']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const emailLower = email.trim().toLowerCase();

      // Silent/Direct Firebase Auth Sign-In
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (authErr: any) {
        console.error("Auth error:", authErr);
        if (authErr.code === 'auth/operation-not-allowed') {
          setError('O provedor de e-mail e senha está desativado no Console do Firebase. Por favor, acesse o Console do Firebase > Authentication > Sign-in method e ative o provedor "E-mail/Senha" para liberar o login.');
        } else if (authErr.code === 'auth/invalid-email') {
          setError('O formato do e-mail inserido é inválido. Digite um e-mail correto (exemplo@email.com).');
        } else if (authErr.code === 'auth/network-request-failed') {
          setError('Houve um erro de rede ao tentar se conectar ao servidor de autenticação. Verifique sua conexão com a internet.');
        } else if (authErr.code === 'auth/user-disabled') {
          setError('Esta conta de usuário foi intencionalmente desativada ou bloqueada no Console do Firebase.');
        } else if (authErr.code === 'auth/too-many-requests') {
          setError('Acesso bloqueado temporariamente por muitas tentativas malsucedidas de login. Tente novamente mais tarde.');
        } else {
          setError('E-mail ou senha incorretos. (Se for seu primeiro acesso, ative sua conta no botão "Ativar Conta" abaixo).');
        }
        setLoading(false);
        return;
      }

      // Now we are authenticated in Firebase Auth!
      // This means we have full security rule rights to query / get our own documents!
      let foundRole: 'admin' | 'aluno' = 'aluno';
      let foundAlunoId: string | undefined = undefined;

      // Fetch the specific user document directly (getDoc doesn't require list rights)
      const uDocRef = doc(db, 'usuarios', emailLower);
      const uDocSnap = await getDoc(uDocRef);

      if (uDocSnap.exists()) {
        const uDoc = uDocSnap.data();
        foundRole = uDoc.role;
        foundAlunoId = uDoc.alunoId;
      } else {
        // Fallback: If no user doc exists yet but we successfully logged in / signed up,
        // let's check if they have an active aluno record to link
        const qAl = query(collection(db, 'alunos'), where('email', '==', emailLower));
        const alSnap = await getDocs(qAl);
        if (alSnap.empty) {
          setError('Nenhum vínculo de usuário ou aluno foi encontrado para este e-mail. Por favor, fale com o Professor Decio.');
          setLoading(false);
          return;
        }
        const alDoc = alSnap.docs[0];
        const alData = alDoc.data();
        if (alData.excluido) {
          setError('Esta matrícula está arquivada/excluída.');
          setLoading(false);
          return;
        }
        foundRole = 'aluno';
        foundAlunoId = alDoc.id;

        // Auto-create missing user doc since we are now authenticated
        const novoUsuario = {
          id: emailLower,
          email: emailLower,
          role: 'aluno',
          alunoId: alDoc.id
        };
        await setDoc(doc(db, 'usuarios', emailLower), novoUsuario);
      }

      setLoading(false);
      onLogin(foundRole, emailLower, foundAlunoId);
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setError('Ocorreu um erro de autenticação ou de permissão do banco.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) {
        setError('Não foi possível obter o e-mail da sua conta Google.');
        setLoading(false);
        return;
      }

      const emailLower = user.email.trim().toLowerCase();
      let foundRole: 'admin' | 'aluno' = 'aluno';
      let foundAlunoId: string | undefined = undefined;

      const uDocRef = doc(db, 'usuarios', emailLower);
      const uDocSnap = await getDoc(uDocRef);

      if (uDocSnap.exists()) {
        const uDoc = uDocSnap.data();
        foundRole = uDoc.role;
        foundAlunoId = uDoc.alunoId;
      } else {
        // Fallback: Check if they are a bootstrapped admin trying to login for the first time
        if (emailLower === 'deciopadovanijr@gmail.com' || emailLower === 'admin@garradeagua.com.br') {
          foundRole = 'admin';
          const novoUsuario = {
            id: emailLower,
            email: emailLower,
            role: 'admin'
          };
          await setDoc(doc(db, 'usuarios', emailLower), novoUsuario);
        } else {
          // Check if there's an active aluno record to link
          const qAl = query(collection(db, 'alunos'), where('email', '==', emailLower));
          const alSnap = await getDocs(qAl);
          if (alSnap.empty) {
            setError(`O e-mail da sua conta Google ("${emailLower}") não está cadastrado neste sistema como aluno ativo. Se for aluno novo, preencha o formulário na aba "Ainda Não Sou Aluno" ou fale com o Professor Décio.`);
            await auth.signOut().catch(() => {});
            setLoading(false);
            return;
          }
          const alDoc = alSnap.docs[0];
          const alData = alDoc.data();
          if (alData.excluido) {
            setError('Esta matrícula está arquivada/excluída.');
            await auth.signOut().catch(() => {});
            setLoading(false);
            return;
          }
          foundRole = 'aluno';
          foundAlunoId = alDoc.id;

          // Auto-create missing user doc since we are now authenticated
          const novoUsuario = {
            id: emailLower,
            email: emailLower,
            role: 'aluno',
            alunoId: alDoc.id
          };
          await setDoc(doc(db, 'usuarios', emailLower), novoUsuario);
        }
      }

      setLoading(false);
      onLogin(foundRole, emailLower, foundAlunoId);
    } catch (err: any) {
      console.error('Erro na autenticação do Google:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login do Google foi bloqueado pelo seu navegador. Por favor, ative os pop-ups ou tente novamente.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O pop-up de login foi fechado antes de completar o processo.');
      } else {
        setError(`Erro ao autenticar com o Google: ${err.message || err.code}`);
      }
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const emailLower = email.trim().toLowerCase();
    const cpfClean = cpf.replace(/\D/g, '');

    try {
      if (regTab === 'activate') {
        let targetEmail = emailLower;

        // Se o e-mail não foi informado, mas temos o CPF, tentamos buscar o e-mail do aluno pelo CPF
        if (!targetEmail) {
          if (!cpfClean) {
            setError('Por favor, informe seu E-mail cadastrado ou digite seu CPF para que possamos localizar seu cadastro.');
            setLoading(false);
            return;
          }
          try {
            const qCpf = query(collection(db, 'alunos'), where('cpf', '==', cpfClean));
            const cpfSnap = await getDocs(qCpf);
            if (cpfSnap.empty) {
              setError('Nenhum cadastro de aluno foi localizado com o CPF informado nas bases da academia. Por favor, fale com o Professor Décio Padovani ou faça o pré-cadastro ao lado.');
              setLoading(false);
              return;
            }
            const alDocData = cpfSnap.docs[0].data();
            if (!alDocData.email) {
              setError('O cadastro associado a este CPF não possui um e-mail válido configurado. Por favor, entre em contato com o Professor Décio.');
              setLoading(false);
              return;
            }
            targetEmail = alDocData.email.trim().toLowerCase();
          } catch (dbErr: any) {
            console.error("Erro ao buscar CPF:", dbErr);
            let friendlyDbMsg = 'Ocorreu um erro ao consultar o CPF informado no banco de dados.';
            if (dbErr?.code === 'permission-denied' || dbErr?.message?.includes('permission-denied')) {
              friendlyDbMsg = 'Acesso não autorizado para consulta de CPF. Por favor, entre em contato direto com o Professor Décio Padovani.';
            } else if (dbErr?.code === 'resource-exhausted' || dbErr?.message?.includes('Quota exceeded')) {
              friendlyDbMsg = 'O limite diário de consultas do banco de dados foi temporariamente atingido (Quota excedida). Por favor, tente novamente mais tarde.';
            } else if (dbErr?.code === 'unavailable' || dbErr?.message?.includes('unavailable')) {
              friendlyDbMsg = 'O servidor de banco de dados está temporariamente indisponível. Por favor, tente novamente mais tarde.';
            }
            setError(friendlyDbMsg);
            try {
              handleFirestoreError(dbErr, OperationType.GET, 'alunos');
            } catch (errToThrow) {
              // propagate for diagnostics
              throw errToThrow;
            }
            setLoading(false);
            return;
          }
        }

        if (!password) {
          setError('Por favor, insira a senha desejada.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('A senha configurada precisa ter no mínimo 6 caracteres para garantir a segurança da sua conta.');
          setLoading(false);
          return;
        }

        // Try to create standard user credentials in Firebase Auth
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          console.error("Cadastro erro Firebase Auth:", authErr);
          let friendlyMsg = `Não foi possível registrar o usuário na autenticação: ${authErr.message || authErr.code}`;

          if (authErr.code === 'auth/email-already-in-use') {
            friendlyMsg = 'Este e-mail já foi ativado por você ou pelo administrador. Você já pode acessar o sistema na aba de login principal usando seu e-mail e senha.';
          } else if (authErr.code === 'auth/weak-password') {
            friendlyMsg = 'A senha informada é fraca. Ela precisa conter no mínimo 6 caracteres para ser segura.';
          } else if (authErr.code === 'auth/invalid-email') {
            friendlyMsg = `O e-mail "${targetEmail}" detectado no cadastro está com formato inválido. Por favor, peça para o professor corrigir o seu e-mail no painel.`;
          } else if (authErr.code === 'auth/operation-not-allowed') {
            friendlyMsg = 'O provedor de e-mail e senha está desativado no Console do Firebase. Peça ao administrador para ativar o método "E-mail/senha" nas configurações de Autenticação do Firebase.';
          } else if (authErr.code === 'auth/network-request-failed') {
            friendlyMsg = 'Houve um erro de rede ao tentar se conectar ao servidor de autenticação. Verifique sua conexão com a internet.';
          } else if (authErr.code === 'auth/too-many-requests') {
            friendlyMsg = 'O sistema de segurança detectou muitas tentativas de cadastro seguidas. O acesso foi temporariamente bloqueado. Tente novamente em alguns minutos.';
          } else if (authErr.code === 'auth/invalid-password') {
            friendlyMsg = 'A senha fornecida é inválida. Ela deve ser uma string com pelo menos 6 caracteres.';
          } else if (authErr.code === 'auth/internal-error') {
            friendlyMsg = 'Ocorreu um erro interno de conexão com o Firebase Auth. Recarregue a página ou tente em instantes.';
          }

          setError(friendlyMsg);
          setLoading(false);
          return;
        }

        // Now they are authenticated in Firebase Auth!
        // Check if there is already a 'usuarios' record
        try {
          const uDocRef = doc(db, 'usuarios', targetEmail);
          const uDocSnap = await getDoc(uDocRef);

          if (uDocSnap.exists()) {
            const uData = uDocSnap.data();
            // Clean up plaintext password if any
            const { senha, ...uDataClean } = uData;
            await setDoc(uDocRef, uDataClean);

            if (uData.role === 'aluno' && uData.alunoId) {
              const alDocRef = doc(db, 'alunos', uData.alunoId);
              const alSnap = await getDoc(alDocRef);
              if (alSnap.exists()) {
                const alData = alSnap.data();
                const { senha: alSenha, ...alDataClean } = alData;
                await setDoc(alDocRef, alDataClean);
              }
            }

            setSuccessMsg('Sua conta foi ativada com sucesso! Você já pode entrar com sua nova senha.');
            setMode('login');
            setEmail(targetEmail);
            setPassword(password);
            setLoading(false);
            return;
          }

          // Check if they are a bootstrapped admin trying to activate
          if (targetEmail === 'deciopadovanijr@gmail.com' || targetEmail === 'admin@garradeagua.com.br') {
            const novoUsuario = {
              id: targetEmail,
              email: targetEmail,
              role: 'admin'
            };
            await setDoc(uDocRef, novoUsuario);
            setSuccessMsg('Sua conta de Administrador foi ativada com sucesso! Você já pode entrar com sua nova senha.');
            setMode('login');
            setEmail(targetEmail);
            setPassword(password);
            setLoading(false);
            return;
          }

          // Check the 'alunos' collection
          const q = query(collection(db, 'alunos'), where('email', '==', targetEmail));
          const alSnap = await getDocs(q);

          if (alSnap.empty) {
            setError(`Nenhum cadastro de aluno foi localizado para o e-mail "${targetEmail}". Entre em contato com o Professor Décio ou preencha o formulário na aba "Ainda Não Sou Aluno".`);
            
            if (auth.currentUser) {
              await auth.currentUser.delete().catch(unErr => console.error("Error deleting unlinked user:", unErr));
            }
            setLoading(false);
            return;
          }

          const alDoc = alSnap.docs[0];
          const alData = alDoc.data();

          // Safe: create user without plaintext password field
          const userId = targetEmail;
          await setDoc(doc(db, 'usuarios', userId), {
            id: userId,
            email: userId,
            role: 'aluno',
            alunoId: alDoc.id
          });

          // Update Aluno doc to clean up plaintext 'senha' if any
          const { senha: alSenha, ...alDataClean } = alData;
          await setDoc(doc(db, 'alunos', alDoc.id), alDataClean);

          setSuccessMsg(`Sua conta do Portal do Aluno foi ativada com sucesso para o e-mail "${targetEmail}"! Você já pode navegar no portal.`);
          setMode('login');
          setEmail(targetEmail);
          setPassword(password);
        } catch (dbErr: any) {
          console.error("Erro ao buscar ou configurar dados do usuário pós-autenticação:", dbErr);
          let friendlyDbMsg = 'A autenticação foi concluída com sucesso, mas ocorreu um erro no banco de dados ao salvar a ativação da sua conta.';
          if (dbErr?.code === 'permission-denied' || dbErr?.message?.includes('permission-denied')) {
            friendlyDbMsg = 'Ativação negada por regras de segurança do servidor. Entre em contato com o Professor Décio Padovani.';
          } else if (dbErr?.code === 'resource-exhausted' || dbErr?.message?.includes('Quota exceeded')) {
            friendlyDbMsg = 'Limite diário do banco de dados excedido (Quota Exceeded). Por favor, tente novamente mais tarde.';
          }
          setError(friendlyDbMsg);
          try {
            handleFirestoreError(dbErr, OperationType.WRITE, `usuarios/${targetEmail}`);
          } catch (errToThrow) {
            throw errToThrow;
          }
        }
      } else {
        // Pré-cadastro novo Aluno (Solicitação de matrícula pendente de aprovação)
        if (!nome || !emailLower || !cpfClean || !telefone || !dataNascimento) {
          setError('Por favor, preencha todos os campos do formulário para prosseguir.');
          setLoading(false);
          return;
        }

        const newId = 'sol-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        try {
          await setDoc(doc(db, 'solicitacoes_matricula', newId), {
            id: newId,
            nome: nome.trim(),
            email: emailLower,
            cpf: cpfClean,
            telefone: telefone,
            dataNascimento: dataNascimento,
            modalidades: selectedModalidades.length > 0 ? selectedModalidades : ['Kung Fu Garra de Águia'],
            dataSolicitacao: new Date().toISOString(),
            status: 'pendente'
          });

          setSuccessMsg('Sua solicitação de pré-cadastro foi enviada com sucesso! Aguarde a revisão e aprovação do Professor Décio Padovani para liberar seus acessos ao Portal do Aluno.');
          setMode('login');
          setEmail(emailLower);
          setPassword('');
        } catch (dbErr: any) {
          console.error("Erro ao enviar pré-cadastro:", dbErr);
          let friendlyDbMsg = 'Ocorreu um erro catastrófico ao registrar seu pré-cadastro no banco de dados.';
          if (dbErr?.code === 'permission-denied' || dbErr?.message?.includes('permission-denied')) {
            friendlyDbMsg = 'Envio recusado devido a restrições de permissão do servidor ou CPF já pendente de aprovação.';
          } else if (dbErr?.code === 'resource-exhausted' || dbErr?.message?.includes('Quota exceeded')) {
            friendlyDbMsg = 'Sistema temporariamente indisponível devido a limite de cota diária excedido (Quota Exceeded). Tente em instantes.';
          }
          setError(friendlyDbMsg);
          try {
            handleFirestoreError(dbErr, OperationType.CREATE, `solicitacoes_matricula/${newId}`);
          } catch (errToThrow) {
            throw errToThrow;
          }
        }
      }
    } catch (err: any) {
      console.error("Erro global no handleRegisterSubmit:", err);
      if (!error) {
        setError(`Não foi possível concluir a operação de cadastro: ${err.message || err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const emailLower = email.trim().toLowerCase();

    if (!emailLower) {
      setError('Por favor, informe seu e-mail cadastrado.');
      setLoading(false);
      return;
    }

    try {
      // Send secure reset email via Firebase Auth
      await sendPasswordResetEmail(auth, emailLower);
      setSuccessMsg('Um link de redefinição de senha seguro foi enviado pelo sistema da Associação de Kung Fu Garra de Águia. Por favor, verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar e-mail de redefinição. Por favor verifique o endereço fornecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-neutral-200 relative overflow-hidden">
      {/* Elegantly structured background with traditional martial elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-950/20 via-neutral-950 to-neutral-950 opacity-100 pointer-events-none" />
      
      {/* Decorative vertical lines representing classic school pillars */}
      <div className="hidden lg:block absolute left-12 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-600/10 to-transparent" />
      <div className="hidden lg:block absolute right-12 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-600/10 to-transparent" />

      {/* Header - Simple Brand Badge */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex justify-between items-center py-2 border-b border-neutral-900/40">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-serif text-amber-500 tracking-widest font-extrabold">聯盟 • LIGA GARRA DE ÁGUIA PG</span>
        </div>
        <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5 bg-neutral-900/60 px-3 py-1 rounded-full border border-neutral-800/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Servidor Oficial
        </div>
      </div>

      {/* Main Login Box */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-md mx-auto">
        {/* Logo Container with Traditional Circular Backplate */}
        <div className="mb-6 relative flex items-center justify-center">
          <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-xl opacity-60" />
          <OfficialLogo size="xl" />
        </div>

        {/* Academies Names Group */}
        <div className="text-center space-y-2 mb-8 select-none">
          <h1 className="text-xl sm:text-2xl font-bold font-serif tracking-wide text-amber-400">
            Kung Fu Garra de Águia
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
            Praia Grande
          </p>
          <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-red-700 to-transparent mx-auto" />
          <p className="text-[10px] text-neutral-500 tracking-wider font-extrabold uppercase">
            Associação Liga Garra de Águia Praia Grande
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative">
          {/* Subtle Red Top Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-800 via-amber-500 to-red-800 rounded-t-2xl" />

          {successMsg && (
            <div className="mb-4 text-xs text-emerald-400 font-bold bg-emerald-950/20 py-2.5 px-3 rounded border border-emerald-900/30">
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 text-xs text-red-500 font-semibold bg-red-950/20 py-2.5 px-3 rounded border border-red-900/30">
              {error}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-500" /> E-mail de Acesso
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    placeholder="ex: aluno@garradeagua.com.br"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-500" /> Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    placeholder="••••••••"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-900 via-amber-600 to-red-900 hover:opacity-95 text-neutral-950 hover:text-black font-extrabold text-xs uppercase tracking-widest py-3 rounded-lg shadow-lg border border-amber-400/20 transition-all duration-300 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> Entrar no Templo
                  </>
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-neutral-900 px-3 text-neutral-500 font-bold tracking-wider text-[10px]">Ou acesse de forma simples</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-neutral-950 hover:bg-neutral-900 text-neutral-200 hover:text-white font-extrabold text-xs uppercase tracking-widest py-3 rounded-lg shadow-lg border border-neutral-800 hover:border-neutral-700 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.514 5.514 0 0 1 8.5 13c0-3.037 2.463-5.5 5.5-5.5c1.4 0 2.678.525 3.654 1.39l3.111-3.11A9.97 9.97 0 0 0 14 2c-5.523 0-10 4.477-10 10s4.477 10 10 10c5.3 0 9.25-3.5 9.25-9.25c0-.52-.05-1.015-.143-1.465H12.24z"/>
                </svg>
                Acessar com Conta Google
              </button>

              <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] gap-2 text-neutral-400 pt-3 border-t border-neutral-800/40">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setSuccessMsg('');
                    setEmail('');
                    setPassword('');
                    setCpf('');
                  }}
                  className="hover:text-amber-400 font-bold transition flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-500" /> Primeiro Acesso / Ativar Conta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('recover');
                    setError('');
                    setSuccessMsg('');
                    setCpf('');
                    setPassword('');
                  }}
                  className="hover:text-amber-400 font-bold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-500" /> Recuperar Acesso
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800 mb-2">
                <button
                  type="button"
                  onClick={() => setRegTab('activate')}
                  className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                    regTab === 'activate' ? 'bg-amber-50 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Já tenho Cadastro
                </button>
                <button
                  type="button"
                  onClick={() => setRegTab('new')}
                  className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                    regTab === 'new' ? 'bg-amber-50 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Ainda não sou Aluno
                </button>
              </div>

              {regTab === 'activate' ? (
                <>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
                    O professor já te cadastrou? Digite seu e-mail de cadastro ou CPF e escolha uma nova senha para ativar seu portal.
                  </p>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-amber-500" /> E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      placeholder="seu-email@provedor.com"
                      autoComplete="off"
                    />
                  </div>

                  <div className="text-center text-xs text-neutral-500 font-bold py-1">OU</div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-500" /> CPF (Apenas números)
                    </label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      placeholder="00000000000"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-500" /> Definir Nova Senha
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      placeholder="Sua senha secreta de acesso"
                      autoComplete="off"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
                    Realize o seu pré-cadastro na nossa academia. Suas informações serão integradas instantaneamente.
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-amber-500" /> Nome Completo
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                      placeholder="Seu nome oficial"
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-amber-500" /> E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      placeholder="ex: aluno@garradeagua.com.br"
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-500" /> Celular/WhatsApp
                      </label>
                      <input
                        type="text"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                        placeholder="(13) 99999-9999"
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-amber-500" /> CPF
                      </label>
                      <input
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                        placeholder="Apenas números"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-amber-500" /> Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider block">
                      Modalidades Desejadas:
                    </label>
                    <div className="flex flex-col gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                      {[
                        { val: 'Kung Fu Garra de Águia', label: 'Kung Fu Garra de Águia' },
                        { val: 'Boxe Chinês', label: 'Boxe Chinês (Sanda)' },
                        { val: 'Tai Chi Chuan', label: 'Tai Chi Chuan' }
                      ].map((item) => {
                        const checked = selectedModalidades.includes(item.val);
                        return (
                          <label key={item.val} className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedModalidades(prev => prev.filter(v => v !== item.val));
                                } else {
                                  setSelectedModalidades(prev => [...prev, item.val]);
                                }
                              }}
                              className="accent-amber-500 rounded border-neutral-800 focus:ring-0 text-amber-500 bg-neutral-900"
                            />
                            {item.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-900 via-amber-600 to-red-900 hover:opacity-95 text-neutral-955 text-neutral-950 hover:text-black font-extrabold text-xs uppercase tracking-widest py-3 rounded-lg shadow-lg border border-amber-400/20 transition-all duration-300 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> 
                    {regTab === 'activate' ? 'Ativar Meu Acesso' : 'Cadastrar e Ativar'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1 mx-auto mt-2 transition font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-500" /> Voltar para o Login (Entrar)
              </button>
            </form>
          )}

          {mode === 'recover' && (
            <form onSubmit={handleRecoverSubmit} className="space-y-4">
              <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
                Redefinição segura de senha enviada para seu e-mail cadastrado. Um link de redefinição oficial será enviado.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-500" /> E-mail Cadastrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                  placeholder="ex: aluno@garradeagua.com.br"
                  autoComplete="off"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-900 via-amber-600 to-red-900 hover:opacity-95 text-neutral-955 text-neutral-950 hover:text-black font-extrabold text-xs uppercase tracking-widest py-3 rounded-lg shadow-lg border border-amber-400/20 transition-all duration-300 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> Enviar Link de Recuperação
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1 mx-auto mt-2 transition font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-500" /> Cancelar e Voltar pro Login
              </button>
            </form>
          )}

          {/* Quick Demo Pre-fill Help */}
          <div className="mt-6 pt-5 border-t border-neutral-800/40 text-center">
            <span className="text-[10px] text-neutral-500 block mb-2 uppercase tracking-widest">
              Sistema Oficial de Gestão
            </span>
            <div className="inline-flex items-center gap-1 text-[11px] bg-amber-500/5 border border-amber-500/10 text-amber-400 font-mono px-3 py-1 rounded select-all cursor-pointer">
              <Award className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Conexão Segura Integrada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright / tradition seal */}
      <div className="relative z-10 w-full max-w-7xl mx-auto text-center py-4 border-t border-neutral-900/40 mt-8">
        <p className="text-[10px] text-neutral-500 leading-relaxed max-w-lg mx-auto">
          © {new Date().getFullYear()} Kung Fu Garra de Águia Praia Grande. Todos os direitos reservados.<br />
          <span className="opacity-70">Sistema Administrativo para Controle de Membros, Mensalidades e Presenças.</span>
        </p>
      </div>
    </div>
  );
}
