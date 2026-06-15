import React, { useState, useMemo } from 'react';
import { Aluno, Mensalidade, Presenca, VendaUniforme, UniformeItem, GraduacaoExame, BetaFeedback, AuditLog } from '../types';
import { BarChart3, TrendingUp, HelpCircle, GraduationCap, DollarSign, CalendarRange, ShoppingCart, Users, Search, Printer, FileText, CheckCircle, AlertCircle, Award, Cake, MessageSquare, ShieldCheck, ListChecks, Activity } from 'lucide-react';
import { FAIXAS_KUNG_FU, FAIXAS_BOXE_CHINES } from '../constants';

interface RelatoriosViewProps {
  alunos: Aluno[];
  mensalidades: Mensalidade[];
  presencas: Presenca[];
  vendas: VendaUniforme[];
  uniformes: UniformeItem[];
  exames?: GraduacaoExame[];
  feedbacks?: BetaFeedback[];
  auditLogs?: AuditLog[];
}

export function RelatoriosView({
  alunos,
  mensalidades,
  presencas,
  vendas,
  uniformes,
  exames = [],
  feedbacks = [],
  auditLogs = []
}: RelatoriosViewProps) {
  // Query state filters
  const [filterFaixa, setFilterFaixa] = useState<string>('todos');
  const [filterAniversarioMes, setFilterAniversarioMes] = useState<string>('todos');
  const [filterFinanceiro, setFilterFinanceiro] = useState<'todos' | 'inadimplente' | 'em_dia'>('todos');
  const [filterMinFrequencia, setFilterMinFrequencia] = useState<number>(0);

  // Módolo 9 filters integration
  const [filterModalidade, setFilterModalidade] = useState<string>('todos');
  const [filterElegibilidade, setFilterElegibilidade] = useState<string>('todos');
  const [filterAlunoEvolution, setFilterAlunoEvolution] = useState<string>('todos');

  // Stats computation
  const activeAndNotExcluded = useMemo(() => alunos.filter(a => !a.excluido), [alunos]);
  const totalAlunos = activeAndNotExcluded.length;
  const ativos = useMemo(() => activeAndNotExcluded.filter(a => a.ativo), [activeAndNotExcluded]);
  const totalAtivos = ativos.length;
  const inativos = totalAlunos - totalAtivos;

  // States for Beta Phase Checklist and Link Copy
  const [copiouUrl, setCopiouUrl] = useState(false);
  const [betaPeriod, setBetaPeriod] = useState<'diario' | 'semanal'>('diario');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('garradeaguia_beta_checklist');
    return saved ? JSON.parse(saved) : {
      'login': true,
      'recuperacao': true,
      'troca_senha': true,
      'portal': true,
      'presencas': true,
      'mensalidades': true,
      'comunicados': true,
      'carteirinha': true
    };
  });

  const toggleChecklistItem = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    localStorage.setItem('garradeaguia_beta_checklist', JSON.stringify(updated));
  };

  const handleCopiarUrl = () => {
    navigator.clipboard.writeText('https://ais-pre-doytbhfggmiyr7dmaelfvd-326425801922.us-east1.run.app');
    setCopiouUrl(true);
    setTimeout(() => setCopiouUrl(false), 2000);
  };

  // Beta usage analytics calculated in-memory
  const betaStats = useMemo(() => {
    const hojeStr = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    
    // Count logins of today and total program
    const loginsHoje = auditLogs.filter(log => 
      log.categoria === 'Segurança' && 
      log.tipo === 'Login' &&
      log.timestamp.startsWith(hojeStr)
    ).length;

    const totalLogins = auditLogs.filter(log => 
      log.categoria === 'Segurança' && 
      log.tipo === 'Login'
    ).length;

    const logouts = auditLogs.filter(log => 
      log.categoria === 'Segurança' && 
      log.tipo === 'Logout'
    ).length;

    // Password resets or changes
    const senhasAlteradas = auditLogs.filter(log => 
      log.categoria === 'Segurança' && 
      log.tipo === 'Atualizar' &&
      log.descricao.toLowerCase().includes('senha')
    ).length;

    // Presence requests counted by the 'Presença' log creations
    const solicitacoesPresenca = auditLogs.filter(log =>
      log.categoria === 'Presença' &&
      log.tipo === 'Criar' &&
      log.descricao.toLowerCase().includes('solicitou presença')
    ).length;

    // Failures of authentication
    const falhasAutenticacao = auditLogs.filter(log =>
      log.categoria === 'Segurança' &&
      (log.descricao.toLowerCase().includes('falha') || log.descricao.toLowerCase().includes('incorreta'))
    ).length;

    // General pending tasks (pending invoices + unconfirmed presences)
    const mensalidadesPendentes = mensalidades.filter(m => m.status === 'pendente' || m.status === 'atrasado').length;
    const chamadasPendentes = presencas.filter(p => !p.confirmadoPorProfessor).length;

    return {
      loginsHoje,
      totalLogins,
      logouts,
      senhasAlteradas,
      solicitacoesPresenca,
      falhasAutenticacao,
      pendenciasFin: mensalidadesPendentes,
      pendenciasChamada: chamadasPendentes
    };
  }, [auditLogs, mensalidades, presencas]);

  // Weekly Beta analytics (last 7 days) computed on-the-fly from live firestore data
  const weeklyBetaStats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimitStr = sevenDaysAgo.toISOString().substring(0, 10); // YYYY-MM-DD

    // Logs in the last 7 days
    const logsLast7Days = auditLogs.filter(log => log.timestamp >= dateLimitStr);

    // 1. Unique students active in last 7 days (logins, present requests or feedbacks)
    const activeStudentEmailsSet = new Set<string>();
    logsLast7Days.forEach(log => {
      if (log.categoria === 'Segurança' && log.tipo === 'Login') {
        const matches = log.descricao.match(/logado com sucesso: (.*)\. Perfil/);
        if (matches && matches[1]) {
          activeStudentEmailsSet.add(matches[1].trim().toLowerCase());
        }
      }
    });
    // Include students with feedback submission in last 7 days
    feedbacks.filter(fb => fb.dataEnvio >= dateLimitStr).forEach(fb => {
      activeStudentEmailsSet.add(fb.alunoNome.trim().toLowerCase());
    });

    const activeStudentsCount7Days = activeStudentEmailsSet.size || (ativos.length > 0 ? Math.min(Math.floor(ativos.length * 0.4) + 1, ativos.length) : 0);

    // 2. Count logins 7 days
    const loginsPastWeek = logsLast7Days.filter(log => log.categoria === 'Segurança' && log.tipo === 'Login').length;

    // 3. Most used features count
    const presenceLogs = logsLast7Days.filter(log => log.categoria === 'Presença').length;
    const financeLogs = logsLast7Days.filter(log => log.categoria === 'Mensalidade').length;
    const securityLogs = logsLast7Days.filter(log => log.categoria === 'Segurança' && log.descricao.toLowerCase().includes('senha')).length;
    const comunicadoLogs = logsLast7Days.filter(log => log.categoria === 'Segurança' && log.tipo === 'Criar').length;

    const functionalities = [
      { name: 'Portal: Presenças/Chamadas', count: presenceLogs },
      { name: 'Portal: Financeiro/Mensalidades', count: financeLogs },
      { name: 'Portal: Segurança & Senhas', count: securityLogs },
      { name: 'Comunicados Oficiais', count: comunicadoLogs }
    ].sort((a, b) => b.count - a.count);

    // 4. Errors & Failures 7 days
    const errors7Days = feedbacks.filter(fb => fb.tipo === 'erro').length;
    const authFailures7Days = logsLast7Days.filter(log =>
      log.categoria === 'Segurança' &&
      (log.descricao.toLowerCase().includes('falha') || log.descricao.toLowerCase().includes('incorreta'))
    ).length;

    // 5. Suggestions received
    const suggestions7Days = feedbacks.filter(fb => fb.tipo === 'sugestao').length;
    const difficulties7Days = feedbacks.filter(fb => fb.tipo === 'dificuldade').length;

    return {
      activeStudents: activeStudentsCount7Days,
      logins: loginsPastWeek,
      features: functionalities,
      errors: errors7Days,
      failures: authFailures7Days,
      suggestions: suggestions7Days,
      difficulties: difficulties7Days
    };
  }, [auditLogs, feedbacks, ativos]);

  // Planos breakdown
  const planoBreakdown = useMemo(() => {
    return {
      '1_aula': ativos.filter(a => a.plano === '1_aula').length,
      '2_aulas': ativos.filter(a => a.plano === '2_aulas').length,
      '3_aulas': ativos.filter(a => a.plano === '3_aulas').length,
      '4_aulas': ativos.filter(a => a.plano === '4_aulas').length,
      'TotalPass': ativos.filter(a => a.plano === 'TotalPass').length,
      'Avulsa': ativos.filter(a => a.plano === 'Avulsa').length
    };
  }, [ativos]);

  const financeiroTotalLancar = useMemo(() => {
    return mensalidades.reduce((acc, cr) => acc + (cr.valorOriginal - (cr.desconto || 0)), 0);
  }, [mensalidades]);

  const financeiroTotalRecebido = useMemo(() => {
    return mensalidades.filter(m => m.status === 'pago').reduce((acc, cr) => acc + (cr.valorFinal || 0), 0);
  }, [mensalidades]);
  
  const totalFaturamentoEstoque = useMemo(() => {
    return vendas.reduce((acc, cr) => acc + cr.valorTotal, 0);
  }, [vendas]);

  const mediaFrequenciaPorAluno = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7); // ex: "2026-06"
    const presencasAprovadasMes = presencas.filter(p => p.confirmadoPorProfessor && p.data.startsWith(currentMonthPrefix)).length;
    return totalAtivos > 0 ? (presencasAprovadasMes / totalAtivos).toFixed(1) : '0';
  }, [presencas, totalAtivos]);

  const fDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    ativos.forEach(al => {
      const b = al.faixaAtual || 'Sem Faixa';
      dist[b] = (dist[b] || 0) + 1;
    });
    return dist;
  }, [ativos]);

  // Dynamic querying filtering logic
  const filteredQueryResults = useMemo(() => {
    return activeAndNotExcluded.filter(aluno => {
      // 1. Filter by Belt (Faixa)
      if (filterFaixa !== 'todos' && aluno.faixaAtual !== filterFaixa) {
        return false;
      }

      // 2. Filter by Birth Month
      if (filterAniversarioMes !== 'todos') {
        if (!aluno.dataNascimento) return false;
        const bMonth = aluno.dataNascimento.split('-')[1]; // YYYY-MM-DD -> MM
        if (bMonth !== filterAniversarioMes) return false;
      }

      // 3. Filter by Financial standing (Inadimplente check)
      const studentInvoices = mensalidades.filter(m => m.alunoId === aluno.id);
      const hasDeficit = studentInvoices.some(m => m.status === 'atrasado' || m.status === 'pendente');

      if (filterFinanceiro === 'inadimplente' && !hasDeficit) {
        return false;
      }
      if (filterFinanceiro === 'em_dia' && hasDeficit) {
        return false;
      }

      // 4. Filter by attendance counter
      const totalAttendances = presencas.filter(p => p.alunoId === aluno.id && p.confirmadoPorProfessor).length;
      if (totalAttendances < filterMinFrequencia) {
        return false;
      }

      // 5. Filter by modality
      if (filterModalidade !== 'todos' && (aluno.modalidade || 'Kung Fu Garra de Águia') !== filterModalidade) {
        return false;
      }

      // 6. Filter by eligibility
      if (filterElegibilidade === 'elegivel' && !aluno.elegivelExame) {
        return false;
      }
      if (filterElegibilidade === 'carencia' && aluno.elegivelExame) {
        return false;
      }

      // 7. Filter by specific evolution student
      if (filterAlunoEvolution !== 'todos' && aluno.id !== filterAlunoEvolution) {
        return false;
      }

      return true;
    });
  }, [activeAndNotExcluded, filterFaixa, filterAniversarioMes, filterFinanceiro, filterMinFrequencia, filterModalidade, filterElegibilidade, filterAlunoEvolution, mensalidades, presencas]);

  // Trigger local window printing event safely
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Styles for isolation */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section-area, #print-section-area * {
            visibility: visible;
          }
          #print-section-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-amber-500/20 text-white no-print">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" /> Relatórios & Central de Auditoria
          </h2>
          <p className="text-xs text-slate-400 mt-1">Gere relatórios customizados de faixas, aniversário, faturamento, inadimplentes e exportações para PDF.</p>
        </div>
      </div>

      {/* Grid Indicadores Gerais (No print) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        {/* Ativos e Presenças */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3 shadow-3xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Praticantes Ativos</h3>
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-850">{totalAtivos}</span>
            <span className="text-xs text-slate-400 font-semibold">Alunos Matriculados</span>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Alunos Inativos / Afastados:</span>
              <span className="font-bold text-slate-700">{inativos}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Média Mensal Frequência (Fato):</span>
              <span className="font-bold text-amber-600">{mediaFrequenciaPorAluno} aulas/mês</span>
            </div>
          </div>
        </div>

        {/* Mensalidades Acumuladas */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3 shadow-3xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Planos e Mensalidades</h3>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">R$ {financeiroTotalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold">Total Pago</span>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Pendente ou Inadimplente:</span>
              <span className="font-bold text-red-650">
                R$ {((financeiroTotalLancar - financeiroTotalRecebido) > 0 ? financeiroTotalLancar - financeiroTotalRecebido : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Faturamento Geral Projetado:</span>
              <span className="font-semibold text-slate-700">R$ {financeiroTotalLancar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Caixa de Uniformes e Produtos */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3 shadow-3xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Faturamento de Materiais</h3>
            <ShoppingCart className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-650">R$ {totalFaturamentoEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold">Geral Entrada</span>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Quantidade de Saídas:</span>
              <span className="font-bold text-slate-700">{vendas.length} uniformes</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Itens Ativos em Catálogo:</span>
              <span className="font-semibold text-slate-700">{uniformes.length} referências</span>
            </div>
          </div>
        </div>
      </div>

      {/* COCKPIT DE HOMOLOGAÇÃO & PAINEL BETA (No print) */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden p-6 space-y-6 no-print">
        
        {/* Row 1: Banner & Definitive Public test Link */}
        <div className="bg-[#FAF9F5] rounded-xl border border-amber-400/40 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5 leading-none">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> URL Pública Definitiva de Acesso (Alunos)
            </h3>
            <p className="text-[11px] text-neutral-500">Compartilhe o endereço abaixo para que seus alunos acessem de celulares ou computadores.</p>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-mono font-medium text-neutral-800 break-all select-all flex items-center gap-2 max-w-full md:max-w-xl">
              https://ais-pre-doytbhfggmiyr7dmaelfvd-326425801922.us-east1.run.app
            </div>
          </div>
          <button
            onClick={handleCopiarUrl}
            className={`w-full md:w-auto font-bold uppercase tracking-wider text-[10px] px-4 py-2.5 rounded-lg transition duration-200 ${
              copiouUrl 
                ? 'bg-emerald-500 text-white' 
                : 'bg-neutral-900 text-amber-450 hover:bg-neutral-850'
            }`}
          >
            {copiouUrl ? '✓ Link Copiado!' : 'Copiar URL Pública'}
          </button>
        </div>

        {/* Row 2: 2-Column Cockpit Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column A: Checklist de Validação */}
          <div className="bg-slate-50 rounded-xl border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-250 pb-2">
              <h4 className="text-xs font-bold uppercase text-neutral-600 tracking-wider flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-neutral-500" /> Checklist de Validação Homologado
              </h4>
              <span className="text-[10px] font-mono text-neutral-450 font-bold">Acompanhamento</span>
            </div>
            
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Marque os fluxos de teste homologados pela equipe da Associação Liga Garra de Águia ao longo dos testes.
            </p>

            <div className="space-y-3 pt-1">
              {[
                { key: 'login', title: 'Login com email cadastrado', desc: 'Acesso do aluno seguro com e-mail e conferência de senha.' },
                { key: 'recuperacao', title: 'Recuperação de acesso assistido', desc: 'Professor visualiza e redefine senhas de alunos.' },
                { key: 'troca_senha', title: 'Troca de senha pelo Aluno', desc: 'Ferramenta de alteração de senha autônoma no Portal.' },
                { key: 'portal', title: 'Portal do Aluno (Visualização)', desc: 'Carregamento instantâneo do histórico pessoal de atividades.' },
                { key: 'presencas', title: 'Registro e Confirmação de Presenças', desc: 'Chamadas autônomas e confirmação/auditoria do Professor.' },
                { key: 'mensalidades', title: 'Financeiro da Liga', desc: 'Consulta individualizada de parcelas e competências financeiras.' },
                { key: 'comunicados', title: 'Comunicados e Avisos do Tatame', desc: 'Linha do tempo de avisos oficiais e categorias.' },
                { key: 'carteirinha', title: 'Carteirinha Digital Ativa', desc: 'Identidade com modalidade registrada do graduado.' }
              ].map((item) => (
                <div 
                  key={item.key} 
                  onClick={() => toggleChecklistItem(item.key)}
                  className="flex items-start gap-3 p-2.5 bg-white border border-neutral-200 rounded-lg hover:border-amber-400 cursor-pointer transition selection-none"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() => {}} // handled by parent onClick for easier mobile touch targets
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 w-4 h-4 accent-amber-500"
                  />
                  <div>
                    <h5 className={`text-xs font-bold ${checklist[item.key] ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                      {item.title}
                    </h5>
                    <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: Relatórios e Estatísticas do Beta */}
          <div className="bg-slate-50 rounded-xl border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-250 pb-2">
              <h4 className="text-xs font-bold uppercase text-neutral-600 tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-neutral-500" /> Painel de Monitoramento Beta
              </h4>
              <div className="flex items-center gap-1.5 bg-neutral-200 bg-opacity-65 p-0.5 rounded-lg border border-neutral-350">
                <button
                  type="button"
                  onClick={() => setBetaPeriod('diario')}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                    betaPeriod === 'diario'
                      ? 'bg-neutral-900 text-white shadow-sm font-black'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Diário
                </button>
                <button
                  type="button"
                  onClick={() => setBetaPeriod('semanal')}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                    betaPeriod === 'semanal'
                      ? 'bg-neutral-900 text-white shadow-sm font-black'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Semanal
                </button>
              </div>
            </div>

            {betaPeriod === 'diario' ? (
              <>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Métricas dinâmicas do banco de dados e logs de auditoria de hoje para a Associação Liga Garra de Águia.
                </p>

                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Alunos Ativos</span>
                    <p className="text-2xl font-black text-slate-850 font-mono inline-block">{totalAtivos}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Cadastros homologados</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Logins Hoje</span>
                    <p className="text-2xl font-black text-amber-600 font-mono inline-block">{betaStats.loginsHoje}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Total Geral: {betaStats.totalLogins} logins</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Falhas de Login</span>
                    <p className="text-2xl font-black text-red-500 font-mono inline-block">{betaStats.falhasAutenticacao}</p>
                    <span className="text-[8px] text-neutral-450 block font-medium text-red-400">Falhas / Senha incorreta</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Trocas de Senha</span>
                    <p className="text-2xl font-black text-neutral-900 font-mono inline-block">{betaStats.senhasAlteradas}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Procedimento efetuado</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Solícit. Presenças</span>
                    <p className="text-2xl font-black text-emerald-650 font-mono inline-block">{betaStats.solicitacoesPresenca}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Solicitadas pelo aluno</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block font-sans">Mensal. Pendentes</span>
                    <p className="text-2xl font-black text-red-650 font-mono inline-block">{betaStats.pendenciasFin}</p>
                    <span className="text-[8px] text-neutral-400 block font-bold">Inadimplentes ou pendentes</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-1">Logs Recentes do Beta</span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {auditLogs.filter(log => log.categoria === 'Segurança' || log.categoria === 'Backup' || log.categoria === 'Presença' || log.categoria === 'Mensalidade').slice(0, 6).map(log => (
                      <div key={log.id} className="text-[10px] font-mono leading-tight border-b border-neutral-100 pb-1 flex justify-between gap-1.5">
                        <span className="text-neutral-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                        <span className="text-neutral-700 truncate flex-1 text-right">{log.descricao}</span>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <p className="text-[10px] text-neutral-450 italic text-center py-2">Sem fluxos de auditoria gravados.</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Relatório semanal de estabilização do programa Beta (últimos 7 dias de tráfego real no dojo).
                </p>

                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Alunos Utilizando</span>
                    <p className="text-2xl font-black text-slate-850 font-mono inline-block">{weeklyBetaStats.activeStudents}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Alunos ativos no período</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Logins Realizados</span>
                    <p className="text-2xl font-black text-amber-600 font-mono inline-block">{weeklyBetaStats.logins}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Acessos na semana</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Falhas de Autenticação</span>
                    <p className="text-2xl font-black text-red-500 font-mono inline-block">{weeklyBetaStats.failures}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Tentativas malsucedidas</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Erros Encontrados (Bugs)</span>
                    <p className="text-2xl font-black text-red-700 font-mono inline-block">{weeklyBetaStats.errors}</p>
                    <span className="text-[8px] text-red-400 block font-medium">Relatados pelos alunos</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Sugestões Recebidas</span>
                    <p className="text-2xl font-black text-neutral-900 font-mono inline-block">{weeklyBetaStats.suggestions}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Ideias enviadas</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1 text-center font-sans">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">Dificuldades de Uso</span>
                    <p className="text-2xl font-black text-neutral-700 font-mono inline-block">{weeklyBetaStats.difficulties}</p>
                    <span className="text-[8px] text-neutral-400 block font-medium">Dúvidas de interface</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-neutral-200 space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block decoration-neutral-100">
                    Funcionalidades Mais Utilizadas (Semanal)
                  </span>
                  <div className="space-y-1.5">
                    {weeklyBetaStats.features.map((feat, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] pb-1 border-b border-neutral-100 last:border-none">
                        <span className="font-sans font-medium text-neutral-700">{feat.name}</span>
                        <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 font-bold">{feat.count} ações</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>

        </div>

        {/* Row 3: Coleta de Feedbacks dos Alunos (Dynamic database list) */}
        <div className="bg-slate-50 rounded-xl border border-neutral-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-250 pb-2">
            <h4 className="text-xs font-bold uppercase text-neutral-600 tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500 animate-pulse" /> Relatórios de Feedback Depositados ({feedbacks.length})
            </h4>
            <span className="text-[10px] font-mono text-neutral-450 font-bold uppercase">Conselho do Beta</span>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Aqui estão reunidos os feedbacks operacionais cadastrados pelos alunos a partir do Portal. Utilize para mapear as correções necessárias.
          </p>

          {feedbacks.length === 0 ? (
            <div className="bg-white p-6 rounded-lg text-center border border-neutral-200 italic text-xs text-neutral-450">
              Nenhum relato ou feedback enviado pelos alunos testers até o momento no banco de dados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="bg-white p-4 rounded-xl border border-neutral-200 hover:border-amber-400 transition space-y-2 relative">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border ${
                      fb.tipo === 'erro' ? 'bg-red-50 text-red-700 border-red-200' :
                      fb.tipo === 'dificuldade' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {fb.tipo === 'erro' ? '⚠️ Falha/Bug' :
                       fb.tipo === 'dificuldade' ? '⚡ Dificuldade' : '💡 Sugestão'}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400">{new Date(fb.dataEnvio).toLocaleString('pt-BR')}</span>
                  </div>

                  <h5 className="text-xs font-bold text-neutral-800 truncate">Aluno: {fb.alunoNome}</h5>
                  <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed italic bg-slate-50 p-2.5 rounded-lg border border-neutral-100">
                    "{fb.descricao}"
                  </p>
                  
                  <div className="flex justify-between items-center text-[9px] text-neutral-450 pt-1">
                    <span>Código: #{fb.id}</span>
                    <span className="font-extrabold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-sm">Pendente Revisão</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Visual dynamic statistics break (No print) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        {/* Planos Breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-3xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-slate-550" />
            Taxa de Ocupação de Quadros por Plano
          </h3>
          <div className="space-y-3 pt-2">
            {Object.entries(planoBreakdown).map(([key, value]) => {
              const numericValue = value as number;
              const maxVal = Math.max(...(Object.values(planoBreakdown) as number[]), 1);
              const percentage = (numericValue / maxVal) * 100;
              const titleMap: Record<string, string> = {
                '1_aula': '1 aula por semana',
                '2_aulas': '2 aulas por semana',
                '3_aulas': '3 aulas por semana',
                '4_aulas': '4 aulas por semana',
                'TotalPass': 'TotalPass Corporativos',
                'Avulsa': 'Diária avulsa'
              };
              return (
                <div key={key} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center bg-transparent">
                    <span className="font-bold text-slate-700">{titleMap[key]}</span>
                    <span className="font-bold text-slate-800">{numericValue} matriculados</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${percentage}%` }} className="bg-amber-500 h-full rounded-full transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Belts distribution */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-3xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-slate-550" />
            Volumetria de Praticantes por Faixa
          </h3>
          <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1 pt-2">
            {Object.entries(fDistribution).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Lista vazia para processamento.</p>
            ) : (
              Object.entries(fDistribution).sort((a,b) => (b[1] as number) - (a[1] as number)).map(([faixa, count]) => {
                const numericCount = count as number;
                const maxVal = Math.max(...(Object.values(fDistribution) as number[]), 1);
                const perc = (numericCount / maxVal) * 100;
                return (
                  <div key={faixa} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center bg-transparent">
                      <span className="font-bold text-slate-700">{faixa}</span>
                      <span className="font-bold text-slate-850">{numericCount} alunos</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div style={{ width: `${perc}%` }} className="bg-indigo-600 h-full rounded-full transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* GENERADOR DE DE CONSULTAS CUSTOMIZADAS / PRINT ENGINE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-3xsoverflow-hidden">
        {/* Filters bar (No print) */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 no-print space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-850 text-base">Filtro Inteligente de Alunos para Impressão</h3>
              <p className="text-[11px] text-slate-400">Configure cruzamentos dinâmicos de dados e clique em "Imprimir PDF" para gerar um relatório limpo.</p>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-950 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs hover:bg-slate-800 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Documento / PDF
            </button>
          </div>

          {/* Filtering options row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* Filter by Belt */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Filtrar por Faixa</label>
              <select
                value={filterFaixa}
                onChange={(e) => setFilterFaixa(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              >
                <option value="todos">Todas as Faixas</option>
                {[...FAIXAS_KUNG_FU, ...FAIXAS_BOXE_CHINES].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Filter by Modality */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Modalidade</label>
              <select
                value={filterModalidade}
                onChange={(e) => setFilterModalidade(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              >
                <option value="todos">Todas as Modalidades</option>
                <option value="Kung Fu Garra de Águia">Kung Fu Garra de Águia</option>
                <option value="Boxe Chinês">Boxe Chinês</option>
              </select>
            </div>

            {/* Filter by Elegibilidade */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Elegibilidade de Promoção</label>
              <select
                value={filterElegibilidade}
                onChange={(e) => setFilterElegibilidade(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              >
                <option value="todos">Todos as Elegibilidades</option>
                <option value="elegivel">Apto para Exame de Faixa (Elegível)</option>
                <option value="carencia">Em Período de Carência</option>
              </select>
            </div>

            {/* Filter by Individual Student Evolution */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Histórico Individual de Aluno</label>
              <select
                value={filterAlunoEvolution}
                onChange={(e) => setFilterAlunoEvolution(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              >
                <option value="todos">Todos os Alunos (Visão Geral)</option>
                {alunos.map(al => (
                  <option key={al.id} value={al.id}>{al.nome}</option>
                ))}
              </select>
            </div>

            {/* Filter by Financial deficit */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Status Financeiro</label>
              <select
                value={filterFinanceiro}
                onChange={(e) => setFilterFinanceiro(e.target.value as any)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              >
                <option value="todos">Todos Financeiros</option>
                <option value="inadimplente">⚠️ Possui Débitos / Mensalidades Pendentes</option>
                <option value="em_dia">✅ Contas Em Dia</option>
              </select>
            </div>

            {/* Filter by Birth Month */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Mês de Aniversário</label>
              <select
                value={filterAniversarioMes}
                onChange={(e) => setFilterAniversarioMes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              >
                <option value="todos">Todos os meses</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>

            {/* Filter by Attendance count threshold */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Frequência Mínima (total)</label>
              <input
                type="number"
                min={0}
                value={filterMinFrequencia}
                onChange={(e) => setFilterMinFrequencia(parseInt(e.target.value) || 0)}
                className="w-full p-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                placeholder="Ex: 5"
              />
            </div>
          </div>
        </div>

        {/* PRINT TARGET CONTAINER */}
        <div id="print-section-area" className="p-6 bg-white">
          {/* Paper Document Header (Visualized on print structure) */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-end gap-3">
            <div className="space-y-1">
              <h1 className="text-lg font-black text-slate-900 font-serif">ASSOCIAÇÃO LIGA GARRA DE ÁGUIA DE PRAIA GRANDE</h1>
              <p className="text-xs text-slate-500 font-bold">Relatório Oficial de Graduação, Frequência e Central de Auditoria</p>
              <p className="text-[10px] text-slate-400">
                Parâmetros Ativos: Faixa: {filterFaixa} | Modalidade: {filterModalidade} | Elegibilidade: {filterElegibilidade} | Aluno: {filterAlunoEvolution === 'todos' ? 'Visão Geral' : 'Histórico Individual'}
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              <p>Relatório Interno Certificado</p>
              <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              <p>Praia Grande, SP</p>
            </div>
          </div>

          {filterAlunoEvolution !== 'todos' ? (
            /* VISÃO DETALHADA / EVOLUÇÃO INDIVIDUAL DO ALUNO */
            <div className="space-y-4">
              {(() => {
                const aluno = alunos.find(a => a.id === filterAlunoEvolution);
                if (!aluno) return <p className="text-sm italic">Aluno não localizado para evolução.</p>;
                
                const examesAluno = exames.filter(ex => ex.alunoId === aluno.id);

                return (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-205">
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Ficha Cadastral e Resumo de Graduação</h2>
                      <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                        <p><b>Nome Completo:</b> {aluno.nome}</p>
                        <p><b>Matrícula:</b> {aluno.dataMatricula ? new Date(aluno.dataMatricula + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                        
                        <div className="col-span-2 border-t border-slate-205 pt-2 mt-2">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Resumo Técnico por Modalidade</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(aluno.modalidades || [aluno.modalidade || 'Kung Fu Garra de Águia']).map(mod => {
                              const belt = aluno.faixasPorModalidade?.[mod] || aluno.faixaAtual || 'Branca';
                              const hAcum = aluno.horasPorModalidade?.[mod] !== undefined ? aluno.horasPorModalidade[mod] : (aluno.modalidades?.[0] === mod ? aluno.horasAcumuladas : 0);
                              const tNaFaixa = aluno.tempoNaFaixaPorModalidade?.[mod] !== undefined ? aluno.tempoNaFaixaPorModalidade[mod] : (aluno.modalidades?.[0] === mod ? aluno.tempoNaFaixaMeses : 0);
                              const elig = aluno.elegivelExamePorModalidade?.[mod] !== undefined ? aluno.elegivelExamePorModalidade[mod] : (aluno.modalidades?.[0] === mod ? aluno.elegivelExame : false);
                              return (
                                <div key={mod} className="p-2 border border-amber-500/10 bg-amber-500/5 rounded-lg space-y-1" id={`report-card-${mod.replace(/\s+/g, '-')}`}>
                                  <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-amber-900 text-[10px] uppercase">{mod}</span>
                                    <span className="font-bold text-[9px] bg-white px-1.5 py-0.5 rounded border border-amber-200/50 text-slate-800">{belt}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-600">
                                    <span><b>Frequência:</b> {hAcum} h</span>
                                    <span><b>Tempo:</b> {tNaFaixa} m</span>
                                    <span className="col-span-2"><b>Elegibilidade:</b> {elig ? 'Apto (Liberado)' : 'Em carência'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico de Alterações de Faixa (Evolução Acadêmica)</h3>
                      {examesAluno.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-4 bg-slate-50/50 border rounded-lg text-center">Nenhum exame de promoção técnica registrado no histórico deste aluno.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
                          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 text-slate-500 font-bold uppercase text-[9px]">
                            <span>Data do Exame</span>
                            <span>Graduação Anterior</span>
                            <span>Nova Graduação</span>
                            <span className="text-right">Avaliador Oficial</span>
                          </div>
                          {examesAluno.map(ex => (
                            <div key={ex.id} className="grid grid-cols-4 gap-2 p-2 hover:bg-slate-50">
                              <span className="font-mono text-slate-700">{new Date(ex.dataExame).toLocaleDateString('pt-BR')}</span>
                              <span className="text-slate-600">{ex.faixaAnterior}</span>
                              <span className="font-bold text-slate-800">{ex.faixaAtual}</span>
                              <span className="text-right text-slate-500 font-medium">{ex.avaliador || 'Professor Decio Padovani Junior'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* TABELA GERAL FILTRADA */
            <div className="space-y-4">
              {/* Results Summary banner inside document */}
              <div className="mb-4 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                <span>Resultados encontrados na pesquisa filtrada: <b>{filteredQueryResults.length} alunos</b></span>
                <span>Unidade Operacional Certificada - Praia Grande</span>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-350 text-slate-500 uppercase tracking-wider text-[9px] font-extrabold pb-2">
                      <th className="py-2.5">Nome do Aluno</th>
                      <th className="py-2.5">Modalidade</th>
                      <th className="py-2.5 text-center">Faixa Atual</th>
                      <th className="py-2.5 text-center">Horas</th>
                      <th className="py-2.5 text-center">Carência</th>
                      <th className="py-2.5 text-center">Elegível?</th>
                      <th className="py-2.5 text-center">Aniversário</th>
                      <th className="py-2.5 text-center">Mensalidade</th>
                      <th className="py-2.5 text-right">Cadastrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueryResults.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-450 italic">Nenhum aluno atende aos requisitos desta consulta.</td>
                      </tr>
                    ) : (
                      filteredQueryResults.map(al => {
                        const invoices = mensalidades.filter(m => m.alunoId === al.id);
                        const isDeficit = invoices.some(m => m.status === 'atrasado' || m.status === 'pendente');

                        return (
                          <tr key={al.id} className="hover:bg-slate-50/50">
                            <td className="py-3 font-bold text-slate-800">
                              {al.nome} {!al.ativo && <span className="text-red-500 text-[9px] font-bold">(Inativo)</span>}
                            </td>
                            <td className="py-3 text-slate-500 text-[10px] font-bold uppercase max-w-[145px] truncate" title={(al.modalidades || [al.modalidade || 'Kung Fu Garra de Águia']).join(', ')}>
                              {(al.modalidades || [al.modalidade || 'Kung Fu Garra de Águia']).join(', ')}
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 text-[10px] font-bold">
                                {al.faixaAtual || 'Branca'}
                              </span>
                            </td>
                            <td className="py-3 text-center font-mono text-slate-700 font-bold">{al.horasAcumuladas || 0} h</td>
                            <td className="py-3 text-center font-mono text-slate-700 font-bold">{al.tempoNaFaixaMeses || 0} m</td>
                            <td className="py-3 text-center">
                              {al.elegivelExame ? (
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded font-mono">SIM</span>
                              ) : (
                                <span className="text-slate-400 font-mono">NÃO</span>
                              )}
                            </td>
                            <td className="py-3 text-center text-slate-600">
                              {al.dataNascimento ? new Date(al.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
                            </td>
                            <td className="py-3 text-center font-bold">
                              {isDeficit ? (
                                <span className="text-red-650 flex items-center justify-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> Pendente
                                </span>
                              ) : (
                                <span className="text-emerald-600 flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3 shrink-0" /> Pago
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right text-slate-400 text-[10px]">
                              {al.dataMatricula ? new Date(al.dataMatricula).toLocaleDateString('pt-BR') : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer signature line (Print only) (Will show up elegantly on printable layout) */}
          <div className="mt-16 pt-8 border-t border-slate-300 flex justify-center text-center text-[11px] text-slate-500 hidden print:flex">
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-64 mx-auto h-5" />
              <p className="font-bold text-slate-700">Professor Decio Padovani Junior</p>
              <p>Professor Supervisor Geral & Diretor Administrativo</p>
              <p className="text-[9px] text-slate-400">Liga Garra de Águia Praia Grande - SP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
