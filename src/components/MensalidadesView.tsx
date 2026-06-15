import React, { useState } from 'react';
import { Mensalidade, Aluno, Familia } from '../types';
import { Plus, Search, Calendar, FileText, CheckCircle2, AlertCircle, Trash2, DollarSign, RefreshCw, X, AlertTriangle, ShieldCheck, PhoneCall, HelpCircle, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { PRECO_PLANOS } from '../constants';

interface MensalidadesViewProps {
  mensalidades: Mensalidade[];
  alunos: Aluno[];
  familias: Familia[];
  addMensalidade: (alunoId: string, competencia: string, valorOriginal: number, desconto: number, vencimento: string) => void;
  payMensalidade: (id: string, valorFinal: number, metodo: Mensalidade['formaPagamento']) => void;
  deleteMensalidade: (id: string) => void;
}

export function MensalidadesView({
  mensalidades,
  alunos,
  familias,
  addMensalidade,
  payMensalidade,
  deleteMensalidade
}: MensalidadesViewProps) {
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modal Pagamento
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [submittingPaymentFor, setSubmittingPaymentFor] = useState<Mensalidade | null>(null);
  const [valorFinalState, setValorFinalState] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState<Mensalidade['formaPagamento']>('Pix');

  // Modal Nova Mensalidade Avulsa
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newAlunoId, setNewAlunoId] = useState('');
  const [newCompetencia, setNewCompetencia] = useState('2026-06');
  const [newValorOriginal, setNewValorOriginal] = useState(0);
  const [newDesconto, setNewDesconto] = useState(0);
  const [newVencimento, setNewVencimento] = useState('2026-06-10');

  // Helper formula to compute full student price & custom deductions
  const calculateStudentCharges = (aluno: Aluno) => {
    const precoOriginal = aluno.valorMensalidade !== undefined ? aluno.valorMensalidade : (PRECO_PLANOS[aluno.plano] || 0);
    
    let totalDesconto = 0;
    let descMotivo = '';

    if (aluno.isento) {
      totalDesconto = precoOriginal;
      descMotivo = 'Exenção Integral (100% Isento)';
    } else if (aluno.bolsaParcial && aluno.bolsaParcial > 0) {
      totalDesconto = precoOriginal * (aluno.bolsaParcial / 100);
      descMotivo = `Bolsa de Estudos (${aluno.bolsaParcial}%)`;
    } else {
      // Regular charges, could have family discount and individual discount
      let familyDiscountVal = 0;
      if (aluno.familiaId) {
        const fam = familias.find(f => f.id === aluno.familiaId);
        if (fam) {
          const percent = fam.percentualDesconto || 0;
          familyDiscountVal = precoOriginal * (percent / 100);
        }
      }

      const individualDiscountVal = aluno.descontoIndividual || 0;
      totalDesconto = familyDiscountVal + individualDiscountVal;

      if (familyDiscountVal > 0 && individualDiscountVal > 0) {
        descMotivo = `Desconto Familiar + Individual (R$ ${individualDiscountVal.toFixed(2)})`;
      } else if (familyDiscountVal > 0) {
        descMotivo = 'Vínculo Familiar Ativo';
      } else if (individualDiscountVal > 0) {
        descMotivo = `Desconto Individual Manual (R$ ${individualDiscountVal.toFixed(2)})`;
      }
    }

    const valorFinal = Math.max(0, precoOriginal - totalDesconto);
    return {
      precoOriginal,
      totalDesconto,
      valorFinal,
      descMotivo
    };
  };

  // Auto Generator process complying with due-day preference & exact scholarships
  const handleGerarMensalidades = () => {
    const ativos = alunos.filter(a => a.ativo && !a.excluido);
    let countCriados = 0;

    ativos.forEach(aluno => {
      // Excluir duplicates
      const jaExiste = mensalidades.some(m => m.alunoId === aluno.id && m.competencia === selectedMonth);
      if (jaExiste) return;

      const { precoOriginal, totalDesconto } = calculateStudentCharges(aluno);
      const diaVenc = aluno.diaVencimentoPlanos || 10;
      const dataVencString = `${selectedMonth}-${String(diaVenc).padStart(2, '0')}`;

      addMensalidade(aluno.id, selectedMonth, precoOriginal, totalDesconto, dataVencString);
      countCriados++;
    });

    alert(`Geração Concluída! ${countCriados} fatura(s) planejadas criadas sob regras de isenção, descontos individuais e vencimento preferencial para o mês ${selectedMonth}.`);
  };

  const handleOpenPay = (mens: Mensalidade) => {
    setSubmittingPaymentFor(mens);
    const liquido = mens.valorOriginal - mens.desconto;
    setValorFinalState(liquido > 0 ? liquido : 0);
    
    const aluno = mens.alunoId ? alunos.find(a => a.id === mens.alunoId) : undefined;
    setFormaPagamento(aluno?.plano === 'TotalPass' ? 'TotalPass' : 'Pix');
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingPaymentFor) return;

    payMensalidade(submittingPaymentFor.id, valorFinalState, formaPagamento);
    setIsPayModalOpen(false);
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlunoId) {
      alert('Selecione o aluno do dojo.');
      return;
    }

    addMensalidade(newAlunoId, newCompetencia, newValorOriginal, newDesconto, newVencimento);
    setIsNewModalOpen(false);
  };

  const handleAlunoPlanoSelect = (id: string) => {
    setNewAlunoId(id);
    const alunoSelected = alunos.find(a => a.id === id);
    if (alunoSelected) {
      const { precoOriginal, totalDesconto } = calculateStudentCharges(alunoSelected);
      setNewValorOriginal(precoOriginal);
      setNewDesconto(totalDesconto);
      
      const prefDia = alunoSelected.diaVencimentoPlanos || 10;
      setNewVencimento(`${newCompetencia}-${String(prefDia).padStart(2, '0')}`);
    }
  };

  const handleDelete = (id: string, name: string, comp: string) => {
    if (confirm(`Remover mensalidade do aluno "${name}" de referência "${comp}"?`)) {
      deleteMensalidade(id);
    }
  };

  // Filter accounts
  const filteredMensalidades = mensalidades.filter(m => {
    const matchesMonth = m.competencia === selectedMonth;
    const aluno = alunos.find(a => a.id === m.alunoId);
    if (!aluno || aluno.excluido) return false;

    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'todos') {
      matchesStatus = m.status === statusFilter;
    }

    return matchesMonth && matchesSearch && matchesStatus;
  });

  // Collect overdue debits accounts
  const overdueInvoices = mensalidades.filter(m => {
    const aluno = alunos.find(a => a.id === m.alunoId);
    return m.status === 'atrasado' && aluno && !aluno.excluido;
  });

  const getPlanoText = (pl: string) => pl.replace('_', ' ');

  return (
    <div className="space-y-6">
      {/* Header card with balance summary */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-amber-500/20 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Secretaria de Contabilidade Geral</span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-white">Mensalidades & Cobranças</h2>
          <p className="text-xs text-slate-400">Automação de faturamento com controle preciso de isenções facultativas, convênios, bolsas parciais e abatimentos individuais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGerarMensalidades}
            className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 text-amber-400 font-extrabold px-3 py-2 rounded-xl transition shadow-xs text-xs hover:bg-slate-850"
            title="Lança faturas sob regras personalizadas (Desconto, Bolsa, Isenção, Dia Vencimento) para alunos aptos"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" /> Faturar Alunos Ativos ({selectedMonth})
          </button>
          
          <button
            onClick={() => {
              setNewAlunoId('');
              setNewValorOriginal(0);
              setNewDesconto(0);
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2 rounded-xl transition shadow-xs text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950" /> Fatura Extraordinária
          </button>
        </div>
      </div>

      {/* Seletor de Competência e Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Mês Referência (Competência) */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 min-w-[16px]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
          >
            <option value="2026-05">Maio de 2026</option>
            <option value="2026-06">Junho de 2026</option>
            <option value="2026-07">Julho de 2026</option>
            <option value="2026-08">Agosto de 2026</option>
          </select>
        </div>

        {/* Busca por Aluno */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
          />
        </div>

        {/* Filtragem de Status */}
        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
          >
            <option value="todos">Todos os Status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado (Controle Cobrança)</option>
          </select>
        </div>
      </div>

      {/* Grid de Balanço Rápido do Mês Selecionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Lançado</p>
          <p className="text-base font-extrabold text-slate-800">
            R$ {filteredMensalidades.reduce((acc, cr) => acc + (cr.valorOriginal - (cr.desconto || 0)), 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Recebido</p>
          <p className="text-base font-extrabold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            R$ {filteredMensalidades.filter(m => m.status === 'pago').reduce((acc, cr) => acc + (cr.valorFinal || 0), 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pendente</p>
          <p className="text-base font-extrabold text-amber-600">
            R$ {filteredMensalidades.filter(m => m.status === 'pendente').reduce((acc, cr) => acc + (cr.valorOriginal - (cr.desconto || 0)), 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Atrasado / Inadimplência</p>
          <p className="text-base font-extrabold text-red-600 flex items-center gap-1">
            <TrendingDown className="w-4 h-4 animate-pulse" />
            R$ {filteredMensalidades.filter(m => m.status === 'atrasado').reduce((acc, cr) => acc + (cr.valorOriginal - (cr.desconto || 0)), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE TRABALHO + PAINEL DE INADIMPLENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Tabela de Mensalidades (9 Colunas no desktop) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Faturas de Competência {selectedMonth}</span>
            <span className="text-xs bg-slate-250 text-slate-600 font-bold px-2 py-0.5 rounded-lg">{filteredMensalidades.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Aluno / Fator de Descontos</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Líquido Cobrado</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMensalidades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      Nenhuma mensalidade foi gerada ou encontrada para {selectedMonth}. 
                      <p className="text-slate-500 max-w-sm mx-auto mt-1">Experimente clicar em <b>"Faturar Alunos Ativos"</b> para criar a listagem de hoje automaticamente.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMensalidades.map(mens => {
                    const aluno = alunos.find(a => a.id === mens.alunoId);
                    const valorLiquido = mens.valorOriginal - (mens.desconto || 0);

                    // Reconstruct discount reason display badge name
                    let detailsLabel = '';
                    if (aluno) {
                      if (aluno.isento) detailsLabel = 'Isenção Especial';
                      else if (aluno.bolsaParcial) detailsLabel = `Bolsista ${aluno.bolsaParcial}%`;
                      else if (aluno.descontoIndividual || aluno.familiaId) {
                        const hasF = aluno.familiaId ? 'Familia ' : '';
                        const hasInd = aluno.descontoIndividual ? `+ Ind. R$ ${aluno.descontoIndividual}` : '';
                        detailsLabel = `${hasF}${hasInd}`;
                      }
                    }
                    
                    return (
                      <tr key={mens.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{aluno?.nome || 'Aluno Removido'}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <span>Plano: {aluno ? getPlanoText(aluno.plano) : ''}</span>
                              {detailsLabel && (
                                <>
                                  <span>•</span>
                                  <span className="font-black text-amber-600 bg-amber-50 px-1 rounded">{detailsLabel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          <p className="font-semibold">{new Date(mens.vencimento).toLocaleDateString('pt-BR')}</p>
                          {mens.dataPagamento && (
                            <p className="text-emerald-600 text-[10px]">Recebido: {new Date(mens.dataPagamento).toLocaleDateString('pt-BR')} via <b>{mens.formaPagamento}</b></p>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">
                            R$ {(valorLiquido > 0 ? valorLiquido : 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-400 line-through">Plano: R$ {mens.valorOriginal.toFixed(2)}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            mens.status === 'pago'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : mens.status === 'pendente'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-105 shadow-2xs animate-pulse'
                          }`}>
                            {mens.status === 'pago' ? (
                              <><ShieldCheck className="w-3 h-3 text-emerald-600" /> Pago</>
                            ) : mens.status === 'pendente' ? (
                              <><AlertTriangle className="w-3 h-3" /> Aberto</>
                            ) : (
                              <><AlertSquare className="w-3 h-3" /> Atrasado</>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {mens.status !== 'pago' && (
                              <button
                                onClick={() => handleOpenPay(mens)}
                                className="p-1 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-extrabold hover:bg-emerald-100 transition inline-flex items-center gap-0.5"
                              >
                                <DollarSign className="w-3 h-3" /> Dar Baixa
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(mens.id, aluno?.nome || '', mens.competencia)}
                              className="p-1 rounded-lg border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-slate-50 hover:border-slate-200 transition"
                              title="Remover Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel Relatório de Inadimplentes (4 Colunas no desktop) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-red-105 shadow-3xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <div className="p-1 bg-red-100 rounded-lg text-red-600 animate-bounce">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Inadimplentes da Academia</h4>
              <p className="text-[10px] text-slate-400">Total geral de faturas com faturamento "Atrasado"</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin">
            {overdueInvoices.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                Sem pendências ou inadimplentes ativos. Ótima gestão!
              </div>
            ) : (
              overdueInvoices.map((inv) => {
                const al = alunos.find(a => a.id === inv.alunoId);
                const liq = inv.valorOriginal - inv.desconto;

                return (
                  <div key={inv.id} className="p-3 bg-red-500/5 hover:bg-red-50 border border-red-100 rounded-xl space-y-2 text-xs transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{al?.nome}</p>
                        <p className="text-[10px] text-slate-500">{al?.faixaAtual} • Ref: {inv.competencia}</p>
                      </div>
                      <span className="font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                        R$ {liq.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-red-500/10">
                      <span className="text-[10px] text-red-500 font-bold">Venceu em: {new Date(inv.vencimento).toLocaleDateString('pt-BR')}</span>
                      
                      {al?.telefone && (
                        <a 
                          href={`https://wa.me/55${al.telefone.replace(/\D/g, '')}?text=Olá ${al.nome}, identificamos uma pendência de mensalidade referente a ${inv.competencia} no Garra de Águia. Favor entrar em contato para regularização.`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-emerald-600 font-bold text-white text-[9px] px-2 py-1 rounded hover:bg-emerald-700 transition uppercase"
                        >
                          <PhoneCall className="w-2.5 h-2.5" /> Cobrar WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Pagamento / Baixa */}
      {isPayModalOpen && submittingPaymentFor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold font-serif text-white">Quitação de Mensalidade</h3>
                <p className="text-xs text-slate-400">Aluno: {alunos.find(a => a.id === submittingPaymentFor.alunoId)?.nome}</p>
              </div>
              <button 
                onClick={() => setIsPayModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Detalhamento Financeiro</p>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Plano contratado:</span>
                  <span>R$ {submittingPaymentFor.valorOriginal.toFixed(2)}</span>
                </div>
                {submittingPaymentFor.desconto > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-750 font-medium">
                    <span>Abatimentos/Isenções/Bolsas:</span>
                    <span>- R$ {submittingPaymentFor.desconto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-200">
                  <span>Líquido Ajustado:</span>
                  <span>R$ {(submittingPaymentFor.valorOriginal - submittingPaymentFor.desconto).toFixed(2)}</span>
                </div>
              </div>

              {/* Valor Pago real */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Valor Recebido Real (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={valorFinalState}
                  onChange={(e) => setValorFinalState(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                />
              </div>

              {/* Método de Pagamento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Canal de Recebimento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as Mensalidade['formaPagamento'])}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                >
                  <option value="Pix">Pix (Transferência instantânea)</option>
                  <option value="Dinheiro">Dinheiro Físico</option>
                  <option value="Cartão">Cartão (Crédito/Débito)</option>
                  <option value="TotalPass">TotalPass (Convênio de benefício)</option>
                  <option value="Dinheiro/Pix">Dinheiro/Pix (Misto)</option>
                </select>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
                >
                  Validar Baixa no Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Mensalidade Avulsa */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold font-serif text-white">Adicionar Cobrança Extraordinária</h3>
                <p className="text-xs text-slate-400">Lançamento de taxas avulsas, filiações ou uniformes</p>
              </div>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="p-6 space-y-4">
              {/* Seleção do Aluno */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Praticante Destinatário *</label>
                <select
                  required
                  value={newAlunoId || ''}
                  onChange={(e) => handleAlunoPlanoSelect(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Selecione o Praticante</option>
                  {alunos.filter(a => a.ativo && !a.excluido).map(al => (
                    <option key={al.id} value={al.id}>{al.nome} ({al.plano.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              {/* Mês Referência */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Mês de Referência (Competência) *</label>
                <input
                  type="month"
                  required
                  value={newCompetencia}
                  onChange={(e) => setNewCompetencia(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              {/* Valor Original */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Valor Cobrança (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newValorOriginal}
                  onChange={(e) => setNewValorOriginal(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              {/* Desconto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Dedução ou Isenção (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDesconto}
                  onChange={(e) => setNewDesconto(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              {/* Data Vencimento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Data Limite de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={newVencimento}
                  onChange={(e) => setNewVencimento(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
                >
                  Registrar Cobrança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface AlertSquareProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

function AlertSquare({ className, ...props }: AlertSquareProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
