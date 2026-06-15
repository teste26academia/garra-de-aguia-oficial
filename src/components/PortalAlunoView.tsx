import React, { useState } from 'react';
import { Aluno, Mensalidade, Presenca, GraduacaoExame, Comunicado } from '../types';
import { OfficialLogo } from './OfficialLogo';
import { db, auth, cleanUndefined, handleFirestoreError, OperationType } from '../firebase';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { 
  Award, Calendar, CreditCard, CheckCircle, Clock, Check, 
  AlertCircle, RefreshCw, User, MessageCircle, LogOut, 
  MapPin, ShieldCheck, Zap, Mail, BookOpen, ChevronRight, CheckCircle2 
} from 'lucide-react';

interface PortalAlunoViewProps {
  alunoId: string;
  alunos: Aluno[];
  mensalidades: Mensalidade[];
  presencas: Presenca[];
  exames: GraduacaoExame[];
  comunicados: Comunicado[];
  onLogout: () => void;
  addPresenca: (alunoId: string, data: string, horario: string, confirmadoPorProfessor: boolean, modalidade?: string, turma?: string) => Promise<any>;
  addAuditLog?: (categoria: string, tipo: string, descricao: string, dadosAnteriores?: any, dadosNovos?: any) => Promise<void> | void;
}

export function PortalAlunoView({
  alunoId,
  alunos,
  mensalidades,
  presencas,
  exames,
  comunicados,
  onLogout,
  addPresenca,
  addAuditLog
}: PortalAlunoViewProps) {
  const [solicitandoPresenca, setSolicitandoPresenca] = useState(false);
  const [presencaSucesso, setPresencaSucesso] = useState(false);
  
  const [selectedMod, setSelectedMod] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('19:00');

  // States for Password Change
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [senhaErro, setSenhaErro] = useState('');
  const [senhaSucesso, setSenhaSucesso] = useState(false);

  // States for Beta Feedback
  const [tipoFeedback, setTipoFeedback] = useState<'erro' | 'sugestao' | 'dificuldade'>('sugestao');
  const [textoFeedback, setTextoFeedback] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState(false);
  const [feedbackErro, setFeedbackErro] = useState('');

  const handleEnviarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackErro('');
    setFeedbackSucesso(false);

    if (!aluno) return;

    if (!textoFeedback.trim()) {
      setFeedbackErro('Por favor, descreva sua mensagem antes de enviar.');
      return;
    }

    setEnviandoFeedback(true);
    try {
      const feedbackId = 'FB' + Math.floor(100000 + Math.random() * 900000);
      const novoFeedback = {
        id: feedbackId,
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        tipo: tipoFeedback,
        descricao: textoFeedback.trim(),
        dataEnvio: new Date().toISOString(),
        status: 'pendente'
      };

      await setDoc(doc(db, 'feedbacks', feedbackId), novoFeedback);

      if (addAuditLog) {
        await addAuditLog(
          'Segurança',
          'Criar',
          `Feedback de Beta enviado por ${aluno.nome}: [${tipoFeedback.toUpperCase()}] "${textoFeedback.trim().substring(0, 60)}${textoFeedback.length > 60 ? '...' : ''}"`
        );
      }

      setFeedbackSucesso(true);
      setTextoFeedback('');
    } catch (err) {
      console.error(err);
      setFeedbackErro('Ocorreu um erro ao enviar seu feedback para o dojo.');
    } finally {
      setEnviandoFeedback(false);
    }
  };

  // Localizar o aluno correto de forma totalmente estrita
  const aluno = alunos.find(a => a.id === alunoId);

  // Function to Change Password
  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaErro('');
    setSenhaSucesso(false);

    if (!aluno) return;

    if (!senhaAtual || !novaSenha || !confirmSenha) {
      setSenhaErro('Preencha todos os campos obrigatórios.');
      return;
    }

    if (novaSenha !== confirmSenha) {
      setSenhaErro('A nova senha e a confirmação não coincidem.');
      return;
    }

    setSalvandoSenha(true);
    setSenhaErro('');
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        // Reautenticar e alterar senha no Firebase Auth
        const credential = EmailAuthProvider.credential(user.email, senhaAtual);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, novaSenha);

        // Limpar qualquer plaintext senha residual das tabelas Firestore
        const { senha, ...alunoClean } = aluno as any;
        await setDoc(doc(db, 'alunos', aluno.id), alunoClean);

        await setDoc(doc(db, 'usuarios', user.email.trim().toLowerCase()), {
          id: user.email.trim().toLowerCase(),
          email: user.email.trim().toLowerCase(),
          role: 'aluno',
          alunoId: aluno.id
        });
      } else {
        throw new Error('Sessão de usuário não ativa ou e-mail inválido.');
      }

      if (addAuditLog) {
        await addAuditLog('Segurança', 'Atualizar', `Senha de acesso alterada com sucesso via Firebase Auth pelo aluno: ${aluno.nome}.`);
      }

      setSenhaSucesso(true);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmSenha('');
      setTimeout(() => setSenhaSucesso(false), 5000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setSenhaErro('A senha atual fornecida está incorreta.');
      } else if (err.code === 'auth/weak-password') {
        setSenhaErro('A nova senha é muito fraca. Escolha uma senha mais forte.');
      } else {
        setSenhaErro('Ocorreu um erro ao atualizar a senha ou ao reautenticar. Se a sua senha atual foi ativada recentemente, digite-a novamente.');
      }
    } finally {
      setSalvandoSenha(false);
    }
  };

  if (!aluno) {
    return (
      <div id="portal-aluno-not-found" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <OfficialLogo size="lg" />
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 max-w-md shadow-sm mt-8 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-neutral-800">Cadastro Não Localizado</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Seu email foi autenticado, porém não encontramos um registro de aluno ativo correspondente no dojo. Por favor, solicite ao Professor Decio Padovani Junior para vincular o seu cadastro.
          </p>
          <button 
            onClick={onLogout}
            className="w-full bg-neutral-900 text-amber-400 font-bold uppercase tracking-wider text-[11px] py-3 rounded-lg hover:bg-neutral-800 transition"
          >
            Sair e Fazer Login Novamente
          </button>
        </div>
      </div>
    );
  }

  // Filtragem estrita dos dados pertencentes APENAS a este aluno (Zero-Trust)
  const minhasMensalidades = mensalidades
    .filter(m => m.alunoId && m.alunoId.trim().toLowerCase() === aluno.id.trim().toLowerCase())
    .sort((a, b) => b.competencia.localeCompare(a.competencia));

  const minhasPresencas = presencas
    .filter(p => p.alunoId && p.alunoId.trim().toLowerCase() === aluno.id.trim().toLowerCase())
    .sort((a, b) => b.data.localeCompare(a.data));

  const meusExames = exames
    .filter(e => e.alunoId && e.alunoId.trim().toLowerCase() === aluno.id.trim().toLowerCase())
    .sort((a, b) => b.dataExame.localeCompare(a.dataExame));

  const presencasConfirmadasCount = minhasPresencas.filter(p => p.confirmadoPorProfessor).length;

  // Informativos amigáveis de status simplificado (Substituindo informações técnicas confusas)
  const getSimpStatus = () => {
    if (aluno.elegivelExame) {
      return {
        label: 'Elegível para Exame',
        color: 'border-emerald-300 bg-emerald-50 text-emerald-800',
        badge: 'bg-emerald-500 text-white',
        desc: 'Parabéns! Você cumpriu os requisitos necessários. O Professor Decio Padovani Junior irá lhe chamar para a avaliação de graduação.'
      };
    }
    
    // Fallback amigável baseado em horas acumuladas estimadas das chamadas
    const presencasFaltantesPara60 = 20; // Estimativa simples para progresso amigável
    if (presencasConfirmadasCount >= 15) {
      return {
        label: 'Em Avaliação Técnica',
        color: 'border-amber-300 bg-amber-50 text-amber-900',
        badge: 'bg-amber-500 text-white',
        desc: 'Suas aulas estão evoluindo bem! Suas habilidades práticas estão sob avaliação técnica constante no tatame.'
      };
    }

    return {
      label: 'Em Preparação',
      color: 'border-slate-300 bg-slate-50 text-slate-800',
      badge: 'bg-slate-500 text-white',
      desc: 'Você está no caminho certo. Continue focado nos treinos e consistente na frequência para refinar suas técnicas da faixa atual.'
    };
  };

  const simpStatus = getSimpStatus();

  // Solicitar Presença Independente (chamada ativa)
  const handleSolicitarPresenca = async () => {
    setSolicitandoPresenca(true);
    try {
      const hojeStr = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
      const targetModName = selectedMod || aluno.modalidades?.[0] || aluno.modalidade || 'Kung Fu Garra de Águia';
      const targetTurma = selectedTurma || '19:00';

      // Impedir duplicados no mesmo dia para a mesma modalidade e turma
      const jaTemHoje = minhasPresencas.some(p => 
        p.data === hojeStr && 
        (p.modalidade || '').toLowerCase() === targetModName.toLowerCase() && 
        (p.turma || p.horario || '').includes(targetTurma)
      );

      if (jaTemHoje) {
        alert(`Você já registrou ou solicitou uma chamada para a aula de ${targetModName} (${targetTurma}) hoje.`);
        setSolicitandoPresenca(false);
        return;
      }

      await addPresenca(aluno.id, hojeStr, targetTurma, false, targetModName, targetTurma);

      if (addAuditLog) {
        await addAuditLog('Presença', 'Criar', `Aluno ${aluno.nome} solicitou presença autônoma para a aula de [${targetModName}] às [${targetTurma}] hoje (${hojeStr}). Aguardando aprovação do professor.`);
      }

      setPresencaSucesso(true);
      setTimeout(() => setPresencaSucesso(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSolicitandoPresenca(false);
    }
  };

  // Cores de Faixas de Kung Fu correspondentes
  const getFaixaStyles = (faixa: string) => {
    const formatted = faixa.toLowerCase();
    if (formatted.includes('branca')) return 'border-neutral-300 bg-white text-neutral-800';
    if (formatted.includes('amarela')) return 'border-amber-400 bg-amber-100 text-amber-950';
    if (formatted.includes('laranja')) return 'border-orange-500 bg-orange-100 text-orange-950';
    if (formatted.includes('verde')) return 'border-emerald-500 bg-emerald-150 text-emerald-950';
    if (formatted.includes('azul')) return 'border-blue-500 bg-blue-100 text-blue-950';
    if (formatted.includes('vermelha')) return 'border-red-500 bg-red-100 text-red-950';
    if (formatted.includes('marrom')) return 'border-amber-800 bg-amber-900 text-white';
    if (formatted.includes('preta')) return 'border-neutral-900 bg-neutral-950 text-amber-400 font-bold';
    return 'border-neutral-400 bg-neutral-50 text-neutral-800';
  };

  return (
    <div id="portal-aluno-view-layout" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner / Mobile Nav bar */}
      <header className="bg-neutral-950 border-b border-neutral-900 text-white px-4 py-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 text-neutral-950 p-1 rounded-lg animate-pulse">
              <OfficialLogo size="sm" />
            </div>
            <div>
              <h1 className="text-xs font-serif font-extrabold tracking-tight text-amber-400 leading-none">LIGA GARRA DE ÁGUIA</h1>
              <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400">Portal Acadêmico do Aluno</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-neutral-900 text-xs border border-neutral-800 hover:bg-neutral-800 px-3 py-1.5 rounded-lg text-neutral-200 transition"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" /> Sair
          </button>
        </div>
      </header>

      {/* Main Content (Mobile Optimized Grid) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 rounded-2xl p-5 text-white border border-neutral-900 shadow-lg relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {aluno.fotoUrl ? (
              <img src={aluno.fotoUrl} alt={aluno.nome} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 bg-neutral-800" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 font-serif font-black text-2xl flex items-center justify-center border-2 border-amber-400 shadow-md">
                {aluno.nome.charAt(0)}
              </div>
            )}
            
            <div className="text-center sm:text-left space-y-1 flex-1">
              <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">Bem-vindo de volta!</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">{aluno.nome}</h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1">
                <span className="bg-neutral-800 border border-neutral-700/60 text-[10px] font-bold px-2 py-0.5 rounded-full text-neutral-300">
                  ID: #{aluno.id}
                </span>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Status: Ativo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EVOLUÇÃO TÉCNICA POR MODALIDADE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="portal-modalidades-evolution">
          {(aluno.modalidades || [aluno.modalidade || 'Kung Fu Garra de Águia']).map(mod => {
            const belt = aluno.faixasPorModalidade?.[mod] || aluno.faixaAtual || 'Branca';
            const hAcum = aluno.horasPorModalidade?.[mod] !== undefined ? aluno.horasPorModalidade[mod] : (aluno.modalidades?.[0] === mod ? aluno.horasAcumuladas : 0);
            const tNaFaixa = aluno.tempoNaFaixaPorModalidade?.[mod] !== undefined ? aluno.tempoNaFaixaPorModalidade[mod] : (aluno.modalidades?.[0] === mod ? aluno.tempoNaFaixaMeses : 0);
            const elig = aluno.elegivelExamePorModalidade?.[mod] !== undefined ? aluno.elegivelExamePorModalidade[mod] : (aluno.modalidades?.[0] === mod ? aluno.elegivelExame : false);
            
            return (
              <div key={mod} className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs space-y-3" id={`portal-evolution-card-${mod.replace(/\s+/g, '-')}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">Modalidade</span>
                    <h4 className="text-xs font-black text-slate-800 leading-tight mt-0.5">{mod}</h4>
                  </div>
                  <span className="bg-amber-100/75 border border-amber-200/50 text-amber-950 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">
                    🥋 {belt}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Frequência</span>
                    <span className="font-extrabold text-slate-800 font-mono">{hAcum} horas</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase font-sans">Carência</span>
                    <span className="font-extrabold text-slate-800 font-mono">{tNaFaixa} meses</span>
                  </div>
                </div>

                <div className={`mt-2 p-2 rounded-xl border text-[10px] font-semibold leading-relaxed ${
                  elig 
                    ? 'border-emerald-250 bg-emerald-50 text-emerald-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  {elig ? (
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Elegível para Avaliação!
                    </span>
                  ) : (
                    <span>Requisitos técnicos em andamento.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: CARTEIRINHA DIGITAL E CHAMADA */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARTEIRINHA DIGITAL */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-neutral-400" /> Carteirinha Digital de Membro
              </h3>

              {/* CARTEIRA CARD VISUAL */}
              <div className="bg-slate-900 text-white rounded-xl border border-slate-950 overflow-hidden shadow-md flex flex-col max-w-sm mx-auto hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300">
                {/* Header do Dojo */}
                <div className="bg-gradient-to-r from-neutral-950 to-neutral-900 border-b border-neutral-950 p-4 flex items-center gap-2">
                  <div className="bg-amber-400 p-1 rounded">
                    <div className="w-4 h-4 text-slate-900 font-serif font-black flex items-center justify-center text-[10px]">G</div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black tracking-wider text-amber-400">LIGA GARRA DE ÁGUIA</h4>
                    <span className="text-[7px] text-neutral-400 uppercase font-bold block tracking-widest leading-none">Dojo de Artes Marciais</span>
                  </div>
                </div>

                {/* Conteúdo do Id */}
                <div className="p-4 flex gap-3.5 items-start">
                  {aluno.fotoUrl ? (
                    <img src={aluno.fotoUrl} alt={aluno.nome} className="w-16 h-18 rounded-lg object-cover border border-neutral-800 bg-neutral-950 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-18 rounded-lg bg-neutral-950 text-amber-500 border border-neutral-800 font-bold flex items-center justify-center text-xl font-serif shrink-0">
                      {aluno.nome.charAt(0)}
                    </div>
                  )}

                  <div className="space-y-1.5 overflow-hidden">
                    <div>
                      <span className="text-[7px] uppercase font-bold text-neutral-500 block leading-none">Nome do Graduado</span>
                      <h5 className="text-[11px] font-bold text-white tracking-tight truncate leading-tight mt-0.5">{aluno.nome}</h5>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[7px] uppercase font-black text-neutral-500 block leading-none">Modalidades e Graduações</span>
                      <div className="flex flex-col gap-1 max-h-[36px] overflow-y-auto">
                        {(aluno.modalidades || [aluno.modalidade || 'Kung Fu Garra de Águia']).map(mod => {
                          const belt = aluno.faixasPorModalidade?.[mod] || aluno.faixaAtual || 'Branca';
                          return (
                            <div key={mod} className="flex justify-between items-center text-[8px] font-bold text-neutral-300 leading-none">
                              <span className="opacity-90 truncate max-w-[70px] uppercase font-sans text-neutral-400">{mod === 'Kung Fu Garra de Águia' ? 'Kung Fu' : mod}</span>
                              <span className="text-amber-450 font-black">{belt}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[7px] uppercase font-bold text-neutral-500 block leading-none">Vínculo Inicial</span>
                        <span className="text-[9px] font-medium text-neutral-300 block truncate mt-0.5">
                          {aluno.dataMatricula ? new Date(aluno.dataMatricula).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[7px] uppercase font-bold text-neutral-500 block leading-none">Matrícula</span>
                        <span className="text-[8px] font-mono font-medium text-neutral-200 block truncate mt-0.5">#{aluno.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer fake codigo de barras */}
                <div className="bg-neutral-950 px-4 py-2 flex items-center justify-between border-t border-neutral-900 font-mono text-[7px] text-neutral-400">
                  <div className="tracking-widest flex font-extrabold text-neutral-500 select-none">
                    |||| | |||||| | | ||| | ||| |||| |
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase leading-none">
                    MEMBRO ATIVO
                  </span>
                </div>
              </div>
            </div>

            {/* AUTOCHAMADA / CONTROLE DE PRESENÇA */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-400" /> Registro de Presença Hoje
              </h3>
              
              <p className="text-xs text-neutral-500 leading-relaxed">
                Selecione abaixo a modalidade e o horário da aula para registrar sua presença de hoje.
              </p>

              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block">Modalidade de Aula</label>
                  <select
                    value={selectedMod || (aluno.modalidades?.[0] || aluno.modalidade || 'Kung Fu Garra de Águia')}
                    onChange={(e) => setSelectedMod(e.target.value)}
                    className="w-full bg-white border border-neutral-250 border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500"
                  >
                    {(aluno.modalidades || [aluno.modalidade || 'Kung Fu Garra de Águia']).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block">Horário da Aula (Turma)</label>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="w-full bg-white border border-neutral-250 border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="07:00">07:00 às 08:30 (Manhã)</option>
                    <option value="09:00">09:00 às 10:30 (Manhã)</option>
                    <option value="15:00">15:00 às 16:30 (Tarde)</option>
                    <option value="19:00">19:00 às 20:30 (Noite)</option>
                    <option value="20:00">20:00 às 21:30 (Noite)</option>
                  </select>
                </div>
              </div>

              {presencaSucesso ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-center gap-2.5 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Presença solicitada!</p>
                    <p className="text-[10px] mt-0.5 text-emerald-700">Sua chamada foi registrada e aguarda aprovação pelo Professor.</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSolicitarPresenca}
                  disabled={solicitandoPresenca}
                  className="w-full bg-slate-900 border border-slate-950 font-bold uppercase tracking-wider text-[11px] text-amber-400 hover:text-amber-300 py-3 rounded-lg flex items-center justify-center gap-2 transition duration-200 hover:bg-slate-800"
                >
                  <MapPin className="w-3.5 h-3.5 animate-pulse" /> 
                  {solicitandoPresenca ? 'Registrando...' : 'Solicitar Presença de Hoje'}
                </button>
              )}
            </div>

            {/* SEGURANÇA E ALTERAÇÃO DE SENHA */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-neutral-400" /> Alterar Senha de Acesso
              </h3>
              
              <form onSubmit={handleTrocarSenha} className="space-y-3">
                {senhaSucesso && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 text-emerald-800 text-[11px] font-bold">
                    ✓ Sua senha foi alterada com sucesso!
                  </div>
                )}
                {senhaErro && (
                  <div className="bg-red-50 border border-red-350 rounded-lg p-2.5 text-red-700 text-[11px] font-bold">
                    ⚠️ {senhaErro}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Senha Atual</label>
                  <input
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="w-full bg-slate-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500"
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Nova Senha</label>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full bg-slate-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500"
                      placeholder="Nova senha"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Confirmar Nova</label>
                    <input
                      type="password"
                      value={confirmSenha}
                      onChange={(e) => setConfirmSenha(e.target.value)}
                      className="w-full bg-slate-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500"
                      placeholder="Confirmar"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="w-full bg-neutral-900 border border-neutral-950 font-bold uppercase tracking-wider text-[10px] text-white py-2 rounded-lg flex items-center justify-center gap-1.5 transition duration-200 hover:bg-neutral-800"
                >
                  {salvandoSenha ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </form>
            </div>

            {/* CANAL DE FEEDBACK - PROGRAMA BETA */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-amber-500" /> Canal de Feedback do Beta
              </h3>
              
              <p className="text-xs text-neutral-500 leading-relaxed">
                Ajude de forma colaborativa a homologar nosso sistema! Relate falhas (bugs), faça sugestões ou relate dificuldades enfrentadas no uso operacional.
              </p>

              <form onSubmit={handleEnviarFeedback} className="space-y-3.5">
                {feedbackSucesso && (
                  <div className="bg-emerald-55 bg-opacity-10 border border-emerald-300 rounded-lg p-3 text-emerald-800 text-[11px] font-bold">
                    ✓ Feedback enviado com sucesso! Muito obrigado pelo seu apoio no desenvolvimento.
                  </div>
                )}
                {feedbackErro && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-red-700 text-[11px] font-bold">
                    ⚠️ {feedbackErro}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block">Tipo de Feedback</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'sugestao', label: 'Sugestão' },
                      { value: 'erro', label: 'Falha/Bug' },
                      { value: 'dificuldade', label: 'Dificuldade' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTipoFeedback(opt.value as any)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border transition-all ${
                          tipoFeedback === opt.value
                            ? 'bg-amber-100 text-amber-900 border-amber-400 font-extrabold shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-neutral-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block">Mensagem Detalhada</label>
                  <textarea
                    rows={3}
                    value={textoFeedback}
                    onChange={(e) => setTextoFeedback(e.target.value)}
                    placeholder="Descreva aqui o erro, sua sugestão ou qualquer dúvida operacional encontrada no uso real..."
                    className="w-full bg-slate-50 border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500 placeholder-neutral-400 leading-normal resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoFeedback}
                  className="w-full bg-amber-500 hover:bg-amber-600 font-bold uppercase tracking-wider text-[10px] text-neutral-950 py-2 rounded-lg flex items-center justify-center gap-1.5 transition duration-200 disabled:opacity-50"
                >
                  {enviandoFeedback ? 'Enviando Relatório...' : 'Enviar Feedback de Teste'}
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT PANELS: FINANCEIRO, COMUNICADOS, HISTÓRICOS */}
          <div className="lg:col-span-7 space-y-6">

            {/* COMUNICADOS INTERNOS E AVISOS OFICIAIS */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-neutral-400" /> Avisos e Comunicados Oficiais
              </h3>

              {comunicados.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4 italic">Nenhum comunicado publicado pela administração no momento.</p>
              ) : (
                <div className="space-y-3.5">
                  {comunicados.map(com => (
                    <div key={com.id} className="bg-slate-50 border border-neutral-200 p-4 rounded-xl space-y-2 relative overflow-hidden">
                      {com.categoria === 'exame' && <div className="absolute right-0 top-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                          com.categoria === 'exame' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          com.categoria === 'evento' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          com.categoria === 'horario' ? 'bg-purple-55 bg-opacity-20 text-purple-800 border-purple-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {com.categoria === 'exame' ? 'Exame de Faixa' :
                           com.categoria === 'evento' ? 'Evento' :
                           com.categoria === 'horario' ? 'Horários' : 'Geral'}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-400">{new Date(com.dataPublicacao).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h4 className="text-xs font-bold text-neutral-800">{com.titulo}</h4>
                      <p className="text-xs text-neutral-600 leading-normal whitespace-pre-line">{com.conteudo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FINANCEIRO DO ALUNO */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-neutral-400" /> Área Financeira (Histórico de Plano)
              </h3>

              {minhasMensalidades.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4 italic">Nenhum registro de mensalidade faturada encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {minhasMensalidades.map(mens => (
                    <div key={mens.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-neutral-200/80 rounded-xl">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono uppercase">Vence em: {mens.vencimento ? new Date(mens.vencimento).toLocaleDateString('pt-BR') : 'N/A'}</span>
                        <h4 className="text-xs font-bold text-neutral-800 uppercase">Mensalidade Competência • {mens.competencia}</h4>
                        <div className="flex gap-1.5">
                          {mens.desconto > 0 && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded">Bolsa Mútua Aplicada</span>
                          )}
                          {mens.isIsento && (
                            <span className="text-[9px] text-purple-700 bg-purple-50 px-1 rounded">Membro Isento</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <span className="text-xs font-black text-neutral-850 block">
                          R$ {mens.valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block ${
                          mens.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {mens.status === 'pago' ? '✓ Pago' : '⚠ Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CHAMADAS E HISTÓRICO DE PRESENÇAS */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-neutral-400" /> Presenças Confirmadas ({presencasConfirmadasCount})
              </h3>

              {minhasPresencas.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4 italic">Nenhum registro de aula para este aluno.</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {minhasPresencas.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-neutral-250 rounded-xl text-xs">
                      <span className="font-mono font-medium">{new Date(p.data).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.confirmadoPorProfessor ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.confirmadoPorProfessor ? '✓ Confirmada' : 'Aguardando Validação'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTÓRICO DE EXAMES DE GRADUAÇÃO */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-neutral-400" /> Registro de Graduações e Exames
              </h3>

              {meusExames.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-neutral-400 italic">Nenhum exame de faixa registrado ou histórico de aprovação.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meusExames.map(ex => (
                    <div key={ex.id} className="p-3.5 bg-slate-50 border border-neutral-200 rounded-xl space-y-2 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-neutral-400">{new Date(ex.dataExame).toLocaleDateString('pt-BR')}</span>
                        <h4 className="text-xs font-bold text-neutral-800">Avaliação para Faixa {ex.faixaAtual}</h4>
                        <p className="text-[10px] text-neutral-500 italic mt-0.5">Anotações do Mestre: {ex.observacoes || 'Nenhuma ressalva cadastrada.'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded text-emerald-800">
                          Aprovado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-500 py-6 border-t border-neutral-950 text-center text-[10px] whitespace-nowrap overflow-x-hidden">
        <p className="font-serif uppercase tracking-widest text-neutral-400">© DOJO ASSOCIAÇÃO LIGA GARRA DE ÁGUIA</p>
        <p className="text-[9px] mt-1 text-neutral-600">Fundado por Professor Decio Padovani Junior</p>
      </footer>
    </div>
  );
}
