import React, { useState } from 'react';
import { Usuario, Comunicado, Aluno } from '../types';
import { Cake, Calendar, Clock, Trash2, Megaphone, Send, ShieldAlert, Award, Star, Flame } from 'lucide-react';

interface AvisosAniversariantesViewProps {
  comunicados: Comunicado[];
  alunos: Aluno[];
  addComunicado: (comun: Omit<Comunicado, 'id' | 'dataPublicacao'>) => Promise<void>;
  deleteComunicado: (id: string) => Promise<void>;
}

export function AvisosAniversariantesView({
  comunicados,
  alunos,
  addComunicado,
  deleteComunicado
}: AvisosAniversariantesViewProps) {
  // Form State
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState<'evento' | 'exame' | 'horario' | 'geral'>('geral');
  const [loading, setLoading] = useState(false);

  const activeAlunos = alunos.filter(a => a.ativo && !a.excluido);
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth() + 1; // 1-indexed

  // Helper date parsing
  const parseDate = (dStr: string) => {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length !== 3) return null;
    return {
      ano: parseInt(parts[0], 10),
      mes: parseInt(parts[1], 10),
      dia: parseInt(parts[2], 10)
    };
  };

  // Calculador de idade
  const calcularIdadeVal = (birthStr: string) => {
    const dt = parseDate(birthStr);
    if (!dt) return 0;
    let age = hoje.getFullYear() - dt.ano;
    const m = hoje.getMonth() + 1 - dt.mes;
    if (m < 0 || (m === 0 && hoje.getDate() < dt.dia)) {
      age--;
    }
    return age;
  };

  // Calculador de tempo de academia
  const formatarTempoAcademia = (matStr: string) => {
    const dt = parseDate(matStr);
    if (!dt) return 'N/A';
    const matDate = new Date(dt.ano, dt.mes - 1, dt.dia);
    const diffMs = hoje.getTime() - matDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} dias`;
    }
    
    const totalMonths = Math.floor(diffDays / 30.44);
    if (totalMonths < 12) {
      return `${totalMonths} meses`;
    }
    
    const years = Math.floor(totalMonths / 12);
    const remMonths = totalMonths % 12;
    return remMonths > 0 ? `${years} ano(s) e ${remMonths} mês(es)` : `${years} ano(s)`;
  };

  // Filtrar Aniversariantes do dia
  const aniversariantesDia = activeAlunos.filter(al => {
    const dt = parseDate(al.dataNascimento);
    if (!dt) return false;
    return dt.dia === diaHoje && dt.mes === mesHoje;
  });

  // Filtrar Aniversariantes do mês (excluindo os do dia para evitar duplicidade ou agrupando)
  const aniversariantesMes = activeAlunos
    .filter(al => {
      const dt = parseDate(al.dataNascimento);
      if (!dt) return false;
      return dt.mes === mesHoje && dt.dia !== diaHoje;
    })
    .sort((a, b) => {
      const dtA = parseDate(a.dataNascimento);
      const dtB = parseDate(b.dataNascimento);
      return (dtA?.dia || 0) - (dtB?.dia || 0);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    
    setLoading(true);
    try {
      await addComunicado({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        categoria,
        autor: 'Professor Decio Padovani Junior'
      });
      setTitulo('');
      setConteudo('');
      setCategoria('geral');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoriaLabel = (cat: string) => {
    switch (cat) {
      case 'evento': return '📅 Evento Especial';
      case 'exame': return '🥋 Exame de Faixa';
      case 'horario': return '🕒 Novo Horário';
      default: return '📢 Comunicado Geral';
    }
  };

  const getCategoriaColor = (cat: string) => {
    switch (cat) {
      case 'evento': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'exame': return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'horario': return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div id="avisos-aniversariantes-view-container" className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-serif font-extrabold tracking-tight text-neutral-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500" /> Avisos & Aniversariantes
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">
            Painel Confidencial do Professor Decio Padovani Junior
          </p>
        </div>
        <div className="text-[11px] uppercase tracking-wider font-bold bg-neutral-900 text-amber-400 border border-neutral-950 px-4 py-2 rounded-full self-start">
          Nível de Acesso: Administrador
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUNA ESQUERDA: COMUNICADOS INTERNOS */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase text-neutral-800 tracking-wider mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" /> Publicar Novo Comunicado
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Título do Aviso</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Confirmação de Data do Próximo Exame de Faixa"
                  className="w-full bg-slate-50 border border-neutral-300/80 rounded-lg px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full bg-slate-50 border border-neutral-300/80 rounded-lg px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="geral">📢 Comunicado Geral</option>
                    <option value="evento">📅 Evento Especial</option>
                    <option value="exame">🥋 Exame de Faixa</option>
                    <option value="horario">🕒 Alteração de Horário</option>
                  </select>
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <span className="text-[10px] text-neutral-400 bg-neutral-50 p-2 rounded-lg border border-neutral-200/50 leading-normal mb-0.5">
                    Os comunicados aparecerão instantaneamente no Portal do Aluno.
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mensagem / Conteúdo</label>
                <textarea
                  required
                  rows={4}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Forneça instruções detalhadas para os alunos..."
                  className="w-full bg-slate-50 border border-neutral-300/80 rounded-lg px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-950 font-bold uppercase tracking-wider text-[11px] text-amber-400 hover:text-amber-300 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-neutral-900 border border-neutral-900 shadow-md transition"
              >
                {loading ? 'Publicando...' : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Publicar no Mural dos Alunos
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Histórico de comunicados */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Avisos Publicados no Mural ({comunicados.length})</h3>
            
            {comunicados.length === 0 ? (
              <div className="bg-slate-50/50 rounded-xl p-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200">
                Nenhum comunicado publicado ainda nesta temporada.
              </div>
            ) : (
              <div className="space-y-3.5">
                {comunicados.map(com => (
                  <div key={com.id} className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm relative group overflow-hidden">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoriaColor(com.categoria)}`}>
                        {getCategoriaLabel(com.categoria)}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Excluir este comunicado permanentemente?')) {
                            deleteComunicado(com.id);
                          }
                        }}
                        className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition"
                        title="Remover Comunicado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <h4 className="text-xs font-bold text-neutral-800">{com.titulo}</h4>
                    <p className="text-xs text-neutral-600 mt-1.5 whitespace-pre-line leading-relaxed">{com.conteudo}</p>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="font-medium">Autor: {com.autor}</span>
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(com.dataPublicacao).toLocaleDateString('pt-BR')} {new Date(com.dataPublicacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: ANIVERSARIANTES DO TEMPLO */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-amber-200/70 p-6 shadow-sm relative overflow-hidden">
            {/* Background design */}
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

            <h2 className="text-sm font-bold uppercase text-neutral-800 tracking-wider mb-5 flex items-center gap-2">
              <Cake className="w-5 h-5 text-amber-500 animate-bounce" /> Aniversariantes do Dia
            </h2>

            {aniversariantesDia.length === 0 ? (
              <div className="text-center py-6 text-neutral-400 text-xs">
                Nenhum aluno fazendo aniversário no dia de hoje ({hoje.toLocaleDateString('pt-BR')}).
              </div>
            ) : (
              <div className="space-y-3">
                {aniversariantesDia.map(al => (
                  <div key={al.id} className="flex items-center justify-between p-3.5 rounded-xl border border-amber-300 bg-amber-500/5 shadow-inner">
                    <div className="flex items-center gap-3">
                      {al.fotoUrl ? (
                        <img src={al.fotoUrl} alt={al.nome} className="w-10 h-10 rounded-full object-cover border-2 border-amber-400" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-amber-100 text-amber-700 font-bold rounded-full flex items-center justify-center text-xs border border-amber-300">
                          {al.nome.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                          {al.nome} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        </h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">{al.modalidade} • {al.faixaAtual}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-600 block">{calcularIdadeVal(al.dataNascimento)} anos</span>
                      <span className="text-[10px] text-neutral-400 font-mono italic block mt-0.5">{formatarTempoAcademia(al.dataMatricula)} de dojo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aniversariantes do Mês */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-4 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-neutral-500" /> Outros Aniversariantes do Mês (Mês {mesHoje})
            </h2>

            {aniversariantesMes.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                Nenhum outro aniversariante cadastrado para o mês vigente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
                {aniversariantesMes.map(al => {
                  const birth = parseDate(al.dataNascimento);
                  return (
                    <div key={al.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {birth?.dia}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-800">{al.nome}</h4>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{al.modalidade} • {al.faixaAtual}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-neutral-700 block whitespace-nowrap">{calcularIdadeVal(al.dataNascimento)} anos (Dia {birth?.dia})</span>
                        <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">Tempo: {formatarTempoAcademia(al.dataMatricula)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
