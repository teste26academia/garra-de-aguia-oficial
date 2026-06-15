import React, { useState } from 'react';
import { Familia, Aluno, FamiliaMemberRole } from '../types';
import { Plus, Users, UserPlus, Edit2, Trash2, X, Info, Contact, Smile, AlertTriangle } from 'lucide-react';

interface FamiliasViewProps {
  familias: Familia[];
  alunos: Aluno[];
  addFamilia: (nomeFamilia: string, percentualDesconto: number, membros: string[], membrosRoles?: FamiliaMemberRole[]) => void;
  updateFamilia: (familia: Familia) => void;
  deleteFamilia: (id: string) => void;
}

export function FamiliasView({
  familias,
  alunos,
  addFamilia,
  updateFamilia,
  deleteFamilia
}: FamiliasViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFam, setEditingFam] = useState<Familia | null>(null);

  // Form State
  const [nomeFamilia, setNomeFamilia] = useState('');
  const [percentualDesconto, setPercentualDesconto] = useState(10);
  const [selectedMembros, setSelectedMembros] = useState<string[]>([]);
  
  // Custom states mapping the parent role configuration of active selection
  const [membrosRoles, setMembrosRoles] = useState<FamiliaMemberRole[]>([]);

  const handleOpenNew = () => {
    setEditingFam(null);
    setNomeFamilia('');
    setPercentualDesconto(10); // Sugestão progressiva inicial
    setSelectedMembros([]);
    setMembrosRoles([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fam: Familia) => {
    setEditingFam(fam);
    setNomeFamilia(fam.nomeFamilia);
    setPercentualDesconto(fam.percentualDesconto);
    setSelectedMembros(fam.membros || []);
    setMembrosRoles(fam.membrosRoles || (fam.membros || []).map(id => ({ alunoId: id, parentesco: 'Outro' as const })));
    setIsModalOpen(true);
  };

  const toggleMembroSelection = (alunoId: string) => {
    let nextMembros: string[];
    let nextRoles: FamiliaMemberRole[];

    if (selectedMembros.includes(alunoId)) {
      nextMembros = selectedMembros.filter(id => id !== alunoId);
      nextRoles = membrosRoles.filter(r => r.alunoId !== alunoId);
    } else {
      nextMembros = [...selectedMembros, alunoId];
      nextRoles = [...membrosRoles, { alunoId, parentesco: 'Outro' as const }];
    }

    // Auto-Set progressive discount strategy: 2 members -> 10%, 3 members -> 15%, 4+ members -> 20%
    let calculatedDiscount = 0;
    if (nextMembros.length === 2) calculatedDiscount = 10;
    else if (nextMembros.length === 3) calculatedDiscount = 15;
    else if (nextMembros.length >= 4) calculatedDiscount = 20;

    if (calculatedDiscount > 0) {
      setPercentualDesconto(calculatedDiscount);
    }

    setSelectedMembros(nextMembros);
    setMembrosRoles(nextRoles);
  };

  const handleRoleChange = (alunoId: string, parentesco: FamiliaMemberRole['parentesco']) => {
    setMembrosRoles(prev => 
      prev.map(r => r.alunoId === alunoId ? { ...r, parentesco } : r)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFamilia.trim()) {
      alert('Por favor, informe o nome para a Unidade Família.');
      return;
    }

    if (editingFam) {
      updateFamilia({
        id: editingFam.id,
        nomeFamilia,
        percentualDesconto,
        membros: selectedMembros,
        membrosRoles: membrosRoles
      } as Familia);
    } else {
      addFamilia(nomeFamilia, percentualDesconto, selectedMembros, membrosRoles);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remover Unidade Familiar "${name}"? Os descontos de todos os familiares vinculados serão reiniciados.`)) {
      deleteFamilia(id);
    }
  };

  const getParentLabelColor = (role: string) => {
    switch (role) {
      case 'Pai': return 'bg-cyan-50 text-cyan-700 border border-cyan-100';
      case 'Mãe': return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'Filho': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'Filha': return 'bg-pink-50 text-pink-700 border border-pink-100';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-amber-500/20 text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> Unidades Familiares do Dojo
          </h2>
          <p className="text-xs text-slate-400 mt-1">Conecte cônjuges, pais e filhos com papéis específicos e garanta que os descontos progressivos por quantidade de inscritos sejam processados automaticamente.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition shadow-md text-xs shrink-0 self-start sm:self-center uppercase"
        >
          <Plus className="w-4 h-4 text-slate-950" /> Nova Família
        </button>
      </div>

      {/* Progressive discount scale instructions alert */}
      <div className="bg-amber-50/65 border border-amber-200/50 p-4 rounded-xl flex items-start gap-2.5 text-xs text-amber-805">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Política Progressiva de Desconto por Núcleo Familiar:</p>
          <p className="text-slate-600">Recomendamos: <b>2 Alunos</b> vinculados = <b>10% de Desconto</b> para cada; <b>3 Alunos</b> = <b>15% de Desconto</b>; <b>4+ Alunos</b> = <b>20% de Desconto</b> integrado.</p>
        </div>
      </div>

      {/* Grid de Famílias */}
      {familias.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white p-6 max-w-lg mx-auto">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700">Nenhuma família cadastrada</h3>
          <p className="text-xs mt-1">Gere círculos de parentesco para agilizar faturamentos e conceder benefícios progressivos justos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familias.map(fam => {
            const hasRoles = fam.membrosRoles && fam.membrosRoles.length > 0;
            return (
              <div key={fam.id} className="bg-white rounded-2xl border border-slate-100 shadow-3xs hover:shadow-2xs transition-all flex flex-col justify-between overflow-hidden">
                {/* Top Section */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-slate-800 text-base">{fam.nomeFamilia}</h3>
                      <p className="text-[10px] text-slate-400">ID: {fam.id}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                      {fam.percentualDesconto}% OFF
                    </span>
                  </div>

                  {/* List of members with parental roles */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Contact className="w-3.5 h-3.5 text-slate-500" /> Membros Regulamentados ({(fam.membros || []).length})
                    </h4>
                    {(!fam.membros || fam.membros.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">Esta família não possui membros vinculados.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {fam.membros.map(mId => {
                          const aluno = alunos.find(a => a.id === mId);
                          // Lookup parentesco value
                          const matchedRole = fam.membrosRoles?.find(r => r.alunoId === mId)?.parentesco || 'Outro';
                          return (
                            <div key={mId} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-700 block truncate max-w-[150px]">{aluno?.nome || 'Cadastro Inativo'}</span>
                                <span className="text-[10px] text-slate-400 block font-semibold">{aluno ? aluno.plano.replace('_', ' ') : ''}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getParentLabelColor(matchedRole)}`}>
                                {matchedRole}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => handleOpenEdit(fam)}
                    className="p-1.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-600 font-bold transition inline-flex items-center gap-1 shadow-3xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Configurar
                  </button>
                  <button
                    onClick={() => handleDelete(fam.id, fam.nomeFamilia)}
                    className="p-1.5 px-3 border border-red-105 bg-white hover:bg-red-50 text-red-600 rounded-lg font-bold transition inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar/Editar Família */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold font-serif text-white">
                  {editingFam ? 'Gerenciar Unidade Familiar' : 'Registrar Nova Unidade Familiar'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Selecione os praticantes associados e configure seus graus de parentesco.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Nome Identificador da Família *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Família Padovani, Tronco Santos, etc..."
                    value={nomeFamilia}
                    onChange={(e) => setNomeFamilia(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Desconto Consensual (%) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">%</span>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={percentualDesconto}
                      onChange={(e) => setPercentualDesconto(parseInt(e.target.value) || 0)}
                      className="w-full pl-9 pr-4 p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox multi-selector block */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block uppercase">Marque os Membros Integrantes da Família</label>
                <div className="border border-slate-150 rounded-2xl divide-y divide-slate-100 max-h-48 overflow-y-auto p-1 bg-slate-50/50">
                  {alunos.filter(a => a.ativo && !a.excluido).map(aluno => {
                    const isChecked = selectedMembros.includes(aluno.id);
                    return (
                      <div 
                        key={aluno.id} 
                        onClick={() => toggleMembroSelection(aluno.id)}
                        className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                          isChecked ? 'bg-amber-500/5 hover:bg-amber-55' : 'hover:bg-slate-100 bg-transparent'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{aluno.nome}</p>
                          <p className="text-slate-400 text-[10px] font-semibold">
                            Faixa: {aluno.faixaAtual} • Plano: {aluno.plano.replace('_', ' ')}
                            {aluno.familiaId && aluno.familiaId !== editingFam?.id && (
                              <span className="text-red-500 font-black block mt-0.5">⚠️ Outra Família Vinculada</span>
                            )}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-amber-500 border-amber-600 text-slate-950 font-black' : 'border-slate-300 bg-white text-transparent'
                        }`}>
                          ✓
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalhar o Parentesco / Membro Role mapping */}
              {selectedMembros.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Definição dos Papéis Familiares</span>
                  <div className="p-3 border border-slate-205 rounded-xl bg-slate-50 space-y-2.5 max-h-44 overflow-y-auto">
                    {selectedMembros.map(mId => {
                      const alName = alunos.find(a => a.id === mId)?.nome || 'Praticante';
                      const activeRole = membrosRoles.find(r => r.alunoId === mId)?.parentesco || 'Outro';

                      return (
                        <div key={mId} className="flex items-center justify-between gap-2 text-xs border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                          <span className="font-extrabold text-slate-700 truncate max-w-[180px]">{alName}</span>
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-3xs">
                            <span className="text-[10px] text-slate-400 font-bold font-serif uppercase">Grau:</span>
                            <select
                              value={activeRole}
                              onChange={(e) => handleRoleChange(mId, e.target.value as FamiliaMemberRole['parentesco'])}
                              className="bg-transparent font-bold text-slate-700 focus:outline-none focus:ring-0 text-[11px] p-0 border-0"
                            >
                              <option value="Pai">Pai</option>
                              <option value="Mãe">Mãe</option>
                              <option value="Filho">Filho</option>
                              <option value="Filha">Filha</option>
                              <option value="Outro">Outro Vínculo</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
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
                  className="px-5 py-2 bg-slate-900 border border-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-800 transition uppercase tracking-wider"
                >
                  Salvar Grupo Familiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
