/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGymState } from './hooks/useGymState';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';

// import views
import { DashboardView } from './components/DashboardView';
import { AlunosView } from './components/AlunosView';
import { FamiliasView } from './components/FamiliasView';
import { MensalidadesView } from './components/MensalidadesView';
import { PresencasView } from './components/PresencasView';
import { GraduacoesView } from './components/GraduacoesView';
import { EstoqueView } from './components/EstoqueView';
import { RelatoriosView } from './components/RelatoriosView';
import { BackupView } from './components/BackupView';
import { AvisosAniversariantesView } from './components/AvisosAniversariantesView';
import { PortalAlunoView } from './components/PortalAlunoView';

// logo & login
import { OfficialLogo } from './components/OfficialLogo';
import { LoginView } from './components/LoginView';

// icons
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  ClipboardCheck, 
  Award, 
  Package, 
  Users2, 
  LayoutDashboard, 
  RefreshCw, 
  History,
  Menu,
  X,
  LogOut,
  Database,
  Flame
} from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'aluno' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [alunoId, setAlunoId] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);

  // Monitor e sincronizar estado com o Firebase Auth com tolerância a reloads de página
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const emailLower = user.email?.toLowerCase() || '';
          const uDocSnap = await getDoc(doc(db, 'usuarios', emailLower));
          if (uDocSnap.exists()) {
            const uDoc = uDocSnap.data();
            setUserRole(uDoc.role);
            setUserEmail(emailLower);
            
            let resolvedId = uDoc.alunoId || '';
            if (resolvedId.toLowerCase().startsWith('al')) {
              resolvedId = 'AL' + resolvedId.substring(2);
            }
            setAlunoId(resolvedId);
            setIsLoggedIn(true);
          } else {
            // Se o documento na coleção usuários ainda não foi criado de maneira resiliente
            // Verificar primeiro se é um administrador bootstrapped
            if (emailLower === 'deciopadovanijr@gmail.com' || emailLower === 'admin@garradeagua.com.br') {
              const novoUsuario = {
                id: emailLower,
                email: emailLower,
                role: 'admin' as const
              };
              await setDoc(doc(db, 'usuarios', emailLower), novoUsuario);
              setUserRole('admin');
              setUserEmail(emailLower);
              setAlunoId('');
              setIsLoggedIn(true);
            } else {
              const qAl = query(collection(db, 'alunos'), where('email', '==', emailLower));
              const alSnap = await getDocs(qAl);
              if (!alSnap.empty) {
                const alDoc = alSnap.docs[0];
                const alData = alDoc.data();
                if (!alData.excluido) {
                  let resolvedId = alDoc.id;
                  if (resolvedId.toLowerCase().startsWith('al')) {
                    resolvedId = 'AL' + resolvedId.substring(2);
                  }
                  const novoUsuario = {
                    id: emailLower,
                    email: emailLower,
                    role: 'aluno' as const,
                    alunoId: resolvedId
                  };
                  await setDoc(doc(db, 'usuarios', emailLower), novoUsuario);
                  setUserRole('aluno');
                  setUserEmail(emailLower);
                  setAlunoId(resolvedId);
                  setIsLoggedIn(true);
                } else {
                  await auth.signOut();
                }
              } else {
                // Se não for nem aluno cadastrado, deslogar e limpar
                await auth.signOut();
              }
            }
          }
        } else {
          setIsLoggedIn(false);
          setUserRole(null);
          setUserEmail('');
          setAlunoId('');
        }
      } catch (err) {
        console.error("Erro no observador auth ou no carregamento do banco:", err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const {
    alunos,
    familias,
    mensalidades,
    presencas,
    exames,
    uniformes,
    vendas,
    auditLogs,
    addAuditLog,
    restoreBackup,
    resetToDefault,
    addAluno,
    updateAluno,
    deleteAluno,
    addFamilia,
    updateFamilia,
    deleteFamilia,
    addPresenca,
    confirmPresenca,
    deletePresenca,
    addMensalidade,
    payMensalidade,
    deleteMensalidade,
    addExame,
    addUniformeItem,
    updateUniformeItem,
    deleteUniformeItem,
    venderUniforme,
    comunicados,
    feedbacks,
    addComunicado,
    deleteComunicado,
    solicitacoesMatricula,
    aprovarSolicitacaoMatricula,
    rejeitarSolicitacaoMatricula
  } = useGymState(isLoggedIn, userRole, alunoId);

  const [activeTab, setActiveTab ] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = (role: 'admin' | 'aluno', email: string, aId?: string) => {
    // Redirecionamento de aba condicional pós-autenticação bem-sucedida
    localStorage.setItem('garradeaguia_session', 'active');
    
    // Os estados já são atualizados de forma segura pelo onAuthStateChanged do Firebase Auth
    addAuditLog('Segurança', 'Login', `Usuário logou com sucesso: ${email}. Perfil: ${role === 'admin' ? 'Administrador' : 'Aluno'}.`);

    if (role === 'aluno') {
      setActiveTab('portal-aluno');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    if (userEmail) {
      await addAuditLog('Segurança', 'Logout', `Usuário deslogou com sucesso: ${userEmail}.`);
    }
    localStorage.removeItem('garradeaguia_session');
    await auth.signOut();
  };

  // Nav items configuration
  const navItems = userRole === 'aluno'
    ? [
        { id: 'portal-aluno', label: 'Portal do Aluno', icon: Award }
      ]
    : [
        { id: 'dashboard', label: 'Painel Central', icon: LayoutDashboard },
        { id: 'alunos', label: 'Alunos', icon: Users },
        { id: 'familias', label: 'Unidades Família', icon: Users2 },
        { id: 'mensalidades', label: 'Mensalidades', icon: DollarSign },
        { id: 'presencas', label: 'Chamadas / Presenças', icon: ClipboardCheck },
        { id: 'graduacoes', label: 'Graduações / Exames', icon: Award },
        { id: 'estoque', label: 'Estoque / Uniformes', icon: Package },
        { id: 'relatorios', label: 'Faturamento / Relatórios', icon: BarChart3 },
        { id: 'comunicados_avisos', label: 'Avisos & Aniversários', icon: Flame },
        { id: 'backup', label: 'Backup / Segurança', icon: Database },
      ];

  const handleResetData = () => {
    if (confirm('Deseja redefinir todos os dados para o estado inicial demonstrativo? Alterações personalizadas serão descartadas.')) {
      resetToDefault();
      window.location.reload();
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            alunos={alunos}
            mensalidades={mensalidades}
            presencas={presencas}
            uniformes={uniformes}
            familias={familias}
            exames={exames}
            solicitacoesMatricula={solicitacoesMatricula}
            approvePresenca={confirmPresenca}
            rejectPresenca={deletePresenca}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo(0, 0);
            }}
          />
        );
      case 'alunos':
        return (
          <AlunosView
            alunos={alunos}
            familias={familias}
            addAluno={addAluno}
            updateAluno={updateAluno}
            deleteAluno={deleteAluno}
            solicitacoesMatricula={solicitacoesMatricula}
            aprovarSolicitacaoMatricula={aprovarSolicitacaoMatricula}
            rejeitarSolicitacaoMatricula={rejeitarSolicitacaoMatricula}
          />
        );
      case 'familias':
        return (
          <FamiliasView
            familias={familias}
            alunos={alunos}
            addFamilia={addFamilia}
            updateFamilia={updateFamilia}
            deleteFamilia={deleteFamilia}
          />
        );
      case 'mensalidades':
        return (
          <MensalidadesView
            mensalidades={mensalidades}
            alunos={alunos}
            familias={familias}
            addMensalidade={addMensalidade}
            payMensalidade={payMensalidade}
            deleteMensalidade={deleteMensalidade}
          />
        );
      case 'presencas':
        return (
          <PresencasView
            presencas={presencas}
            alunos={alunos}
            addPresenca={addPresenca}
            confirmPresenca={confirmPresenca}
            deletePresenca={deletePresenca}
          />
        );
      case 'graduacoes':
        return (
          <GraduacoesView
            exames={exames}
            alunos={alunos}
            presencas={presencas}
            addExame={addExame}
          />
        );
      case 'estoque':
        return (
          <EstoqueView
            uniformes={uniformes}
            vendas={vendas}
            alunos={alunos}
            addUniformeItem={addUniformeItem}
            updateUniformeItem={updateUniformeItem}
            deleteUniformeItem={deleteUniformeItem}
            venderUniforme={venderUniforme}
          />
        );
      case 'relatorios':
        return (
          <RelatoriosView
            alunos={alunos}
            mensalidades={mensalidades}
            presencas={presencas}
            vendas={vendas}
            uniformes={uniformes}
            exames={exames}
            feedbacks={feedbacks}
            auditLogs={auditLogs}
          />
        );
      case 'comunicados_avisos':
        return (
          <AvisosAniversariantesView
            comunicados={comunicados}
            alunos={alunos}
            addComunicado={addComunicado}
            deleteComunicado={deleteComunicado}
          />
        );
      case 'backup':
        return (
          <BackupView
            alunos={alunos}
            familias={familias}
            mensalidades={mensalidades}
            presencas={presencas}
            exames={exames}
            uniformes={uniformes}
            vendas={vendas}
            auditLogs={auditLogs}
            restoreBackup={restoreBackup}
            resetToDefault={resetToDefault}
            updateAluno={updateAluno}
            addAuditLog={addAuditLog}
          />
        );
      case 'portal-aluno':
        return (
          <PortalAlunoView
            alunoId={alunoId}
            alunos={alunos}
            mensalidades={mensalidades}
            presencas={presencas}
            exames={exames}
            comunicados={comunicados}
            onLogout={handleLogout}
            addPresenca={addPresenca}
            addAuditLog={addAuditLog}
          />
        );
      default:
        return <div className="text-center py-12 text-slate-400">Desenvolvimento em progresso...</div>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <OfficialLogo size="lg" />
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-mono">Carregando Sessão Segura...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Interceptar renderização do Aluno para dar layout mobile imersivo de tela inteira
  if (userRole === 'aluno') {
    return (
      <PortalAlunoView
        alunoId={alunoId}
        alunos={alunos}
        mensalidades={mensalidades}
        presencas={presencas}
        exames={exames}
        comunicados={comunicados}
        onLogout={handleLogout}
        addPresenca={addPresenca}
        addAuditLog={addAuditLog}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col md:flex-row text-slate-800">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-950 border-r border-red-950/45 text-white select-none shrink-0">
        <div className="p-5 border-b border-red-950/40 flex items-center gap-3 bg-neutral-950/80">
          <OfficialLogo size="sm" />
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-extrabold text-amber-500 tracking-wider">Garra de Águia</span>
            <span className="text-[9px] uppercase font-medium text-neutral-400">Praia Grande • Gestão</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-red-950/60 text-amber-400 border border-amber-500/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-400 group-hover:text-white'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer Area with Reset / Demoinitializer */}
        <div className="p-4 border-t border-red-950/20 space-y-2 bg-neutral-950/40">
          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-2 py-2 border border-neutral-800 hover:border-neutral-700 bg-transparent rounded-lg text-[10px] font-bold text-neutral-400 hover:text-neutral-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" /> Reconfigurar Padrão
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-red-950/40 hover:bg-red-950/20 bg-transparent rounded-lg text-[10px] font-bold text-red-500 hover:text-red-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* MOBILE BAR */}
      <header className="md:hidden bg-neutral-950 text-white px-4 py-3 flex items-center justify-between border-b border-red-950/45 select-none">
        <div className="flex items-center gap-2">
          <OfficialLogo size="xs" />
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider block">Garra de Águia PG</span>
            <span className="text-[8px] uppercase font-semibold text-neutral-400 block leading-tight">Associação Liga Garra de Águia</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[49px] bg-neutral-950 border-b border-red-950/45 text-white z-40 select-none max-h-[80vh] overflow-y-auto">
          <div className="p-4 space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                    window.scrollTo(0,0);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-red-950/60 text-amber-400 border border-amber-500/30' 
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-amber-500/80" />
                  {item.label}
                </button>
              );
            })}
            
            <div className="pt-4 border-t border-red-950/20 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleResetData();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-neutral-800 rounded-lg text-xs font-semibold text-slate-300"
              >
                <RefreshCw className="w-4 h-4" /> Redefinir Dados Sistema
              </button>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-950/45 rounded-lg text-xs font-semibold text-red-500"
              >
                <LogOut className="w-4 h-4" /> Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderActiveTabContent()}
      </main>

    </div>
  );
}
