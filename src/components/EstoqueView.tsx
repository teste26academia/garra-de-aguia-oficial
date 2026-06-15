import React, { useState } from 'react';
import { UniformeItem, VendaUniforme, Aluno, EstoqueMovimentacao } from '../types';
import { Package, Plus, Search, Trash2, ShieldAlert, ShoppingCart, ShoppingBag, X, TrendingUp, DollarSign, History, Truck, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface EstoqueViewProps {
  uniformes: UniformeItem[];
  vendas: VendaUniforme[];
  alunos: Aluno[];
  addUniformeItem: (item: Omit<UniformeItem, 'id'>) => void;
  updateUniformeItem: (item: UniformeItem) => void;
  deleteUniformeItem: (id: string) => void;
  venderUniforme: (itemId: string, alunoId: string, quantidade: number, valorTotal: number) => void;
}

export function EstoqueView({
  uniformes,
  vendas,
  alunos,
  addUniformeItem,
  updateUniformeItem,
  deleteUniformeItem,
  venderUniforme
}: EstoqueViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [stockStatusFilter, setStockStatusFilter] = useState<'todos' | 'critico'>('todos');

  // Modal Item Novo/Editar
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UniformeItem | null>(null);
  const [produto, setProduto] = useState('');
  const [tamanho, setTamanho] = useState<UniformeItem['tamanho']>('M');
  const [categoria, setCategoria] = useState<UniformeItem['categoria']>('Camiseta');
  const [quantidade, setQuantidade] = useState(10);
  const [precoVenda, setPrecoVenda] = useState(60.00);
  const [precoCusto, setPrecoCusto] = useState(30.00);
  const [estoqueMinimo, setEstoqueMinimo] = useState(3);
  const [fornecedor, setFornecedor] = useState('');

  // Modal de Venda Rápida
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [vendaItemId, setVendaItemId] = useState('');
  const [vendaAlunoId, setVendaAlunoId] = useState('');
  const [vendaQtd, setVendaQtd] = useState(1);
  const [vendaValorTotal, setVendaValorTotal] = useState(0);

  // Modal de Histórico de Movimentação Individual
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItemMovs, setSelectedItemMovs] = useState<EstoqueMovimentacao[]>([]);
  const [selectedItemName, setSelectedItemName] = useState('');

  const handleOpenNewItem = () => {
    setEditingItem(null);
    setProduto('');
    setTamanho('M');
    setCategoria('Camiseta');
    setQuantidade(10);
    setPrecoVenda(60.00);
    setPrecoCusto(30.00);
    setEstoqueMinimo(3);
    setFornecedor('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: UniformeItem) => {
    setEditingItem(item);
    setProduto(item.produto);
    setTamanho(item.tamanho);
    setCategoria(item.categoria);
    setQuantidade(item.quantidade);
    setPrecoVenda(item.precoVenda);
    setPrecoCusto(item.precoCusto || 0);
    setEstoqueMinimo(item.estoqueMinimo);
    setFornecedor(item.fornecedor || '');
    setIsItemModalOpen(true);
  };

  const handleOpenVenda = (item: UniformeItem) => {
    setVendaItemId(item.id);
    setVendaAlunoId('');
    setVendaQtd(1);
    setVendaValorTotal(item.precoVenda);
    setIsVendaModalOpen(true);
  };

  const handleOpenMovements = (item: UniformeItem) => {
    setSelectedItemName(`${item.produto} (Tam: ${item.tamanho})`);
    setSelectedItemMovs(item.historicoMovimentacao || []);
    setIsMovementModalOpen(true);
  };

  const handleVendaQtyChange = (qtdStr: string) => {
    const qtd = parseInt(qtdStr) || 1;
    setVendaQtd(qtd);
    const item = uniformes.find(u => u.id === vendaItemId);
    if (item) {
      setVendaValorTotal(item.precoVenda * qtd);
    }
  };

  const handleVendaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendaItemId) return;
    if (!vendaAlunoId) {
      alert('Selecione o aluno comprador.');
      return;
    }

    const itemObj = uniformes.find(u => u.id === vendaItemId);
    if (!itemObj) return;

    if (itemObj.quantidade < vendaQtd) {
      alert('Impossível registrar faturamento! Estoque insuficiente.');
      return;
    }

    venderUniforme(vendaItemId, vendaAlunoId, vendaQtd, vendaValorTotal);
    setIsVendaModalOpen(false);
    alert('Venda registrada e saída de estoque computada com sucesso!');
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto.trim()) {
      alert('Por favor, informe o nome do produto.');
      return;
    }

    const payload = {
      produto,
      tamanho,
      categoria,
      quantidade,
      precoVenda,
      precoCusto,
      estoqueMinimo,
      fornecedor: fornecedor.trim() || undefined
    };

    if (editingItem) {
      updateUniformeItem({
        ...editingItem,
        ...payload,
        id: editingItem.id,
        historicoMovimentacao: editingItem.historicoMovimentacao || []
      } as UniformeItem);
    } else {
      addUniformeItem(payload);
    }

    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Remover item "${name}" do inventário do dojo?`)) {
      deleteUniformeItem(id);
    }
  };

  // Filter items in real time
  const filteredUniformes = uniformes.filter(item => {
    const matchesSearch = item.produto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || item.categoria === selectedCategory;
    const matchesCritico = stockStatusFilter === 'todos' || item.quantidade <= item.estoqueMinimo;
    return matchesSearch && matchesCategory && matchesCritico;
  });

  // Calculate global profit metrics
  const totalSalesRevenue = vendas.reduce((acc, current) => acc + current.valorTotal, 0);
  const totalSalesCost = vendas.reduce((acc, current) => acc + (current.valorCustoTotal || 0), 0);
  const totalNetProfit = totalSalesRevenue - totalSalesCost;

  // Find out counts for critical stock warning
  const criticalItemsCount = uniformes.filter(item => item.quantidade <= item.estoqueMinimo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-amber-500/20 text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" /> Controle de Estoque & Uniformes
          </h2>
          <p className="text-xs text-slate-400 mt-1">Planeje investimentos de estoque, fornecedores, lucro líquido consolidado e controle de vendas rápidas.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleOpenNewItem}
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition uppercase"
          >
            <Plus className="w-4 h-4 text-slate-950" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Financial stats summary card block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total revenue */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Faturamento Bruto</span>
            <p className="text-xl font-bold text-slate-800">R$ {totalSalesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <span className="p-3 bg-amber-50 rounded-xl text-amber-600 font-extrabold text-sm">
            R$
          </span>
        </div>

        {/* Total purchase costs */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Custos Consolidados</span>
            <p className="text-xl font-bold text-slate-600">R$ {totalSalesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <span className="p-3 bg-slate-50 rounded-xl text-slate-400 font-extrabold text-sm">
            OUT
          </span>
        </div>

        {/* Net earnings / Profit */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              Lucro Líquido Real <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <p className="text-xl font-bold text-emerald-600">R$ {totalNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <span className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Control Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status quick switcher */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStockStatusFilter('todos')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                stockStatusFilter === 'todos' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-400'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStockStatusFilter('critico')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                stockStatusFilter === 'critico' ? 'bg-amber-500 text-slate-900 shadow-2xs' : 'text-slate-400'
              }`}
            >
              Estoque Mínimo ({criticalItemsCount})
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold focus:outline-none"
          >
            <option value="todos">Todas Categorias</option>
            <option value="Camiseta">Camisetas</option>
            <option value="Calça">Calças</option>
            <option value="Faixa">Faixas</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUniformes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl bg-white max-w-sm mx-auto p-6">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700">Nenhum uniforme encontrado</h3>
            <p className="text-xs mt-1">Tente ajustar seus termos de busca ou mudar a categoria selecionada.</p>
          </div>
        ) : (
          filteredUniformes.map(item => {
            const isLowStock = item.quantidade <= item.estoqueMinimo;
            const itemCost = item.precoCusto || 0;
            const singleProfit = item.precoVenda - itemCost;
            
            // Calc item sales total count and revenue inside 'vendas'
            const itemSalesList = vendas.filter(v => v.itemId === item.id);
            const totalQtySold = itemSalesList.reduce((acc, cur) => acc + cur.quantidade, 0);
            const totalRevenueSold = itemSalesList.reduce((acc, cur) => acc + cur.valorTotal, 0);
            const totalCostSold = itemSalesList.reduce((acc, cur) => acc + (cur.valorCustoTotal || 0), 0);
            const itemAccumProfit = totalRevenueSold - totalCostSold;

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-3xs hover:shadow-2xs transition overflow-hidden flex flex-col justify-between">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[9px] uppercase font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                        {item.categoria}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug">{item.produto}</h3>
                      {item.fornecedor && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Truck className="w-3.5 h-3.5" /> Fornecedor: <b>{item.fornecedor}</b>
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 bg-amber-500/10 text-amber-800 px-3 py-1 rounded-lg">
                      R$ {item.precoVenda.toFixed(2)}
                    </span>
                  </div>

                  {/* Stock and sizes specs list */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-50">
                    <div>
                      <p className="text-slate-400 font-medium">Tamanho:</p>
                      <span className="font-extrabold text-slate-800 text-sm">{item.tamanho}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-medium">Em Estoque:</p>
                      <span className={`font-extrabold text-sm ${isLowStock ? 'text-red-650' : 'text-slate-800'}`}>
                        {item.quantidade} un
                      </span>
                    </div>
                  </div>

                  {/* Profit details */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Preço de Custo:</span>
                      <span className="font-bold text-slate-700">R$ {itemCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Lucro p/ Unidade:</span>
                      <span className="font-bold text-emerald-600">+ R$ {singleProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/50 pt-1.5">
                      <span className="text-slate-400 font-medium">Lucro Consolidado de Vendas:</span>
                      <span className="font-bold text-emerald-700">R$ {itemAccumProfit.toFixed(2)} ({totalQtySold} sold)</span>
                    </div>
                  </div>

                  {isLowStock && (
                    <div className="bg-red-50 text-red-700 text-[10px] px-2.5 py-1.5 rounded-xl border border-red-100 flex items-center gap-2 font-bold animate-pulse">
                      <ShieldAlert className="w-4 h-4 min-w-[16px] text-red-600" />
                      Reposição Necessária! Abaixo do limite de {item.estoqueMinimo} un.
                    </div>
                  )}
                </div>

                {/* Footer action logs */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditItem(item)}
                      className="p-1.5 px-3 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-slate-600 transition font-bold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleOpenMovements(item)}
                      className="p-1 px-1.5 border border-slate-205 bg-white text-slate-500 rounded-lg hover:text-slate-800 transition"
                      title="Histórico de Entradas/Saídas"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeleteItem(item.id, item.produto)}
                      className="p-1.5 text-red-500 bg-white hover:bg-red-55 border border-red-100 rounded-lg transition"
                      title="Remover produto do estoque"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => handleOpenVenda(item)}
                      disabled={item.quantidade <= 0}
                      className={`p-2 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-black transition-all shadow-3xs uppercase ${
                        item.quantidade <= 0 
                          ? 'bg-slate-200 text-slate-400 border border-slate-350 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-600'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-slate-950" /> Vender
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Histórico Recente de Vendas do Inventário */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-slate-500" />
            Registro Diário de Faturamento de Uniformes e Materiais
          </h3>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {vendas.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-xs">Nenhuma venda consolidada na academia até o momento.</p>
          ) : (
            [...vendas].reverse().map(v => {
              const item = uniformes.find(u => u.id === v.itemId);
              const aluno = alunos.find(a => a.id === v.alunoId);
              const customNet = v.valorTotal - (v.valorCustoTotal || 0);

              return (
                <div key={v.id} className="p-4 flex flex-row items-center justify-between hover:bg-slate-50/60 gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{item?.produto || 'Produto Removido de Catálogos'}</p>
                    <p className="text-slate-400">Praticante: <span className="font-bold text-slate-700">{aluno?.nome || 'Público Geral/Inativo'}</span> • Qtd adquirida: {v.quantidade}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-800">R$ {v.valorTotal.toFixed(2)}</p>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                      Lucro + R$ {customNet.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">Data: {new Date(v.dataVenda).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Novo / Editar Item de Estoque */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <span className="font-bold font-serif text-white uppercase text-xs tracking-wider">
                {editingItem ? 'Editar Uniforme ou Equipamento' : 'Cadastrar Item de Inventário'}
              </span>
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Camiseta Oficial Garra de Águia"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as UniformeItem['categoria'])}
                    className="w-full p-2.5 border border-slate-205 rounded-xl text-sm bg-white"
                  >
                    <option value="Camiseta">Camiseta</option>
                    <option value="Calça">Calça</option>
                    <option value="Faixa">Faixa</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block uppercase">Fisico / Tamanho</label>
                  <select
                    value={tamanho}
                    onChange={(e) => setTamanho(e.target.value as UniformeItem['tamanho'])}
                    className="w-full p-2.5 border border-slate-205 rounded-xl text-sm bg-white"
                  >
                    <option value="PP">PP</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="ExG">ExG</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Único">Único</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Distribuidor / Fornecedor</label>
                <input
                  type="text"
                  placeholder="ex: Artigos Marciais Dragão, Confecção Própria PG"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Preço Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Preço de Custo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Quantidade Inicial *</label>
                  <input
                    type="number"
                    required
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Alerta de Estoque Mín *</label>
                  <input
                    type="number"
                    required
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm text-red-650"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 border border-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-800 transition uppercase tracking-wider"
                >
                  Registrar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Saída / Venda Rápida */}
      {isVendaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <span className="font-bold font-serif text-white uppercase text-xs tracking-wider">Venda Direta para Praticante</span>
              <button 
                onClick={() => setIsVendaModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVendaSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl text-xs border border-slate-100 space-y-1">
                <p className="font-black text-slate-800">Produto Ativo:</p>
                <p className="text-slate-600">{uniformes.find(u => u.id === vendaItemId)?.produto}</p>
                <p className="text-slate-400 font-bold">Tamanho: {uniformes.find(u => u.id === vendaItemId)?.tamanho} | Unitário: R$ {uniformes.find(u => u.id === vendaItemId)?.precoVenda.toFixed(2)}</p>
              </div>

              {/* Aluno que comprou */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Selecione o Praticante *</label>
                <select
                  required
                  value={vendaAlunoId}
                  onChange={(e) => setVendaAlunoId(e.target.value)}
                  className="w-full p-2.5 border border-slate-205 rounded-xl text-sm bg-white font-bold text-slate-700"
                >
                  <option value="">Selecione o Comprador</option>
                  {alunos.filter(a => a.ativo && !a.excluido).map(al => (
                    <option key={al.id} value={al.id}>{al.nome} ({al.faixaAtual || 'Sem Faixa'})</option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={vendaQtd}
                  onChange={(e) => handleVendaQtyChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Valor Total calculado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block uppercase">Valor Total Cobrado (R$)</label>
                <input
                  type="number"
                  required
                  readOnly
                  value={vendaValorTotal}
                  className="w-full p-2.5 border border-slate-150 rounded-xl text-sm font-extrabold bg-slate-100 cursor-not-allowed text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVendaModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-black rounded-xl text-xs hover:bg-emerald-700 transition uppercase tracking-wider"
                >
                  Confirmar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico de Movimentações do Produto */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-100">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-amber-500/20">
              <div className="space-y-0.5">
                <span className="font-bold text-xs uppercase text-slate-400 tracking-wider">Histórico de Fluxo</span>
                <h4 className="font-bold text-sm text-white truncate max-w-xs">{selectedItemName}</h4>
              </div>
              <button 
                onClick={() => setIsMovementModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {selectedItemMovs.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 italic">Nenhum histórico de movimentação encontrado.</p>
                ) : (
                  selectedItemMovs.map(mov => {
                    const isAddition = mov.tipo === 'entrada';
                    return (
                      <div key={mov.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5 max-w-[250px]">
                          <p className="font-semibold text-slate-500 text-[10px]">Data: {new Date(mov.data).toLocaleDateString('pt-BR')}</p>
                          <p className="font-bold text-slate-800">{mov.motivo}</p>
                          <p className="text-[10px] text-slate-400">Autor: {mov.usuario}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAddition ? (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-0.5 bg-emerald-50 border border-emerald-100 p-1 px-2 rounded-lg text-[10px]">
                              <ArrowUpRight className="w-3.5 h-3.5" /> +{mov.quantidade}
                            </span>
                          ) : (
                            <span className="text-red-650 font-extrabold flex items-center gap-0.5 bg-red-50 border border-red-105 p-1 px-2 rounded-lg text-[10px]">
                              <ArrowDownRight className="w-3.5 h-3.5" /> -{mov.quantidade}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white font-extrabold rounded-xl text-xs hover:bg-slate-800 transition"
                >
                  Fechar Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
