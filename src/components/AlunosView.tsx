import React, { useState } from 'react';
import { Aluno, Familia, GraduacaoFaixa, CategoriaPlano, AlunoHistoricoItem, SolicitacaoMatricula } from '../types';
import { Plus, Search, Edit2, Trash2, Users, Check, X, ShieldAlert, Camera, Eye, AlertTriangle, UserCheck, Calendar, Activity, CreditCard, Heart, Phone, FileText } from 'lucide-react';
import { PRECO_PLANOS, FAIXAS_KUNG_FU, FAIXAS_BOXE_CHINES, FAIXAS_TAI_CHI } from '../constants';

// Mock list of martial art avatars for rapid mockup usage
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200'
];

interface AlunosViewProps {
  alunos: Aluno[];
  familias: Familia[];
  addAluno: (aluno: Omit<Aluno, 'id'>) => void;
  updateAluno: (aluno: Aluno) => void;
  deleteAluno: (id: string, motivo?: string) => void;
  solicitacoesMatricula?: SolicitacaoMatricula[];
  aprovarSolicitacaoMatricula?: (id: string) => Promise<void>;
  rejeitarSolicitacaoMatricula?: (id: string) => Promise<void>;
}

const FAIXAS: GraduacaoFaixa[] = [...FAIXAS_KUNG_FU, ...FAIXAS_BOXE_CHINES];

const PLANOS: { value: CategoriaPlano; label: string; desc: string }[] = [
  { value: '1_aula', label: '1 Aula / semana', desc: 'R$ 120,00' },
  { value: '2_aulas', label: '2 Aulas / semana', desc: 'R$ 150,00' },
  { value: '3_aulas', label: '3 Aulas / semana', desc: 'R$ 180,00' },
  { value: '4_aulas', label: '4 Aulas / semana', desc: 'R$ 210,00' },
  { value: 'TotalPass', label: 'TotalPass', desc: 'Repasse corporativo' },
  { value: 'Avulsa', label: 'Aula Avulsa', desc: 'R$ 40,00 por aula' }
];

export function AlunosView({
  alunos,
  familias,
  addAluno,
  updateAluno,
  deleteAluno,
  solicitacoesMatricula = [],
  aprovarSolicitacaoMatricula,
  rejeitarSolicitacaoMatricula
}: AlunosViewProps) {
  const [currentTab, setCurrentTab] = useState<'ativos' | 'solicitacoes'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('todos');
  const [selectedFaixaFilter, setSelectedFaixaFilter] = useState<string>('todos');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingAluno, setViewingAluno] = useState<Aluno | null>(null);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [faixaAtual, setFaixaAtual] = useState<GraduacaoFaixa>('Faixa Branca (Preparatória)');
  const [plano, setPlano] = useState<CategoriaPlano>('2_aulas');
  const [valorMensalidade, setValorMensalidade] = useState<number>(150);
  const [dataMatricula, setDataMatricula] = useState(new Date().toISOString().substring(0, 10));
  const [ativo, setAtivo] = useState(true);
  const [familiaId, setFamiliaId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Phase 3 student fields
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoDocumentoUrl, setFotoDocumentoUrl] = useState('');
  const [restricoesMedicas, setRestricoesMedicas] = useState('');
  const [contatoEmergencia, setContatoEmergencia] = useState('');
  const [responsavelFinanceiro, setResponsavelFinanceiro] = useState('');
  const [descontoIndividual, setDescontoIndividual] = useState<number>(0);
  const [bolsaParcial, setBolsaParcial] = useState<number>(0);
  const [isento, setIsento] = useState(false);
  const [diaVencimentoPlanos, setDiaVencimentoPlanos] = useState<number>(10);

  // New official graduation tracking properties states
  const [modalidades, setModalidades] = useState<string[]>(['Kung Fu Garra de Águia']);
  const [faixasPorModalidade, setFaixasPorModalidade] = useState<Record<string, string>>({});
  const [dataUltimaGraduacao, setDataUltimaGraduacao] = useState(new Date().toISOString().substring(0, 10));
  const [horasAcumuladas, setHorasAcumuladas] = useState<number>(0);
  const [tempoNaFaixaMeses, setTempoNaFaixaMeses] = useState<number>(0);
  const [observacoesGraduacao, setObservacoesGraduacao] = useState('');

  const openNewModal = () => {
    setEditingAluno(null);
    setNome('');
    setCpf('');
    setRg('');
    setDataNascimento('');
    setTelefone('');
    setEmail('');
    setEndereco('');
    setFaixaAtual('Preparatória - Branca');
    setPlano('2_aulas');
    setValorMensalidade(150);
    setDataMatricula(new Date().toISOString().substring(0, 10));
    setAtivo(true);
    setFamiliaId('');
    setObservacoes('');

    // Phase 3 resets
    setFotoUrl('');
    setFotoDocumentoUrl('');
    setRestricoesMedicas('');
    setContatoEmergencia('');
    setResponsavelFinanceiro('');
    setDescontoIndividual(0);
    setBolsaParcial(0);
    setIsento(false);
    setDiaVencimentoPlanos(10);

    // Graduation resets
    setModalidades(['Kung Fu Garra de Águia']);
    setFaixasPorModalidade({ 'Kung Fu Garra de Águia': 'Preparatória - Branca' });
    setDataUltimaGraduacao(new Date().toISOString().substring(0, 10));
    setHorasAcumuladas(0);
    setTempoNaFaixaMeses(0);
    setObservacoesGraduacao('');

    setIsModalOpen(true);
  };

  const openEditModal = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setNome(aluno.nome);
    setCpf(aluno.cpf || '');
    setRg(aluno.rg || '');
    setDataNascimento(aluno.dataNascimento || '');
    setTelefone(aluno.telefone);
    setEmail(aluno.email);
    setEndereco(aluno.endereco || '');
    setFaixaAtual(aluno.faixaAtual || 'Preparatória - Branca');
    setPlano(aluno.plano);
    setValorMensalidade(aluno.valorMensalidade || PRECO_PLANOS[aluno.plano] || 0);
    setDataMatricula(aluno.dataMatricula);
    setAtivo(aluno.ativo);
    setFamiliaId(aluno.familiaId || '');
    setObservacoes(aluno.observacoes || '');

    // Phase 3 loads
    setFotoUrl(aluno.fotoUrl || '');
    setFotoDocumentoUrl(aluno.documentosUrls?.[0] || '');
    setRestricoesMedicas(aluno.restricoesMedicas || '');
    setContatoEmergencia(aluno.contatoEmergencia || '');
    setResponsavelFinanceiro(aluno.responsavelFinanceiro || '');
    setDescontoIndividual(aluno.descontoIndividual || 0);
    setBolsaParcial(aluno.bolsaParcial || 0);
    setIsento(aluno.isento || false);
    setDiaVencimentoPlanos(aluno.diaVencimentoPlanos || 10);

    // Graduation loads
    const initialModalities = aluno.modalidades || (aluno.modalidade ? [aluno.modalidade] : ['Kung Fu Garra de Águia']);
    setModalidades(initialModalities);
    setFaixasPorModalidade(aluno.faixasPorModalidade || (aluno.modalidade && aluno.faixaAtual ? { [aluno.modalidade]: aluno.faixaAtual } : {}));
    setDataUltimaGraduacao(aluno.dataUltimaGraduacao || aluno.dataMatricula || new Date().toISOString().substring(0, 10));
    setHorasAcumuladas(aluno.horasAcumuladas || 0);
    setTempoNaFaixaMeses(aluno.tempoNaFaixaMeses || 0);
    setObservacoesGraduacao(aluno.observacoesGraduacao || '');

    setIsModalOpen(true);
  };

  const handlePlanoChange = (novoPlano: CategoriaPlano) => {
    setPlano(novoPlano);
    // Auto populate valorMensalidade default amount when plan changes
    const valorSugerido = PRECO_PLANOS[novoPlano] || 0;
    setValorMensalidade(valorSugerido);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Por favor, informe o nome do aluno.');
      return;
    }

    const payload = {
      nome,
      cpf,
      rg,
      dataNascimento,
      telefone,
      email,
      endereco,
      faixaAtual,
      plano,
      valorMensalidade,
      dataMatricula,
      ativo,
      familiaId: familiaId || undefined,
      observacoes: observacoes || undefined,

      // Phase 3 properties mapping
      fotoUrl: fotoUrl || undefined,
      documentosUrls: fotoDocumentoUrl ? [fotoDocumentoUrl] : [],
      restricoesMedicas: restricoesMedicas || undefined,
      contatoEmergencia: contatoEmergencia || undefined,
      responsavelFinanceiro: responsavelFinanceiro || undefined,
      descontoIndividual: descontoIndividual || undefined,
      bolsaParcial: bolsaParcial || undefined,
      isento: isento || false,
      diaVencimentoPlanos: diaVencimentoPlanos || 10,
      historicoAlteracoes: editingAluno ? editingAluno.historicoAlteracoes : [],

      // Graduation Tracking integration
      modalidades,
      faixasPorModalidade,
      modalidade: modalidades[0] || 'Kung Fu Garra de Águia',
      dataUltimaGraduacao,
      horasAcumuladas,
      tempoNaFaixaMeses,
      observacoesGraduacao: observacoesGraduacao || undefined
    };

    if (editingAluno) {
      updateAluno({
        ...payload,
        id: editingAluno.id
      } as Aluno);
    } else {
      addAluno(payload);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja efetuar a exclusão lógica do aluno "${name}"? Os registros financeiros e históricos serão mantidos no banco de dados.`)) {
      const motivo = prompt(
        'Por favor, informe o motivo da exclusão lógica do aluno (ex: "Desistência", "Incompatibilidade de horários", "Mudou de cidade", etc.):',
        'Incompatibilidade de horários'
      );
      if (motivo !== null) {
        deleteAluno(id, motivo || 'Não informado');
      }
    }
  };

  // filtrar
  const filteredAlunos = alunos.filter(aluno => {
    if (aluno.excluido) return false;
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          aluno.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          aluno.telefone.includes(searchTerm) ||
                          (aluno.cpf && aluno.cpf.includes(searchTerm));
    const matchesPlan = selectedPlanFilter === 'todos' || aluno.plano === selectedPlanFilter;
    const matchesFaixa = selectedFaixaFilter === 'todos' || aluno.faixaAtual === selectedFaixaFilter;

    return matchesSearch && matchesPlan && matchesFaixa;
  });

  // get badge color for faixa
  const getFaixaBadge = (faixa: GraduacaoFaixa) => {
    let style = 'bg-slate-100 text-slate-800 border-slate-200';
    const fStr = String(faixa);
    if (fStr.includes('Amarela')) style = 'bg-yellow-50 text-yellow-800 border-yellow-200';
    else if (fStr.includes('Laranja')) style = 'bg-orange-50 text-orange-800 border-orange-200';
    else if (fStr.includes('Verde')) style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    else if (fStr.includes('Azul')) style = 'bg-blue-50 text-blue-800 border-blue-200';
    else if (fStr.includes('Roxa') || fStr.includes('Vermelha')) style = 'bg-red-50 text-red-800 border-red-200';
    else if (fStr.includes('Marrom')) style = 'bg-amber-100 text-amber-900 border-amber-300';
    else if (fStr.includes('Preta') || fStr.includes('Dhuen')) style = 'bg-slate-900 text-amber-405 text-white border-slate-950';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
        {faixa}
      </span>
    );
  };

  const getPlanoText = (cat: CategoriaPlano) => {
    if (cat === 'TotalPass') return 'TotalPass';
    if (cat === 'Avulsa') return 'Aula Avulsa';
    return `${cat.replace('_', ' ')} / semana`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-serif">Alunos e Matrículas</h2>
          <p className="text-sm text-slate-400 font-medium">Controle completo de matrículas, faixas, planos de treinamento e pré-cadastros pendentes</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl transition shadow-xs text-sm"
        >
          <Plus className="w-4 h-4" /> Cadastrar Aluno
        </button>
      </div>

      {/* Sub-Navegação de Matrículas */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setCurrentTab('ativos')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all ${
            currentTab === 'ativos'
              ? 'border-red-850 border-red-800 text-red-900 bg-red-50/10'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Alunos Ativos ({alunos.filter(a => !a.excluido).length})
        </button>
        <button
          onClick={() => setCurrentTab('solicitacoes')}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            currentTab === 'solicitacoes'
              ? 'border-red-850 border-red-800 text-red-900 bg-red-50/10'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Pré-Cadastros de Alunos
          {solicitacoesMatricula.filter(s => s.status === 'pendente').length > 0 && (
            <span className="bg-red-800 text-white font-mono text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              {solicitacoesMatricula.filter(s => s.status === 'pendente').length}
            </span>
          )}
        </button>
      </div>

      {currentTab === 'ativos' ? (
        <>
          {/* Filtros e Busca */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-12 lg:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, email, cpf ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
          />
        </div>

        <div className="md:col-span-6 lg:col-span-3">
          <select
            value={selectedPlanFilter}
            onChange={(e) => setSelectedPlanFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
          >
            <option value="todos">Todos os Planos</option>
            <option value="1_aula">1 Aula / semana</option>
            <option value="2_aulas">2 Aulas / semana</option>
            <option value="3_aulas">3 Aulas / semana</option>
            <option value="4_aulas">4 Aulas / semana</option>
            <option value="TotalPass">TotalPass</option>
            <option value="Avulsa">Aula Avulsa</option>
          </select>
        </div>

        <div className="md:col-span-6 lg:col-span-3">
          <select
            value={selectedFaixaFilter}
            onChange={(e) => setSelectedFaixaFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
          >
            <option value="todos">Todas as Graduações</option>
            {FAIXAS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-12 lg:col-span-1 text-center text-xs text-slate-400 font-semibold uppercase">
          {filteredAlunos.length} Alunos
        </div>
      </div>

      {/* Lista de Alunos */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-3xs overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Nome / Info de Contato</th>
              <th className="p-4">CPF / RG / Endereço</th>
              <th className="p-4">Graduação</th>
              <th className="p-4">Plano / Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4">Matrícula</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredAlunos.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Nenhum aluno cadastrado que atenda aos critérios.
                </td>
              </tr>
            ) : (
              filteredAlunos.map(aluno => {
                const familia = familias.find(f => f.id === aluno.familiaId);
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Profile Image with Fallback */}
                        <div className="relative shrink-0">
                          <img 
                            src={aluno.fotoUrl || '/logo_oficial.png'} 
                            alt={aluno.nome}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Fallback in case of faulty URLs
                              (e.target as HTMLImageElement).src = '/logo_oficial.png';
                            }}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-3xs"
                          />
                          {aluno.restricoesMedicas && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full" title={`Restrição: ${aluno.restricoesMedicas}`}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{aluno.nome}</span>
                            {aluno.plano === 'TotalPass' && (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border border-emerald-200">
                                TotalPass
                              </span>
                            )}
                            {aluno.plano === 'Avulsa' && (
                              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border border-indigo-200">
                                Avulsa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{aluno.email || 'Sem e-mail'} • {aluno.telefone}</p>
                          {familia && (
                            <p className="text-[10px] text-amber-700 flex items-center gap-1 font-semibold">
                              <Users className="w-3 h-3" />
                              Família: {familia.nomeFamilia} ({familia.percentualDesconto}% Desc)
                            </p>
                          )}
                          {aluno.restricoesMedicas && (
                            <p className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                              <Activity className="w-3 h-3 text-red-500" />
                              Médico: {aluno.restricoesMedicas}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <p><span className="font-medium">CPF:</span> {aluno.cpf || 'N/D'}</p>
                        <p><span className="font-medium">RG:</span> {aluno.rg || 'N/D'}</p>
                        <p className="text-slate-400 text-[11px] truncate max-w-[180px]" title={aluno.endereco}>{aluno.endereco || 'Sem endereço'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        {(aluno.modalidades || [aluno.modalidade || 'Kung Fu Garra de Águia']).map(mod => {
                          const belt = (aluno.faixasPorModalidade?.[mod]) || (aluno.faixaAtual) || 'Branca';
                          return (
                            <div key={mod} className="flex flex-col items-start gap-0.5 border border-slate-100 bg-slate-50/30 p-1 px-1.5 rounded-lg max-w-[150px]">
                              <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest">{mod}</span>
                              {getFaixaBadge(belt as any)}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-700">{getPlanoText(aluno.plano)}</p>
                        <p className="text-xs font-bold text-emerald-600">
                          R$ {(aluno.valorMensalidade !== undefined ? aluno.valorMensalidade : PRECO_PLANOS[aluno.plano]).toFixed(2)} / mês
                        </p>
                        {aluno.isento && (
                          <span className="inline-flex text-[9px] bg-red-100 text-red-800 font-bold px-1 rounded">Isento</span>
                        )}
                        {aluno.bolsaParcial ? (
                          <span className="inline-flex text-[9px] bg-blue-100 text-blue-800 font-bold px-1 rounded">Bolsista {aluno.bolsaParcial}%</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        aluno.ativo 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {aluno.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {new Date(aluno.dataMatricula).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setViewingAluno(aluno);
                            setIsDetailOpen(true);
                          }}
                          className="p-1 px-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 text-slate-700 hover:text-amber-700 hover:border-amber-200 transition inline-flex items-center gap-0.5 text-xs font-medium"
                          title="Ficha Completa e Histórico de Alterações"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ficha
                        </button>
                        <button
                          onClick={() => openEditModal(aluno)}
                          className="p-1 px-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition inline-flex items-center gap-0.5 text-xs font-medium"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(aluno.id, aluno.nome)}
                          className="p-1 px-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-600 transition inline-flex items-center gap-0.5 text-xs font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
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
    </>
  ) : (
    /* Painel de Matrículas Pendentes (Pré-cadastros) */
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico de Solicitações de Matrícula</p>
          <p className="text-xs text-slate-400 font-medium">Controle os pré-cadastros enviados pelos novos praticantes no portal</p>
        </div>
        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-3 py-1 rounded-full">
          {solicitacoesMatricula.filter(s => s.status === 'pendente').length} pendentes de análise
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-3xs overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
              <th className="p-4">Dados do Aluno</th>
              <th className="p-4">CPF / Data de Nascimento</th>
              <th className="p-4">Modalidades Desejadas</th>
              <th className="p-4">Solicitado Em</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações de Aprovação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {solicitacoesMatricula.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Nenhuma solicitação de matrícula encontrada no sistema.
                </td>
              </tr>
            ) : (
              solicitacoesMatricula.map((sol) => (
                <tr key={sol.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900">{sol.nome}</p>
                      <p className="text-xs text-slate-550 text-slate-500 font-mono flex items-center gap-1">
                        <span className="font-bold text-slate-400">E-mail:</span> {sol.email}
                      </p>
                      <p className="text-xs text-slate-550 text-slate-500 font-mono flex items-center gap-1">
                        <span className="font-bold text-slate-400">Tel:</span> {sol.telefone}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-705 text-slate-700 font-mono">
                        <span className="font-bold text-slate-400">CPF:</span> {sol.cpf}
                      </p>
                      <p className="text-xs text-slate-705 text-slate-700 font-mono">
                        <span className="font-bold text-slate-400">Nascimento:</span> {sol.dataNascimento ? new Date(sol.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {sol.modalidades && sol.modalidades.length > 0 ? (
                        sol.modalidades.map((mod) => (
                          <span key={mod} className="bg-red-50 text-red-900 border border-red-100 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                            {mod}
                          </span>
                        ))
                      ) : (
                        <span className="bg-slate-50 text-slate-605 text-slate-605 text-slate-600 border border-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                          Kung Fu Garra de Águia
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-550 text-slate-500 font-mono">
                    {sol.dataSolicitacao ? new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR') : 'Desconhecida'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                      sol.status === 'pendente'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : sol.status === 'aprovado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-250 border-emerald-200'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}>
                      {sol.status === 'pendente' && '📍 Pendente'}
                      {sol.status === 'aprovado' && '✅ Aprovado'}
                      {sol.status === 'rejeitado' && '❌ Rejeitado'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {sol.status === 'pendente' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            if (confirm(`Deseja aprovar a solicitação de pré-cadastro de ${sol.nome}? Isso ativará o acesso do aluno ao sistema.`)) {
                              try {
                                if (aprovarSolicitacaoMatricula) {
                                  await aprovarSolicitacaoMatricula(sol.id);
                                  alert('Pré-cadastro aprovado com sucesso! O Aluno agora possui acesso completo ao Portal.');
                                }
                              } catch (err: any) {
                                alert('Erro na aprovação: ' + err.message);
                              }
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-lg transition shadow-xs inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Aprovar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Deseja rejeitar a solicitação de matrícula de ${sol.nome}?`)) {
                              try {
                                if (rejeitarSolicitacaoMatricula) {
                                  await rejeitarSolicitacaoMatricula(sol.id);
                                  alert('Solicitação rejeitada com sucesso.');
                                }
                              } catch (err: any) {
                                alert('Erro ao rejeitar: ' + err.message);
                              }
                            }
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-extrabold text-xs px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Rejeitar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Análise Concluída</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold font-serif text-white">
                  {editingAluno ? 'Editar Cadastro do Aluno' : 'Cadastrar Novo Aluno'}
                </h3>
                <p className="text-xs text-slate-400">Preencha as informações do praticante de Garra de Águia</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="ex: Carlos Eduardo Santos"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="123.456.789-00"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* RG */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">RG</label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@exemplo.com"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(13) 9XXXX-XXXX"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Nascimento */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Data de Nascimento</label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Matrícula */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Data de Matrícula</label>
                  <input
                    type="date"
                    value={dataMatricula}
                    onChange={(e) => setDataMatricula(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Endereço */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Endereço Completo</label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Av. Presidente Kennedy, 1000 - Praia Grande/SP"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Plano Selecionado */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Plano de Aulas</label>
                  <select
                    value={plano}
                    onChange={(e) => handlePlanoChange(e.target.value as CategoriaPlano)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                  >
                    {PLANOS.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label} ({p.desc})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor Mensalidade Personalizável */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Valor Cobrado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorMensalidade}
                    onChange={(e) => setValorMensalidade(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Modalidades (Seleção Múltipla) */}
                <div className="sm:col-span-2 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wider">Modalidades Matriculadas *</label>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {[
                      { key: 'Kung Fu Garra de Águia', defaultFaixa: 'Preparatória - Branca' },
                      { key: 'Boxe Chinês', defaultFaixa: 'Branca' },
                      { key: 'Tai Chi Chuan', defaultFaixa: 'Branca' }
                    ].map(({ key, defaultFaixa }) => {
                      const isChecked = modalidades.includes(key);
                      return (
                        <label key={key} className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              let nextModalities = [];
                              if (isChecked) {
                                if (modalidades.length === 1) {
                                  alert('O aluno deve possuir ao menos uma modalidade ativa.');
                                  return;
                                }
                                nextModalities = modalidades.filter(m => m !== key);
                              } else {
                                nextModalities = [...modalidades, key];
                              }
                              setModalidades(nextModalities);
                              
                              // Ensure faixasPorModalidade is populated for selected modality
                              const nextFaixas = { ...faixasPorModalidade };
                              nextModalities.forEach(m => {
                                if (!nextFaixas[m]) {
                                  nextFaixas[m] = m === 'Kung Fu Garra de Águia' ? 'Preparatória - Branca' : 'Branca';
                                }
                              });
                              setFaixasPorModalidade(nextFaixas);
                              
                              // Keep legacy faixaAtual matching primary modality
                              const primary = nextModalities[0];
                              if (primary) {
                                setFaixaAtual((nextFaixas[primary] || (primary === 'Kung Fu Garra de Águia' ? 'Preparatória - Branca' : 'Branca')) as any);
                              }
                            }}
                            className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                          />
                          {key}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Graduações Independentes por Modalidade Selecionada */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <span className="sm:col-span-2 text-xs font-bold text-amber-900 uppercase tracking-widest block">Graduações por Modalidade Ativa</span>
                  
                  {modalidades.map(modName => {
                    const currentFaixas = modName === 'Kung Fu Garra de Águia' 
                      ? FAIXAS_KUNG_FU 
                      : (modName === 'Boxe Chinês' ? FAIXAS_BOXE_CHINES : FAIXAS_TAI_CHI);
                    const currentFaixa = faixasPorModalidade[modName] || (modName === 'Kung Fu Garra de Águia' ? 'Preparatória - Branca' : 'Branca');
                    
                    return (
                      <div key={modName} className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block uppercase truncate">{modName}</label>
                        <select
                          value={currentFaixa}
                          onChange={(e) => {
                            const val = e.target.value;
                            const nextFaixas = { ...faixasPorModalidade, [modName]: val };
                            setFaixasPorModalidade(nextFaixas);
                            
                            // If this is the primary/first modality, sync with legacy top-level state
                            if (modalidades[0] === modName) {
                              setFaixaAtual(val as any);
                            }
                          }}
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                        >
                          {currentFaixas.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Data Última Graduação */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Data Última Graduação</label>
                  <input
                    type="date"
                    value={dataUltimaGraduacao}
                    onChange={(e) => setDataUltimaGraduacao(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                  />
                </div>

                {/* Horas Acumuladas */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Horas Acumuladas</label>
                  <input
                    type="number"
                    min="0"
                    value={horasAcumuladas}
                    onChange={(e) => setHorasAcumuladas(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                  />
                </div>

                {/* Tempo na Faixa */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Tempo na Faixa (meses)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempoNaFaixaMeses}
                    onChange={(e) => setTempoNaFaixaMeses(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                  />
                </div>

                {/* Observações de Graduação */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Observações de Graduação</label>
                  <textarea
                    rows={2}
                    value={observacoesGraduacao}
                    onChange={(e) => setObservacoesGraduacao(e.target.value)}
                    placeholder="Parecer do instrutor, observações sobre desempenho técnico, etc."
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 bg-white font-sans"
                  />
                </div>

                {/* Vínculo de Família */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Unidade Familiar (Desconto)</label>
                  <select
                    value={familiaId}
                    onChange={(e) => setFamiliaId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                  >
                    <option value="">Nenhuma Família Vinculada</option>
                    {familias.map(fam => (
                      <option key={fam.id} value={fam.id}>
                        {fam.nomeFamilia} (Desconto: {fam.percentualDesconto}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ativo? */}
                <div className="space-y-1 flex items-center h-full pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ml-3 text-sm font-bold text-slate-700">Aluno Ativo no Sistema</span>
                  </label>
                </div>

                {/* Ativo? */}
                <div className="space-y-1 flex items-center h-full pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ml-3 text-sm font-bold text-slate-700">Aluno Ativo no Sistema</span>
                  </label>
                </div>

                {/* Preferred Due Day */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Dia de Vencimento Preferencial</label>
                  <select
                    value={diaVencimentoPlanos}
                    onChange={(e) => setDiaVencimentoPlanos(parseInt(e.target.value) || 10)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                  >
                    <option value={5}>Dia 05</option>
                    <option value={10}>Dia 10 (Padrão)</option>
                    <option value={15}>Dia 15</option>
                    <option value={20}>Dia 20</option>
                    <option value={25}>Dia 25</option>
                  </select>
                </div>

                {/* Profile Photo Selection */}
                <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-600 block uppercase flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    Adicionar Foto do Aluno
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="Cole um link de imagem do aluno ou escolha abaixo..."
                      className="grow w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                    />
                    <div className="flex gap-1.5 shrink-0">
                      {PRESET_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFotoUrl(av)}
                          className={`w-10 h-10 rounded-full border-2 overflow-hidden transition ${fotoUrl === av ? 'border-amber-500 scale-105' : 'border-slate-200 hover:border-slate-300'}`}
                          title={`Selecionar Avatar ${idx + 1}`}
                        >
                          <img src={av} alt="Preset Avatar" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Document Photo URL */}
                <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-600 block uppercase flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Foto de Documento (RG / CPF)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={fotoDocumentoUrl}
                      onChange={(e) => setFotoDocumentoUrl(e.target.value)}
                      placeholder="Link da foto do documento escaneado..."
                      className="grow w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoDocumentoUrl('https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600&h=400')}
                      className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shrink-0 transition"
                      title="Fornecer Modelo Provisório"
                    >
                      Mock Documento
                    </button>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-500" /> Contato de Emergência
                  </label>
                  <input
                    type="text"
                    value={contatoEmergencia}
                    onChange={(e) => setContatoEmergencia(e.target.value)}
                    placeholder="ex: Mãe (Joana) - (13) 99111-2233"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Financial Responsible */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-amber-500" /> Responsável Financeiro
                  </label>
                  <input
                    type="text"
                    value={responsavelFinanceiro}
                    onChange={(e) => setResponsavelFinanceiro(e.target.value)}
                    placeholder="ex: Pai (Marcos de Souza Silva)"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Medical Restrictions */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase text-red-600 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-red-500 animate-pulse" /> Restrições Médicas / Alergias
                  </label>
                  <input
                    type="text"
                    value={restricoesMedicas}
                    onChange={(e) => setRestricoesMedicas(e.target.value)}
                    placeholder="ex: Asma moderada, desvio de coluna L4, ou 'Nenhuma'"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                {/* Specific Pricing rules for scholarship controls */}
                <div className="sm:col-span-2 p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-amber-900 uppercase block">Desconto Fixo de Caixa (R$)</label>
                    <input
                      type="number"
                      value={descontoIndividual}
                      onChange={(e) => setDescontoIndividual(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="ex: 20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-amber-900 uppercase block">Bolsa Parcial (%)</label>
                    <input
                      type="number"
                      value={bolsaParcial}
                      onChange={(e) => setBolsaParcial(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="ex: 50"
                    />
                  </div>
                  <div className="space-y-1 flex items-center pt-4">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isento}
                        onChange={(e) => setIsento(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      Isenção Total (100% Grátis)
                    </label>
                  </div>
                </div>

                {/* Observações */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Prontuário Observações do Professor</label>
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Histórico físico, observações marciais, objetivos individuais..."
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 border border-slate-950 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition shadow-xs"
                >
                  {editingAluno ? 'Salvar Alterações' : 'Confirmar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER DE FICHA COMPLETA E HISTÓRICO DE ALTERAÇÕES */}
      {isDetailOpen && viewingAluno && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col transform transition-all p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={viewingAluno.fotoUrl || '/logo_oficial.png'}
                  alt={viewingAluno.nome}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_oficial.png';
                  }}
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/20 shadow-xs"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-950 font-serif">{viewingAluno.nome}</h3>
                  <p className="text-xs text-slate-400">Praticante Cadastrado • {viewingAluno.ativo ? 'Em Atividade' : 'Inativo'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 grow scrollbar-thin">
              {/* Contatos e Info Pessoal */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações Pessoais</h4>
                <div className="grid grid-cols-2 gap-3 text-sm border border-slate-50 p-3 rounded-lg bg-slate-50/50">
                  <p><span className="font-semibold text-slate-500 block">CPF:</span><span className="text-slate-800 font-medium">{viewingAluno.cpf || 'Não Informado'}</span></p>
                  <p><span className="font-semibold text-slate-500 block">RG:</span><span className="text-slate-800 font-medium">{viewingAluno.rg || 'Não Informado'}</span></p>
                  <p><span className="font-semibold text-slate-500 block">Nascimento:</span><span className="text-slate-800 font-medium">{viewingAluno.dataNascimento ? new Date(viewingAluno.dataNascimento).toLocaleDateString('pt-BR') : 'Não faturado'}</span></p>
                  <p><span className="font-semibold text-slate-500 block">Telefone:</span><span className="text-slate-800 font-medium font-mono">{viewingAluno.telefone}</span></p>
                  <p className="col-span-2"><span className="font-semibold text-slate-500 block">E-mail:</span><span className="text-slate-800 font-medium">{viewingAluno.email || 'Nenhum'}</span></p>
                  <p className="col-span-2"><span className="font-semibold text-slate-500 block">Endereço:</span><span className="text-slate-800 text-xs font-medium">{viewingAluno.endereco || 'Sem endereço'}</span></p>
                </div>
              </div>

              {/* Informações de Graduação */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações de Graduação</h4>
                <div className="space-y-3">
                  {(viewingAluno.modalidades || [viewingAluno.modalidade || 'Kung Fu Garra de Águia']).map(mod => {
                    const belt = viewingAluno.faixasPorModalidade?.[mod] || viewingAluno.faixaAtual || 'Branca';
                    const horas = viewingAluno.horasPorModalidade?.[mod] !== undefined ? viewingAluno.horasPorModalidade[mod] : (viewingAluno.modalidades?.[0] === mod ? viewingAluno.horasAcumuladas : 0);
                    const tempo = viewingAluno.tempoNaFaixaPorModalidade?.[mod] !== undefined ? viewingAluno.tempoNaFaixaPorModalidade[mod] : (viewingAluno.modalidades?.[0] === mod ? viewingAluno.tempoNaFaixaMeses : 0);
                    const dateLast = viewingAluno.dataUltimaGraduacaoPorModalidade?.[mod] || (viewingAluno.modalidades?.[0] === mod ? viewingAluno.dataUltimaGraduacao : undefined);
                    const eligible = viewingAluno.elegivelExamePorModalidade?.[mod] !== undefined ? viewingAluno.elegivelExamePorModalidade[mod] : (viewingAluno.modalidades?.[0] === mod ? viewingAluno.elegivelExame : false);
                    
                    return (
                      <div key={mod} className="border border-amber-500/15 p-3 rounded-xl bg-amber-500/5 space-y-2" id={`drawer-grad-card-${mod.replace(/\s+/g, '-')}`}>
                        <span className="text-xs font-black text-amber-900 uppercase tracking-wider">{mod}</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-semibold text-slate-500 block">Faixa Atual:</span>
                            {getFaixaBadge(belt as any)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500 block">Última Graduação:</span>
                            <span className="text-slate-800 font-medium">{dateLast ? new Date(dateLast + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não registrada'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500 block">Horas Acumuladas:</span>
                            <span className="text-slate-800 font-semibold font-mono">{horas} horas</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500 block">Tempo na Faixa:</span>
                            <span className="text-slate-800 font-semibold font-mono">{tempo} meses</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-amber-200/20">
                            <span className="font-semibold text-slate-500 block">Elegível para Exame:</span>
                            <span className={`inline-flex items-center gap-1 font-bold ${eligible ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {eligible ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Sim (Requisitos preenchidos)
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5 text-slate-400" /> Não (Requisitos incompletos)
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {viewingAluno.observacoesGraduacao && (
                    <div className="border-t border-slate-100 pt-3 mt-1 text-xs col-span-2">
                      <span className="font-semibold text-slate-500 block">Observações de Graduação:</span>
                      <span className="text-slate-700 font-medium italic">{viewingAluno.observacoesGraduacao}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsabilidade e Emergência */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Segurança & Financeiro</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 border border-red-100 bg-red-500/5 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      Contato de Emergência
                    </span>
                    <p className="text-xs font-bold text-slate-800">{viewingAluno.contatoEmergencia || 'Nenhum cadastrado'}</p>
                  </div>
                  <div className="p-3 border border-slate-100 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      Responsável Financeiro
                    </span>
                    <p className="text-xs font-bold text-slate-800">{viewingAluno.responsavelFinanceiro || 'Próprio Aluno'}</p>
                  </div>
                </div>
                {viewingAluno.restricoesMedicas && (
                  <div className="p-3 border border-red-200 bg-red-50 rounded-xl space-y-1 text-xs">
                    <span className="text-xs font-bold text-red-800 flex items-center gap-1 uppercase">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      Prontuário de Alerta Médico
                    </span>
                    <p className="text-slate-700 font-semibold">{viewingAluno.restricoesMedicas}</p>
                  </div>
                )}
              </div>

              {/* Histórico de Alterações */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Histórico de Alterações (Auditável)
                </h4>
                <div className="space-y-2 overflow-y-auto max-h-[160px] border border-slate-100 p-2 rounded-lg bg-slate-50/50">
                  {!viewingAluno.historicoAlteracoes || viewingAluno.historicoAlteracoes.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">Nenhum evento registrado ainda.</p>
                  ) : (
                    viewingAluno.historicoAlteracoes.map((item) => (
                      <div key={item.id} className="border-l-2 border-amber-500 pl-3 py-1 text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.tipo}</span>
                          <span className="text-[10px] text-slate-400">{item.data}</span>
                        </div>
                        <p className="text-slate-600 font-medium">{item.descricao}</p>
                        <p className="text-[10px] text-slate-400">Efetuado por: {item.usuario}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Visualizar Doc Foto */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Imagens do Documento Escaneado</h4>
                {viewingAluno.documentosUrls && viewingAluno.documentosUrls[0] ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs relative group bg-slate-50">
                    <img
                      src={viewingAluno.documentosUrls[0]}
                      alt="Documento escaneado"
                      referrerPolicy="no-referrer"
                      className="w-full max-h-[220px] object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-3xs cursor-pointer">
                        <Eye className="w-4 h-4" /> Visualizar Documento Ampliado
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs border border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50">
                    Nenhuma imagem de documento físico foi vinculada. Acesse o modo Edição para fornecer a URL.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-xs text-center uppercase tracking-wider"
              >
                Fechar Ficha Cadastral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
