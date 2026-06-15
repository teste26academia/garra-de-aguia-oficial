import React, { useState } from 'react';
import { GraduacaoExame, Aluno, GraduacaoFaixa, Presenca } from '../types';
import { Award, Plus, Calendar, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, X, ScrollText, Search, UserCheck, Star, Flame } from 'lucide-react';
import { FAIXAS_KUNG_FU, FAIXAS_BOXE_CHINES, FAIXAS_TAI_CHI } from '../constants';

interface GraduacoesViewProps {
  exames: GraduacaoExame[];
  alunos: Aluno[];
  presencas: Presenca[];
  addExame: (exame: Omit<GraduacaoExame, 'id'>) => void;
}

const FAIXAS: GraduacaoFaixa[] = [...FAIXAS_KUNG_FU, ...FAIXAS_BOXE_CHINES, ...FAIXAS_TAI_CHI];

export function GraduacoesView({
  exames,
  alunos,
  presencas,
  addExame
}: GraduacoesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [faixaFilter, setFaixaFilter] = useState('todos');

  // Form State
  const [alunoId, setAlunoId] = useState('');
  const [modalidadeExame, setModalidadeExame] = useState<string>('Kung Fu Garra de Águia');
  const [faixaAnterior, setFaixaAnterior] = useState<GraduacaoFaixa>('Preparatória - Branca');
  const [faixaNova, setFaixaNova] = useState<GraduacaoFaixa>('Amarela');
  const [dataExame, setDataExame] = useState(new Date().toISOString().substring(0, 10));
  const [avaliador, setAvaliador] = useState('Professor Decio Padovani Junior');
  const [observacoes, setObservacoes] = useState('');

  const handleOpenAdd = () => {
    setAlunoId('');
    setModalidadeExame('Kung Fu Garra de Águia');
    setFaixaAnterior('Preparatória - Branca');
    setFaixaNova('Amarela');
    setDataExame(new Date().toISOString().substring(0, 10));
    setAvaliador('Professor Decio Padovani Junior');
    setObservacoes('');
    setIsModalOpen(true);
  };

  const handleAlunoIdChange = (id: string) => {
    setAlunoId(id);
    const aluno = alunos.find(a => a.id === id);
    if (aluno) {
      const studentMods = aluno.modalidades || [aluno.modalidade || 'Kung Fu Garra de Águia'];
      const defaultMod = studentMods[0] || 'Kung Fu Garra de Águia';
      setModalidadeExame(defaultMod);
      updateModalidadeBelts(aluno, defaultMod);
    }
  };

  const updateModalidadeBelts = (aluno: Aluno, modName: string) => {
    const currentFaixa = (aluno.faixasPorModalidade?.[modName]) || (aluno.modalidade === modName ? aluno.faixaAtual : undefined) || (modName === 'Kung Fu Garra de Águia' ? 'Preparatória - Branca' : 'Branca');
    setFaixaAnterior(currentFaixa as any);
    
    // Auto-suggest next belt
    const currentList = modName === 'Kung Fu Garra de Águia' 
      ? FAIXAS_KUNG_FU 
      : (modName === 'Boxe Chinês' ? FAIXAS_BOXE_CHINES : FAIXAS_TAI_CHI);
    const index = currentList.indexOf(currentFaixa as any);
    if (index !== -1 && index < currentList.length - 1) {
      setFaixaNova(currentList[index + 1]);
    } else {
      setFaixaNova(currentFaixa as any);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoId) {
      alert('Selecione o praticante da graduação.');
      return;
    }

    addExame({
      alunoId,
      modalidade: modalidadeExame,
      faixaAnterior,
      faixaAtual: faixaNova,
      dataExame,
      avaliador,
      observacoes: observacoes || undefined
    });

    setIsModalOpen(false);
    alert('Exame de Faixa registrado com sucesso! A graduação do aluno já foi atualizada no Firebase.');
  };

  const getFaixaColorClass = (faixa: GraduacaoFaixa) => {
    const fStr = String(faixa);
    if (fStr.includes('Branca')) return 'border-slate-350 text-slate-700 bg-slate-50';
    if (fStr.includes('Amarela')) return 'border-yellow-400 text-yellow-800 bg-yellow-50';
    if (fStr.includes('Laranja')) return 'border-orange-400 text-orange-900 bg-orange-50';
    if (fStr.includes('Verde')) return 'border-emerald-500 text-emerald-800 bg-emerald-50';
    if (fStr.includes('Azul')) return 'border-blue-500 text-blue-800 bg-blue-50';
    if (fStr.includes('Roxa') || fStr.includes('Vermelha')) return 'border-red-500 text-red-800 bg-red-50';
    if (fStr.includes('Marrom')) return 'border-amber-700 text-amber-900 bg-amber-50';
    return 'border-zinc-950 text-amber-400 bg-zinc-900';
  };

  // Recommendations: Alunos who have at least 10 logged presence check-ins are recommended for exam!
  const recommendedStudents = alunos
    .filter(al => al.ativo && !al.excluido)
    .map(al => {
      const presCount = presencas.filter(p => p.alunoId === al.id && p.confirmadoPorProfessor).length;
      let nextGrad: GraduacaoFaixa = 'Faixa Branca (Preparatória)';
      const currentFaixa = al.faixaAtual || 'Faixa Branca (Preparatória)';
      const currentList = al.modalidade === 'Boxe Chinês' ? FAIXAS_BOXE_CHINES : FAIXAS_KUNG_FU;
      const idx = currentList.indexOf(currentFaixa);
      if (idx !== -1 && idx < currentList.length - 1) {
        nextGrad = currentList[idx + 1];
      } else {
        nextGrad = currentFaixa;
      }
      return { aluno: al, presCount, nextGrad, isEligible: presCount >= 10 };
    })
    .filter(item => item.isEligible)
    .sort((a, b) => b.presCount - a.presCount);

  // Filtered recent exams list
  const filteredExames = exames.filter(ex => {
    const aluno = alunos.find(a => a.id === ex.alunoId);
    if (!aluno || aluno.excluido) return false;

    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFaixa = faixaFilter === 'todos' || ex.faixaAtual === faixaFilter;

    return matchesSearch && matchesFaixa;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-amber-500/20 text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" /> Exames & Promoções de Faixa
          </h2>
          <p className="text-xs text-slate-400 mt-1">Quadro oficial de exames práticos (Kuen) e linhagem tradicional da Liga Garra de Águia Praia Grande.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition text-xs shrink-0 self-start sm:self-center uppercase"
        >
          <Plus className="w-4 h-4 text-slate-950" /> Avaliar Lançamento
        </button>
      </div>

      {/* Structural layout representing the traditional lineage */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="absolute right-0 bottom-0 pointer-events-none select-none opacity-5">
          <ScrollText className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Escaneamento e Matriz Geral de Graus</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {FAIXAS.map((faixa, i) => (
              <div key={faixa} className="flex items-center gap-1">
                <span className={`inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border leading-none ${getFaixaColorClass(faixa)}`}>
                  {i + 1}º. {faixa}
                </span>
                {i < FAIXAS.length - 1 && <span className="text-slate-700 text-xs">→</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">
            * Cada graduação requer verificação de conformidade na execução de bastão, tui-shou, e técnicas tradicionais de canas marciais.
          </p>
        </div>
      </div>

      {/* RECOMENDAÇÃO DE EXAMES & HISTÓRICO FLUXO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Histórico de Exames (8 Colunas) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-850 text-sm">Histórico de Exames Concluídos</h3>
              <p className="text-[10px] text-slate-400 font-medium">Exames confirmados e salvos no Firestore</p>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nome do aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <select
                value={faixaFilter}
                onChange={(e) => setFaixaFilter(e.target.value)}
                className="p-1 border border-slate-205 bg-white text-xs rounded-lg text-slate-600 focus:outline-none"
              >
                <option value="todos">Todas faixas</option>
                {FAIXAS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredExames.length === 0 ? (
              <p className="p-12 text-center text-slate-400 text-xs">Nenhum registro de avaliação atende às consultas ativas.</p>
            ) : (
              [...filteredExames].reverse().map(ex => {
                const aluno = alunos.find(a => a.id === ex.alunoId);
                return (
                  <div key={ex.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-slate-50/50 transition justify-between items-start text-xs">
                    <div className="space-y-2 grow">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{aluno?.nome || 'Aluno não localizado'}</h4>
                        <p className="text-[10px] text-slate-400">
                          Examinado em: <b>{new Date(ex.dataExame).toLocaleDateString('pt-BR')}</b> • Avaliador: {ex.avaliador}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] leading-none font-bold border ${getFaixaColorClass(ex.faixaAnterior)}`}>
                          {ex.faixaAnterior}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] leading-none font-bold border ${getFaixaColorClass(ex.faixaAtual)}`}>
                          {ex.faixaAtual}
                        </span>
                      </div>

                      {ex.observacoes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-xl">
                          <b className="text-slate-700">Parecer Técnico:</b> {ex.observacoes}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-100 self-start sm:self-center">
                      <ShieldCheck className="w-3.5 h-3.5" /> Registrado
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recomendações e Elegibilidade (4 Colunas) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-3xs p-5 space-y-4">
          <div className="border-b border-slate-150 pb-3 flex items-center gap-2">
            <div className="p-1 bg-amber-50 rounded-lg text-amber-600">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Prontos para Promoção</h4>
              <p className="text-[10px] text-slate-400">Filtragem de alunos com &gt;= 10 frequências ativas no Dojo</p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[355px] overflow-y-auto scrollbar-thin">
            {recommendedStudents.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs">
                <HelpCircle className="w-8 h-8 text-amber-400 mx-auto mb-1.5" />
                Nenhum novo aluno possui ainda o mínimo de 10 frequências para sugerir promoção de grau.
              </div>
            ) : (
              recommendedStudents.map(({ aluno, presCount, nextGrad }) => (
                <div key={aluno.id} className="p-3 bg-amber-500/5 hover:bg-amber-100/30 border border-amber-100 rounded-xl space-y-1.5 text-xs transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-slate-850">{aluno.nome}</p>
                      <p className="text-[10px] text-slate-500">Atual: {aluno.faixaAtual}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[10px] font-black flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-700 text-amber-700" /> {presCount} aulas
                    </span>
                  </div>
                  
                  {nextGrad && (
                    <div className="pt-2 border-t border-amber-500/10 flex items-center justify-between text-[10px]">
                      <span className="text-slate-600 font-medium">Próximo grau: <b className="text-slate-800">{nextGrad}</b></span>
                      <button
                        onClick={() => {
                          setAlunoId(aluno.id);
                          setFaixaAnterior(aluno.faixaAtual);
                          setFaixaNova(nextGrad as GraduacaoFaixa);
                          setIsModalOpen(true);
                        }}
                        className="text-amber-700 font-extrabold bg-amber-500/10 hover:bg-amber-500 hover:text-slate-900 border border-amber-200/50 px-2 py-0.5 rounded-lg transition"
                      >
                        Avaliar Agora
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Promover Praticante */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold font-serif text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-amber-400 text-amber-400" /> Nova Promoção de Grau
                </h3>
                <p className="text-xs text-slate-400">Registre os dados de avaliação prática no dojo.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Aluno Avaliado *</label>
                <select
                  required
                  value={alunoId}
                  onChange={(e) => handleAlunoIdChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-205 rounded-xl text-sm bg-white focus:outline-none"
                >
                  <option value="">Selecione o Praticante</option>
                  {alunos.filter(a => a.ativo && !a.excluido).map(al => (
                    <option key={al.id} value={al.id}>{al.nome} (Graduação: {al.faixaAtual})</option>
                  ))}
                </select>
              </div>

              {alunoId && (
                <div className="space-y-1" id="exam-mod-selection">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Modalidade sob Exame *</label>
                  <select
                    required
                    value={modalidadeExame}
                    onChange={(e) => {
                      const mod = e.target.value;
                      setModalidadeExame(mod);
                      const al = alunos.find(a => a.id === alunoId);
                      if (al) {
                        updateModalidadeBelts(al, mod);
                      }
                    }}
                    className="w-full p-2.5 border border-slate-205 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    {(() => {
                      const targetAluno = alunos.find(a => a.id === alunoId);
                      const mods = targetAluno?.modalidades || [targetAluno?.modalidade || 'Kung Fu Garra de Águia'];
                      return mods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ));
                    })()}
                  </select>
                </div>
              )}

              {/* Progressão de Faixas visual */}
              {alunoId && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Graduação Atual</span>
                    <span className={`inline-block mt-1 px-2.5 py-1 text-xs font-bold rounded-lg border ${getFaixaColorClass(faixaAnterior)}`}>
                      {faixaAnterior}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Nova Graduação Almejada</span>
                    <span className={`inline-block mt-1 px-2.5 py-1 text-xs font-bold rounded-lg border ${getFaixaColorClass(faixaNova)}`}>
                      {faixaNova}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Graduação sob Avaliação</label>
                  <select
                    value={faixaAnterior}
                    onChange={(e) => setFaixaAnterior(e.target.value as GraduacaoFaixa)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    {(modalidadeExame === 'Kung Fu Garra de Águia' 
                      ? FAIXAS_KUNG_FU 
                      : (modalidadeExame === 'Boxe Chinês' ? FAIXAS_BOXE_CHINES : FAIXAS_TAI_CHI)
                    ).map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Nova Graduação</label>
                  <select
                    value={faixaNova}
                    onChange={(e) => setFaixaNova(e.target.value as GraduacaoFaixa)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    {(modalidadeExame === 'Kung Fu Garra de Águia' 
                      ? FAIXAS_KUNG_FU 
                      : (modalidadeExame === 'Boxe Chinês' ? FAIXAS_BOXE_CHINES : FAIXAS_TAI_CHI)
                    ).map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Data do Exame</label>
                  <input
                    type="date"
                    required
                    value={dataExame}
                    onChange={(e) => setDataExame(e.target.value)}
                    className="w-full p-2.5 border border-slate-205 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Mestre Co-Avaliador</label>
                  <input
                    type="text"
                    required
                    value={avaliador}
                    onChange={(e) => setAvaliador(e.target.value)}
                    className="w-full p-2.5 border border-slate-205 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Observações e Parecer Técnico</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="ex: Avaliada execução de formas, socos e base estável..."
                  className="w-full p-2.5 border border-slate-205 rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 border border-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-800 transition shadow-xs uppercase tracking-wider"
                >
                  Registrar Exame
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
