import React, { useState } from 'react';
import { Presenca, Aluno } from '../types';
import { Check, X, ClipboardCheck, Plus, Calendar, Clock, Search, Trash2, CheckCircle2, AlertCircle, Sparkles, AlertOctagon, ThumbsUp, UserCheck, Flame } from 'lucide-react';

interface PresencasViewProps {
  presencas: Presenca[];
  alunos: Aluno[];
  addPresenca: (alunoId: string, data: string, horario: string, confirmadoPorProfessor: boolean) => void;
  confirmPresenca: (id: string) => void;
  deletePresenca: (id: string) => void;
}

export function PresencasView({
  presencas,
  alunos,
  addPresenca,
  confirmPresenca,
  deletePresenca
}: PresencasViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  
  // Date selector for the quick list of the day (defaults to today)
  const [classDate, setClassDate] = useState(new Date().toISOString().substring(0, 10));
  const [classTime, setClassTime] = useState('19:30');

  // Form State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedHorario, setSelectedHorario] = useState('19:30');
  const [confirmadoPorProfessorForm, setConfirmadoPorProfessorForm] = useState(true);

  // Submit manual solicitation
  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlunoId) {
      alert('Selecione o aluno.');
      return;
    }

    addPresenca(selectedAlunoId, selectedDate, selectedHorario, confirmadoPorProfessorForm);
    setIsRequestModalOpen(false);
  };

  // 1. Roll-call helper: quick toggle presence for are-active students on selected date/time
  const quickRegisterPresence = (alunoId: string) => {
    // Check if there is already a presence registered for that user on this date
    const alreadyRegistered = presencas.find(p => p.alunoId === alunoId && p.data === classDate);
    if (alreadyRegistered) {
      deletePresenca(alreadyRegistered.id);
    } else {
      addPresenca(alunoId, classDate, classTime, true);
    }
  };

  // 2. Compute roll analytics for students
  const activeAlunos = alunos.filter(a => a.ativo && !a.excluido);

  const getMetrics = (alunoId: string) => {
    // Rolling 30 day count
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30);
    const limitISO = limitDate.toISOString().substring(0, 10);

    const alPres = presencas.filter(p => p.alunoId === alunoId);
    
    const count30Days = alPres.filter(p => p.data >= limitISO).length;
    const totalCount = alPres.length;

    // Check consecutive absence logic
    // Sort all presences descending by date
    const sortedDates = [...alPres]
      .filter(p => p.confirmadoPorProfessor)
      .map(p => p.data)
      .sort((a,b) => b.localeCompare(a));

    let consecutiveDaysPassed = 0;
    if (sortedDates.length > 0) {
      const lastPresenceDate = new Date(sortedDates[0]);
      const diffMs = Math.abs(new Date().getTime() - lastPresenceDate.getTime());
      consecutiveDaysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } else {
      // Never attended
      consecutiveDaysPassed = 99; // Arbitrary high number represents critical absence
    }

    return {
      monthlyFreq: count30Days,
      totalFreq: totalCount,
      daysSinceLastAttendance: consecutiveDaysPassed,
      hasLowAttendanceAlert: count30Days < 3 && consecutiveDaysPassed > 14
    };
  };

  const filteredPresencas = presencas.filter(pres => {
    const aluno = alunos.find(a => a.id === pres.alunoId);
    if (!aluno || aluno.excluido) return false;
    
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'confirmado') {
      matchesStatus = pres.confirmadoPorProfessor === true;
    } else if (statusFilter === 'solicitado') {
      matchesStatus = pres.confirmadoPorProfessor === false;
    }

    const matchesDate = !selectedDateFilter || pres.data === selectedDateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-amber-500/20 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-5 h-5 fill-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Painel de Lançamento e Chamada do Treinador</span>
          </div>
          <h2 className="text-2xl font-bold font-serif">Diário de Presenças • Garra de Águia</h2>
          <p className="text-xs text-slate-400">Marque as presenças com 1-Clique na aula de hoje, avalie faltas consecutivas e analise alertas de evasão de forma integrada.</p>
        </div>
        <button
          onClick={() => {
            setSelectedAlunoId('');
            setConfirmadoPorProfessorForm(true);
            setIsRequestModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl transition shadow-md text-sm self-start sm:self-center shrink-0"
        >
          <Plus className="w-4 h-4" /> Registrar Avulso / Retroativo
        </button>
      </div>

      {/* SEÇÃO 1: PAINEL DE CONVOCADOS DO DIA (MARCAÇÃO RÁPIDA DE PRESENÇA) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-3xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-serif">Planilha Pronta para a Aula</h3>
            <p className="text-xs text-slate-400">Todos os alunos ativos do dojo. Selecione o horário e clique sobre o aluno para assinar presença instantaneamente.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 border border-slate-200 p-1.5 bg-slate-50 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input 
                type="date" 
                value={classDate}
                onChange={(e) => setClassDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 border border-slate-200 p-1.5 bg-slate-50 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={classTime}
                onChange={(e) => setClassTime(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="18:15">Class 18:15</option>
                <option value="19:30">Class 19:30</option>
                <option value="20:15">Class 20:15</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rapid roll call grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeAlunos.map(student => {
            const hasAttendedToday = presencas.some(p => p.alunoId === student.id && p.data === classDate);
            const stats = getMetrics(student.id);

            return (
              <div 
                key={student.id}
                onClick={() => quickRegisterPresence(student.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                  hasAttendedToday 
                    ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20' 
                    : stats.hasLowAttendanceAlert
                      ? 'bg-red-500/5 border-red-200/60 hover:bg-slate-50 text-slate-700'
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                }`}
              >
                <div className="space-y-1 grow min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm truncate text-slate-800">{student.nome}</p>
                    {stats.hasLowAttendanceAlert && (
                      <span className="shrink-0 bg-red-100 text-red-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 animate-pulse">
                        <AlertOctagon className="w-2.5 h-2.5" /> Evasão
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-400">{student.faixaAtual}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-slate-600">
                      Freq. Mês: <b className="text-slate-800">{stats.monthlyFreq}</b>
                    </span>
                    {stats.daysSinceLastAttendance > 15 && (
                      <span className="text-red-600 font-bold">({stats.daysSinceLastAttendance === 99 ? 'Nunca' : `${stats.daysSinceLastAttendance} dias`} s/ ir)</span>
                    )}
                  </div>
                </div>

                {/* Presence indicator button feedback */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  hasAttendedToday 
                    ? 'bg-emerald-500 text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                }`}>
                  {hasAttendedToday ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 text-slate-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: RELATÓRIOS E ALERTA DE EVASÃO (BAIXA FREQUÊNCIA / FALTAS CONSECUTIVAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alunos de baixa frequência */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <AlertCircle className="w-5 h-5 text-red-500 animate-bounce" />
            <div>
              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Alunos em Risco de Evasão</h4>
              <p className="text-[11px] text-slate-400">Freq. Rolling 30 dias &lt; 3 presenças ou há mais de 14 dias sem ir</p>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-thin">
            {activeAlunos.filter(st => getMetrics(st.id).hasLowAttendanceAlert).length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs">
                <ThumbsUp className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                Nenhum sinal crítico de evasão nas turmas do Garra de Águia!
              </div>
            ) : (
              activeAlunos.filter(st => getMetrics(st.id).hasLowAttendanceAlert).map(st => {
                const met = getMetrics(st.id);
                return (
                  <div key={st.id} className="p-2.5 border border-red-100 bg-red-500/5 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{st.nome}</p>
                      <p className="text-slate-500 text-[10px]">{st.telefone} • {st.faixaAtual}</p>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-red-600">{met.monthlyFreq} aulas no mês</span>
                      <span className="block text-[10px] text-red-500 font-semibold">{met.daysSinceLastAttendance === 99 ? 'Nunca treinou' : `Último treino há ${met.daysSinceLastAttendance} dias`}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Freq. Mensal Resumo */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Líderes de Frequência do Dojo</h4>
              <p className="text-[11px] text-slate-400">Guerreiros com maior assiduidade e dedicação de treino geral</p>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-thin">
            {activeAlunos
              .map(st => ({ aluno: st, metrics: getMetrics(st.id) }))
              .filter(item => item.metrics.totalFreq > 0)
              .sort((a,b) => b.metrics.totalFreq - a.metrics.totalFreq)
              .slice(0, 4)
              .map(({ aluno, metrics }, index) => (
                <div key={aluno.id} className="p-2 border border-slate-50 bg-slate-50/40 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{aluno.nome}</p>
                      <p className="text-slate-500 text-[10px]">{aluno.faixaAtual}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold text-slate-700">{metrics.totalFreq} aulas totais</span>
                    <span className="block text-[10px] text-emerald-600 font-bold">{metrics.monthlyFreq} este mês</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: AUDITORIA GERAL DE CONSULTAS HISTÓRICAS */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-3xs space-y-4">
        <div>
          <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Filtro Geral de Histórico de Chamadas</h4>
          <p className="text-xs text-slate-400">Consulte todas as presenças registradas, valide o status de aprovação e remova entradas duplicadas.</p>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
            >
              <option value="todos">Todos os Status</option>
              <option value="confirmado">Confirmadas pelo Professor</option>
              <option value="solicitado">Pendentes de Confirmação</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
            />
          </div>
        </div>

        {/* List layout of filtered presences */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-[300px] overflow-y-auto scrollbar-thin">
          {filteredPresencas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhuma presença correspondente cadastrada no histórico.
            </div>
          ) : (
            filteredPresencas.map(pres => {
              const aluno = alunos.find(a => a.id === pres.alunoId);
              return (
                <div key={pres.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 hover:bg-slate-50/50 transition gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{aluno?.nome || 'Aluno não localizado'}</span>
                      <span className="text-slate-400">({aluno?.faixaAtual || 'Sem Faixa'})</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                      <span className="font-semibold text-slate-600">Turma: {pres.horario}</span>
                      <span>•</span>
                      <span>Dia: {new Date(pres.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      pres.confirmadoPorProfessor
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                    }`}>
                      {pres.confirmadoPorProfessor ? 'Confirmado' : 'Aguardando Lançador'}
                    </span>

                    {!pres.confirmadoPorProfessor && (
                      <button
                        onClick={() => confirmPresenca(pres.id)}
                        className="px-2 py-0.5 text-[10px] font-extrabold rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" /> Validar
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('Excluir definitivo este registro de presença?')) {
                          deletePresenca(pres.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 border border-slate-100 rounded-md hover:bg-red-50 transition"
                      title="Excluir Presença"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal - Cadastrar Solicitação de Presença / Chamada Direta */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold font-serif text-white">Lançar Chamada Retroativa</h3>
                <p className="text-xs text-slate-400">Professor registra a aula de kung fu para o praticante</p>
              </div>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequest} className="p-6 space-y-4">
              {/* Aluno */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Praticante *</label>
                <select
                  required
                  value={selectedAlunoId}
                  onChange={(e) => setSelectedAlunoId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                >
                  <option value="">Selecione o Praticante</option>
                  {alunos.filter(a => a.ativo && !a.excluido).map(al => (
                    <option key={al.id} value={al.id}>{al.nome} ({al.plano.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              {/* Data da Chamada */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Data da Aula *</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                />
              </div>

              {/* Horário Slot */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Horário da Turma *</label>
                <select
                  required
                  value={selectedHorario}
                  onChange={(e) => setSelectedHorario(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                >
                  <option value="18:15">18:15 - Turma Juvenil / Iniciantes</option>
                  <option value="19:30">19:30 - Turma Intermediária</option>
                  <option value="20:15">20:15 - Turma Avançada</option>
                </select>
              </div>

              {/* Confirmado? */}
              <div className="space-y-1 flex items-center h-full pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmadoPorProfessorForm}
                    onChange={(e) => setConfirmadoPorProfessorForm(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-3 text-sm font-bold text-slate-700">Confirmar Presença Imediatamente</span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 border border-slate-950 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition shadow-xs"
                >
                  Lançar Presença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
