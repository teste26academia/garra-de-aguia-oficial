/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ModalidadeAluno = 'Kung Fu Garra de Águia' | 'Boxe Chinês' | 'Tai Chi Chuan';

export type GraduacaoFaixa =
  | 'Preparatória - Branca'
  | '1ª Fase - Branca Ponta Amarela'
  | '2ª Fase - Branca Ponta Verde'
  | '3ª Fase - Verde'
  | '4ª Fase - Verde Ponta Marrom'
  | '5ª Fase - Marrom'
  | '6ª Fase - Marrom Ponta Preta'
  | '7ª Fase - Preta'
  | '1º Dhuen'
  | '2º Dhuen'
  | '3º Dhuen'
  | '4º Dhuen'
  | '5º Dhuen'
  | '6º Dhuen'
  | '7º Dhuen'
  | '8º Dhuen'
  | '9º Dhuen'
  | 'Branca'
  | 'Laranja'
  | 'Vermelha'
  | 'Azul'
  | 'Marrom'
  | 'Preta'
  | 'Branca Ponta Amarela'
  | 'Branca Ponta Verde'
  | 'Verde'
  | 'Faixa Branca (Preparatória)'
  | 'Faixa Branca Lista Amarela'
  | 'Faixa Branca Lista Verde'
  | 'Faixa Verde'
  | 'Faixa Verde Lista Marrom'
  | 'Faixa Marrom'
  | 'Faixa Marrom Lista Preta'
  | 'Faixa Preta'
  | 'Faixa Branca'
  | 'Faixa Laranja'
  | 'Faixa Vermelha'
  | 'Faixa Azul';

export type CategoriaPlano =
  | '1_aula'
  | '2_aulas'
  | '3_aulas'
  | '4_aulas'
  | 'TotalPass'
  | 'Avulsa';

export interface AlunoHistoricoItem {
  id: string;
  data: string; // Formato: 'YYYY-MM-DD HH:MM'
  tipo: string; // Ex: 'Cadastro', 'Graduação', 'Mensalidade', 'Família', 'Documento'
  usuario: string; // Ex: 'Prof. Decio Padovani'
  descricao: string;
}

export interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  endereco: string;
  faixaAtual: GraduacaoFaixa;
  plano: CategoriaPlano;
  valorMensalidade: number;
  dataMatricula: string;
  ativo: boolean;
  familiaId?: string; // Reference to Família
  observacoes?: string;
  excluido?: boolean; // Inclusão lógica
  dataExclusao?: string; // Data da exclusão lógica
  motivoExclusao?: string; // Motivo da exclusão lógica
  // senha?: string; // REMOVIDO: Senhas nunca são salvas no banco para conformidade de segurança e LGPD

  // Novas propriedades da Fase 4 - Graduação e Modalidade
  modalidades: string[];
  modalidade?: ModalidadeAluno;
  faixasPorModalidade?: Record<string, string>;
  horasPorModalidade?: Record<string, number>;
  tempoNaFaixaPorModalidade?: Record<string, number>;
  elegivelExamePorModalidade?: Record<string, boolean>;
  dataUltimaGraduacaoPorModalidade?: Record<string, string>;
  dataUltimaGraduacao?: string; // YYYY-MM-DD
  horasAcumuladas?: number;
  tempoNaFaixaMeses?: number;
  elegivelExame?: boolean;
  observacoesGraduacao?: string;

  // Novas propriedades da Fase 3
  fotoUrl?: string; // Base64 ou URL fictícia da foto de perfil
  documentosUrls?: string[]; // Array de base64 ou URLs ocultas de documentos
  restricoesMedicas?: string; // Ex: 'Asma, evitar esforço extremo'
  contatoEmergencia?: string; // Nome + telefone do contato
  responsavelFinanceiro?: string; // Nome + CPF do resp. quando menor
  observacoesProfessor?: string; // Nota confidencial médica/pedagógica do professor
  descontoIndividual?: number; // Desconto manual padrão em reais
  bolsaParcial?: number; // Percentual de bolsa (0-100)
  isento?: boolean; // Se o aluno é totalmente isento de pagamentos
  diaVencimentoPlanos?: number; // Dia de vencimento preferido (ex: 5, 10, 15, 20, 25)
  historicoAlteracoes?: AlunoHistoricoItem[]; // Log local das alterações do Aluno
}

export interface FamiliaMemberRole {
  alunoId: string;
  parentesco: 'Pai' | 'Mãe' | 'Filho' | 'Filha' | 'Outro';
}

export interface FamiliaHistoricoItem {
  id: string;
  data: string;
  usuario: string;
  descricao: string;
}

export interface Familia {
  id: string;
  nomeFamilia: string;
  percentualDesconto: number; // Percentual de desconto (ex: 10 para 10%)
  membros: string[]; // Lista de IDs de alunos pertencentes
  membrosRoles?: FamiliaMemberRole[]; // Vinculo de parentesco
  historicoAlteracoes?: FamiliaHistoricoItem[];
}

export interface Mensalidade {
  id: string;
  alunoId: string;
  competencia: string; // Formato: 'YYYY-MM'
  valorOriginal: number;
  desconto: number; // Valor em R$ de desconto
  valorFinal: number; // Valor líquido (valorOriginal - desconto ou pago)
  vencimento: string; // Formato: 'YYYY-MM-DD'
  status: 'pago' | 'pendente' | 'atrasado';
  dataPagamento?: string; // Formato: 'YYYY-MM-DD'
  formaPagamento?: 'Pix' | 'Dinheiro' | 'Cartão' | 'TotalPass' | 'Dinheiro/Pix';
  isBolsa?: boolean; // Identifica se é bolsa parcial
  isIsento?: boolean; // Identifica se é isenção
  historicoPagamento?: string; // Detalhes ou logs adicionais de pagamento
}

export interface Presenca {
  id: string;
  alunoId: string;
  data: string; // Formato: 'YYYY-MM-DD'
  horario: string; // Formato: 'HH:MM'
  confirmadoPorProfessor: boolean; // Presença lançada/confirmada pelo professor
  modalidade?: string;
  turma?: string;
}

export interface GraduacaoExame {
  id: string;
  alunoId: string;
  faixaAnterior: GraduacaoFaixa;
  faixaAtual: GraduacaoFaixa;
  dataExame: string;
  avaliador: string;
  observacoes?: string;
  modalidade: string; // Modalidade do exame de faixa
}

export interface EstoqueMovimentacao {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  motivo: string;
  usuario: string;
}

export interface UniformeItem {
  id: string; // Document ID
  produto: string; // ex: "Camiseta de Treino Oficial Logo Garra"
  categoria: 'Camiseta' | 'Calça' | 'Faixa' | 'Outros';
  tamanho: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'ExG' | 'Infantil' | 'Único'; 
  quantidade: number; // quantidade em estoque
  estoqueMinimo: number;
  precoVenda: number;
  precoCusto?: number; // preço de custo para calculo de lucros
  fornecedor?: string; // fornecedor cadastrado
  historicoMovimentacao?: EstoqueMovimentacao[]; // histórico de movimentação do estoque
}

export interface VendaUniforme {
  id: string;
  itemId: string;
  alunoId: string;
  quantidade: number;
  valorTotal: number;
  valorCustoTotal?: number; // custo total para cálculo de lucro líquido
  dataVenda: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO String
  categoria: 'Aluno' | 'Família' | 'Mensalidade' | 'Presença' | 'Graduação' | 'Estoque' | 'Backup' | 'Segurança';
  tipo: 'Criar' | 'Atualizar' | 'Excluir' | 'Backup' | 'Restauração' | 'Estoque Entrada' | 'Venda' | 'Lançamento' | 'Login' | 'Logout';
  usuario: string;
  descricao: string;
  dadosAnteriores?: string; // JSON String
  dadosNovos?: string; // JSON String
}

export interface Usuario {
  id: string;
  email: string;
  role: 'admin' | 'aluno';
  alunoId?: string; // Opcional, apenas se for aluno
  // senha?: string; // REMOVIDO: Proibido armazenar senhas no Firestore (Authentication exclusivo)
}

export interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: 'evento' | 'exame' | 'horario' | 'geral';
  dataPublicacao: string; // ISO String ou YYYY-MM-DD
  autor: string;
}

export interface BetaFeedback {
  id: string;
  alunoId: string;
  alunoNome: string;
  tipo: 'erro' | 'sugestao' | 'dificuldade';
  descricao: string;
  dataEnvio: string; // ISO String
  status: 'pendente' | 'em_analise' | 'resolvido';
}

export interface SolicitacaoMatricula {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  modalidades: string[];
  dataSolicitacao: string; // ISO String
  status: 'pendente' | 'aprovado' | 'rejeitado';
  // senha?: string; // REMOVIDO: Pré-cadastro não armazena senha no banco de dados
}

