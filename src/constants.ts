import { GraduacaoFaixa } from './types';

export const PRECO_PLANOS = {
  '1_aula': 120.00,
  '2_aulas': 150.00,
  '3_aulas': 180.00,
  '4_aulas': 210.00,
  'TotalPass': 0.00, // TotalPass é pago pela plataforma corporativa por repasses
  'Avulsa': 40.00    // Preço cobrado por aula avulsa avulsa
} as const;

export const FAIXAS_KUNG_FU: GraduacaoFaixa[] = [
  'Preparatória - Branca',
  '1ª Fase - Branca Ponta Amarela',
  '2ª Fase - Branca Ponta Verde',
  '3ª Fase - Verde',
  '4ª Fase - Verde Ponta Marrom',
  '5ª Fase - Marrom',
  '6ª Fase - Marrom Ponta Preta',
  '7ª Fase - Preta',
  '1º Dhuen',
  '2º Dhuen',
  '3º Dhuen',
  '4º Dhuen',
  '5º Dhuen',
  '6º Dhuen',
  '7º Dhuen',
  '8º Dhuen',
  '9º Dhuen'
];

export const FAIXAS_BOXE_CHINES: GraduacaoFaixa[] = [
  'Branca',
  'Laranja',
  'Vermelha',
  'Azul',
  'Marrom',
  'Preta'
];

export const FAIXAS_TAI_CHI: GraduacaoFaixa[] = [
  'Branca',
  'Branca Ponta Amarela',
  'Branca Ponta Verde',
  'Verde'
];

export interface RegraGraduacao {
  horasMinimas: number;
  mesesMinimos: number;
}

export const REGRAS_KUNG_FU: Record<string, RegraGraduacao> = {
  'Preparatória - Branca': { horasMinimas: 48, mesesMinimos: 4 },
  '1ª Fase - Branca Ponta Amarela': { horasMinimas: 72, mesesMinimos: 6 },
  '2ª Fase - Branca Ponta Verde': { horasMinimas: 120, mesesMinimos: 10 },
  '3ª Fase - Verde': { horasMinimas: 142, mesesMinimos: 12 },
  '4ª Fase - Verde Ponta Marrom': { horasMinimas: 288, mesesMinimos: 24 },
  '5ª Fase - Marrom': { horasMinimas: 288, mesesMinimos: 24 },
  '6ª Fase - Marrom Ponta Preta': { horasMinimas: 432, mesesMinimos: 36 },
  '7ª Fase - Preta': { horasMinimas: 576, mesesMinimos: 48 },
  
  // also map old values for backwards compatibility
  'Faixa Branca (Preparatória)': { horasMinimas: 48, mesesMinimos: 4 },
  'Faixa Branca Lista Amarela': { horasMinimas: 72, mesesMinimos: 6 },
  'Faixa Branca Lista Verde': { horasMinimas: 120, mesesMinimos: 10 },
  'Faixa Verde': { horasMinimas: 142, mesesMinimos: 12 },
  'Faixa Verde Lista Marrom': { horasMinimas: 288, mesesMinimos: 24 },
  'Faixa Marrom': { horasMinimas: 288, mesesMinimos: 24 },
  'Faixa Marrom Lista Preta': { horasMinimas: 432, mesesMinimos: 36 },
  'Faixa Preta': { horasMinimas: 576, mesesMinimos: 48 }
};

