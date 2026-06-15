import React from 'react';
import { Aluno, Mensalidade, Presenca, UniformeItem, Familia, GraduacaoExame, SolicitacaoMatricula } from '../types';
import { Users, DollarSign, ClipboardCheck, Award, Package, Users2, AlertTriangle, Check, X } from 'lucide-react';
import { PRECO_PLANOS } from '../constants';
import { OfficialLogo } from './OfficialLogo';

interface DashboardViewProps {
  alunos: Aluno[];
  mensalidades: Mensalidade[];
  presencas: Presenca[];
  uniformes: UniformeItem[];
  familias: Familia[];
  exames?: GraduacaoExame[];
  solicitacoesMatricula?: SolicitacaoMatricula[];
  approvePresenca: (id: string) => void;
  rejectPresenca: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export function DashboardView({
  alunos,
  mensalidades,
  presencas,
  uniformes,
  familias,
  exames = [],
  solicitacoesMatricula = [],
  approvePresenca,
  rejectPresenca,
  setActiveTab
}: DashboardViewProps) {
  // Stats
  const totalAlunosAtivos = alunos.filter(a => a.ativo && !a.excluido).length;
  const totalAlunosTotalPass = alunos.filter(a => a.ativo && !a.excluido && a.plano === 'TotalPass').length;
  const totalAlunosAvulsos = alunos.filter(a => a.ativo && !a.excluido && a.plano === 'Avulsa').length;

  const totalFamilias = familias.length;

  // Financeiro do mês atual (ex: Junho de 2026)
  const mesAtual = '2026-06';
  const mensalidadesDoMes = mensalidades.filter(m => m.competencia === mesAtual);
  
  const totalRecebidoMes = mensalidadesDoMes
    .filter(m => m.status === 'pago')
    .reduce((acc, current) => acc + (current.valorFinal || 0), 0);

  const totalPendenteMes = mensalidadesDoMes
    .filter(m => m.status === 'pendente')
    .reduce((acc, current) => {
      const g = current.valorOriginal - (current.desconto || 0);
      return acc + (g > 0 ? g : 0);
    }, 0);

  const totalAtrasado = mensalidades
    .filter(m => m.status === 'atrasado')
    .reduce((acc, current) => {
      const g = current.valorOriginal - (current.desconto || 0);
      return acc + (g > 0 ? g : 0);
    }, 0);

  // Solicitações de Presença Pendentes (confirmadoPorProfessor === false)
  const solicitacoesPendentes = presencas.filter(p => !p.confirmadoPorProfessor);

  // Alerta de Estoque Baixo
  const itensEstoqueBaixo = uniformes.filter(u => u.quantidade <= u.estoqueMinimo);

  // Graduation dashboard calculations
  const totalKungFu = alunos.filter(a => a.ativo && !a.excluido && (a.modalidades?.includes('Kung Fu Garra de Águia') || a.modalidade === 'Kung Fu Garra de Águia' || !a.modalidade)).length;
  const totalBoxe = alunos.filter(a => a.ativo && !a.excluido && (a.modalidades?.includes('Boxe Chinês') || a.modalidade === 'Boxe Chinês')).length;
  const totalTaiChi = alunos.filter(a => a.ativo && !a.excluido && (a.modalidades?.includes('Tai Chi Chuan') || a.modalidade === 'Tai Chi Chuan')).length;
  const totalElegiveis = alunos.filter(a => a.ativo && !a.excluido && (a.elegivelExame || Object.values(a.elegivelExamePorModalidade || {}).some(Boolean))).length;

  // Group by faixa
  const faixaCounts: { [key: string]: number } = {};
  alunos.filter(a => a.ativo && !a.excluido).forEach(a => {
    const f = a.faixaAtual || 'Faixa Branca (Preparatória)';
    faixaCounts[f] = (faixaCounts[f] || 0) + 1;
  });

  // Recent exams
  const examesRecentes = (exames || []).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Premium Traditional Temple style */}
      <div className="relative overflow-hidden bg-neutral-950 rounded-2xl border border-red-950/50 p-6 sm:p-8 shadow-xl">
        {/* Calligraphy Watermark */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none hidden sm:block">
          <span className="text-9xl font-serif text-amber-500 font-extrabold block">鷹爪派</span>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Logo container with radial gold glow */}
          <div className="relative shrink-0 flex items-center justify-center p-1 rounded-full border-2 border-amber-500/20 bg-neutral-900/60 shadow-lg">
            <OfficialLogo size="lg" />
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-950/55 text-amber-400 border border-amber-500/20">
              聯盟 • Associação Liga Garra de Águia
            </div>
            <h1 id="welcome-title" className="text-xl sm:text-3xl font-extrabold tracking-wide text-amber-400 font-serif lowercase! first-letter:uppercase!">
              Kung Fu Garra de Águia Praia Grande
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl font-medium">
              Painel operacional oficial da Associação Liga Garra de Águia de Praia Grande. Controle integrado de matrículas tradicionais, mensalidades, chamadas de presença e exames de graduação.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Ativos */}
        <div id="stat-ativos" className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-xs flex items-center justify-between hover:border-red-950/20 transition-all duration-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Alunos Ativos</p>
            <h3 className="text-2xl font-bold text-neutral-800 tracking-tight">{totalAlunosAtivos}</h3>
            <p className="text-[11px] text-neutral-500">
              <span className="font-bold text-red-800">{totalAlunosTotalPass}</span> TotalPass | <span className="font-bold text-amber-600">{totalAlunosAvulsos}</span> Avulsos
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Faturamento */}
        <div id="stat-faturamento" className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-xs flex items-center justify-between hover:border-red-950/20 transition-all duration-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Faturado (Junho)</p>
            <h3 className="text-2xl font-bold text-emerald-700 tracking-tight">R$ {totalRecebidoMes.toFixed(2)}</h3>
            <p className="text-[11px] text-neutral-500">Faturamento consolidado</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Pendências */}
        <div id="stat-pendentes" className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-xs flex items-center justify-between hover:border-red-950/20 transition-all duration-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Pendente (Junho)</p>
            <h3 className="text-2xl font-bold text-amber-600 tracking-tight">R$ {totalPendenteMes.toFixed(2)}</h3>
            <p className="text-[11px] text-red-700 font-bold">
              Em atraso: R$ {totalAtrasado.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-605 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Solicitações */}
        <div id="stat-solicitacoes" className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-xs flex items-center justify-between hover:border-red-950/20 transition-all duration-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Chamadas Pendentes</p>
            <h3 className="text-2xl font-bold text-red-800 tracking-tight">{solicitacoesPendentes.length}</h3>
            <p className="text-[11px] text-neutral-500 font-medium">Aguardando aprovação</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-800 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-red-800" />
          </div>
        </div>

        {/* Pré-Matrículas Pendentes */}
        <div 
          id="stat-pre-matriculas" 
          onClick={() => setActiveTab('alunos')}
          className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-xs flex items-center justify-between hover:border-red-950/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Pré-Matrículas</p>
            <h3 className="text-2xl font-bold text-rose-700 tracking-tight group-hover:text-amber-500 transition-colors">
              {solicitacoesMatricula.filter(s => s.status === 'pendente').length}
            </h3>
            <p className="text-[11px] text-neutral-500 font-medium">Pendente de aprovação</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-550 transition-all">
            <Users2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SEÇÃO ESPECIAL - INDICADORES DE GRADUAÇÃO (MÓDULO 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição por Modalidade e Faixas */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-neutral-200/60 p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 font-serif">
              <Award className="w-5 h-5 text-amber-500 animate-bounce" />
              Praticantes por Modalidade e Graduação
            </h3>
            <p className="text-xs text-slate-400">Distribuição atualizada em tempo real dos alunos matriculados nas duas trilhas de Praia Grande</p>
          </div>

          {/* Modalidade Progress Bar */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className="p-2 border border-red-200/40 bg-red-50/40 rounded-xl">
                <span className="text-red-900 block font-extrabold pb-0.5">Kung Fu</span>
                <span className="text-xs font-black text-red-950 font-mono">{totalKungFu}</span>
              </div>
              <div className="p-2 border border-blue-200/40 bg-blue-50/40 rounded-xl">
                <span className="text-blue-900 block font-extrabold pb-0.5">Boxe Chinês</span>
                <span className="text-xs font-black text-blue-950 font-mono">{totalBoxe}</span>
              </div>
              <div className="p-2 border border-emerald-200/40 bg-emerald-50/40 rounded-xl">
                <span className="text-emerald-900 block font-extrabold pb-0.5">Tai Chi</span>
                <span className="text-xs font-black text-emerald-950 font-mono">{totalTaiChi}</span>
              </div>
            </div>
            
            <div className="w-full h-3.5 bg-slate-100 rounded-full flex overflow-hidden">
              <div 
                style={{ width: `${(totalKungFu / (totalKungFu + totalBoxe + totalTaiChi || 1)) * 100}%` }}
                className="bg-red-800 transition-all duration-300 hover:opacity-90" 
                title={`Kung Fu Garra de Águia: ${totalKungFu}`}
              />
              <div 
                style={{ width: `${(totalBoxe / (totalKungFu + totalBoxe + totalTaiChi || 1)) * 100}%` }}
                className="bg-blue-600 transition-all duration-300 hover:opacity-90" 
                title={`Boxe Chinês: ${totalBoxe}`}
              />
              <div 
                style={{ width: `${(totalTaiChi / (totalKungFu + totalBoxe + totalTaiChi || 1)) * 100}%` }}
                className="bg-emerald-600 transition-all duration-300 hover:opacity-90" 
                title={`Tai Chi Chuan: ${totalTaiChi}`}
              />
            </div>
          </div>

          {/* Ranks breakdown */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distribuição por Graduação Atual</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(faixaCounts).map(([faixa, count]) => (
                <div key={faixa} className="flex justify-between items-center p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100/70 transition border border-neutral-100">
                  <span className="font-semibold text-neutral-600 truncate max-w-[70%]" title={faixa}>{faixa}</span>
                  <span className="font-extrabold bg-neutral-200/80 px-2 py-0.5 rounded text-neutral-800 shrink-0">{count}</span>
                </div>
              ))}
              {Object.keys(faixaCounts).length === 0 && (
                <p className="col-span-2 text-center py-4 text-slate-400">Nenhum aluno ativo graduado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Elegibilidade e Exames Recentes */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-neutral-200/60 p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 font-serif">
              <Users2 className="w-5 h-5 text-emerald-600" />
              Elegibilidade para Exames & Linha do Tempo
            </h3>
            <p className="text-xs text-slate-400">Gestão de carências acadêmicas autorizadas pelo Professor Decio Padovani Junior</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Elegíveis Widget */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Aptos para Exame de Faixa</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600">{totalElegiveis}</span>
                <span className="text-xs text-emerald-700 font-bold">alunos aptos</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-2">Prontos tecnicamente e atendendo carências de treinamento regulamentadas.</p>
            </div>

            {/* Total Ativos Tracker */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-500/5 flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Próxima Promoção Ativa</span>
              <div className="mt-2 text-slate-700 text-xs font-semibold leading-relaxed">
                {totalElegiveis > 0 
                  ? `Exame do Mestre sob coordenação do Prof. Decio Padovani Jr.`
                  : "Todos os praticantes ativos estão em período de carência."
                }
              </div>
              <p className="text-[10px] text-amber-600 mt-2">Cumprimento de 100% das obrigações federativas.</p>
            </div>
          </div>

          {/* Últimos Exames Realizados */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exames e Promoções Recentes ("Professor Decio Padovani Junior")</h4>
            <div className="space-y-2">
              {examesRecentes.map(ex => {
                const al = alunos.find(a => a.id === ex.alunoId);
                return (
                  <div key={ex.id} className="p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">{al?.nome || 'Aluno não localizado'}</p>
                      <p className="text-slate-500">
                        {ex.faixaAnterior} → <span className="font-bold text-slate-700">{ex.faixaAtual}</span>
                      </p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Aprovado por Prof. Decio
                      </span>
                      <p className="text-[10px] text-slate-400">{new Date(ex.dataExame).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                );
              })}
              {examesRecentes.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-100 rounded-lg">
                  Nenhum exame cadastrado no histórico ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Inferior: Solicitações de Presença e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo - Solicitações de Presença */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-100 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-slate-800">Solicitações de Presença Recentes</h2>
              <p className="text-xs text-slate-400">Alunos que solicitaram checagem ou check-in nas aulas na Praia Grande</p>
            </div>
            <button 
              onClick={() => setActiveTab('presencas')} 
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
            >
              Ver todas
            </button>
          </div>

          {solicitacoesPendentes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
              <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Nenhuma solicitação de presença pendente de aprovação.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden border border-slate-100 rounded-xl">
              {solicitacoesPendentes.map(sol => {
                const aluno = alunos.find(a => a.id === sol.alunoId);
                return (
                  <div key={sol.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">{aluno?.nome || 'Aluno não localizado'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{sol.horario}</span>
                        <span>•</span>
                        <span>Data: {new Date(sol.data).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {aluno?.plano === 'TotalPass' ? 'TotalPass' : aluno?.plano === 'Avulsa' ? 'Aula Avulsa' : `${aluno?.plano?.replace('_', ' ')}/sem`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => rejectPresenca(sol.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        title="Rejeitar Chamada"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => approvePresenca(sol.id)}
                        className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition bg-emerald-50/50"
                        title="Aprovar Chamada"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lado Direito - Cards Rápidos/Alertas de Estoque */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card de Alertas de Estoque */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Alertas de Uniformes
              </h2>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-100">
                {itensEstoqueBaixo.length} baixos
              </span>
            </div>

            {itensEstoqueBaixo.length === 0 ? (
              <p className="text-xs text-emerald-600 bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg text-center">
                ✓ Todo o estoque de uniformes e faixas está adequado.
              </p>
            ) : (
              <div className="space-y-3">
                {itensEstoqueBaixo.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/50 border border-red-50 rounded-lg text-xs">
                    <div className="space-y-0.5 max-w-[70%]">
                      <p className="font-bold text-slate-800 truncate">{item.produto}</p>
                      <p className="text-slate-500">Tam: <span className="font-semibold">{item.tamanho}</span> • Categoria: {item.categoria}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-red-600 block">{item.quantidade} itens</span>
                      <span className="text-[10px] text-slate-400">Min: {item.estoqueMinimo}</span>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setActiveTab('estoque')} 
                  className="w-full text-center py-2 border border-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition rounded-lg"
                >
                  Gerenciar Estoque / Reposição
                </button>
              </div>
            )}
          </div>

          {/* Atalhos rápidos */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/50 p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button 
                onClick={() => setActiveTab('alunos')} 
                className="p-3 bg-white hover:bg-amber-500 hover:text-white border border-slate-200 rounded-lg transition text-left font-semibold text-slate-700 shadow-2xs"
              >
                Cadastrar Aluno
              </button>
              <button 
                onClick={() => setActiveTab('mensalidades')} 
                className="p-3 bg-white hover:bg-amber-500 hover:text-white border border-slate-200 rounded-lg transition text-left font-semibold text-slate-700 shadow-2xs"
              >
                Marcar Pagamento
              </button>
              <button 
                onClick={() => setActiveTab('graduacoes')} 
                className="p-3 bg-white hover:bg-amber-500 hover:text-white border border-slate-200 rounded-lg transition text-left font-semibold text-slate-700 shadow-2xs"
              >
                Exames de Faixa
              </button>
              <button 
                onClick={() => setActiveTab('familias')} 
                className="p-3 bg-white hover:bg-amber-500 hover:text-white border border-slate-200 rounded-lg transition text-left font-semibold text-slate-700 shadow-2xs"
              >
                Unidades Familiares
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
