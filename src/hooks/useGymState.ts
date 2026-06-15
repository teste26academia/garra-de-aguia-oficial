import { useState, useEffect } from 'react';
import { Aluno, Familia, Mensalidade, Presenca, GraduacaoExame, UniformeItem, VendaUniforme, AuditLog, AlunoHistoricoItem, EstoqueMovimentacao, Usuario, Comunicado, ModalidadeAluno, BetaFeedback, SolicitacaoMatricula } from '../types';
import { PRECO_PLANOS, REGRAS_KUNG_FU } from '../constants';
import { db, auth, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';

export function migrateAluno(al: Aluno): Aluno {
  const updated = { ...al };
  let needsChange = false;

  // 1. Migrate single modalidade to multiple modalities array
  let currentModalities: string[] = [];
  if (updated.modalidades && Array.isArray(updated.modalidades)) {
    currentModalities = [...updated.modalidades];
  } else if (updated.modalidade) {
    let singleMod = updated.modalidade as string;
    if (singleMod === 'Boxe Chinês / Sanda') {
      singleMod = 'Boxe Chinês';
    }
    currentModalities = [singleMod];
    needsChange = true;
  } else {
    currentModalities = ['Kung Fu Garra de Águia'];
    needsChange = true;
  }

  // Map any remaining 'Boxe Chinês / Sanda' inside currentModalities
  const mappedModalities = currentModalities.map(m => m === 'Boxe Chinês / Sanda' ? 'Boxe Chinês' : m);
  if (JSON.stringify(mappedModalities) !== JSON.stringify(updated.modalidades)) {
    updated.modalidades = mappedModalities;
    needsChange = true;
  }

  // 2. Initialize dictionaries for modality-independent graduation
  if (!updated.faixasPorModalidade) {
    updated.faixasPorModalidade = {};
    needsChange = true;
  }
  if (!updated.horasPorModalidade) {
    updated.horasPorModalidade = {};
    needsChange = true;
  }
  if (!updated.tempoNaFaixaPorModalidade) {
    updated.tempoNaFaixaPorModalidade = {};
    needsChange = true;
  }
  if (!updated.elegivelExamePorModalidade) {
    updated.elegivelExamePorModalidade = {};
    needsChange = true;
  }
  if (!updated.dataUltimaGraduacaoPorModalidade) {
    updated.dataUltimaGraduacaoPorModalidade = {};
    needsChange = true;
  }

  // 3. Populate default values for each selected modality
  updated.modalidades.forEach(mod => {
    // Determine the belt string to migrate from
    let beltToMigrateFrom = '';
    
    if (updated.faixasPorModalidade && updated.faixasPorModalidade[mod]) {
      beltToMigrateFrom = updated.faixasPorModalidade[mod];
    } else {
      // Fallback to top-level faixaAtual if this was the original primary modality
      const isOriginalPrimary = (((al.modalidade as string) === 'Boxe Chinês / Sanda') ? 'Boxe Chinês' : (al.modalidade as string)) === mod || (!al.modalidade && mod === 'Kung Fu Garra de Águia');
      if (isOriginalPrimary && al.faixaAtual) {
        beltToMigrateFrom = al.faixaAtual;
      } else {
        if (mod === 'Kung Fu Garra de Águia') {
          beltToMigrateFrom = 'Preparatória - Branca';
        } else {
          beltToMigrateFrom = 'Branca';
        }
      }
      needsChange = true;
    }

    // Convert old names to new official names
    let convertedBelt = beltToMigrateFrom;
    if (mod === 'Kung Fu Garra de Águia') {
      if (convertedBelt === 'Faixa Branca (Preparatória)' || convertedBelt === 'Branca' || convertedBelt === '') {
        convertedBelt = 'Preparatória - Branca';
      } else if (convertedBelt === 'Faixa Branca Lista Amarela' || convertedBelt === 'Amarela') {
        convertedBelt = '1ª Fase - Branca Ponta Amarela';
      } else if (convertedBelt === 'Faixa Branca Lista Verde') {
        convertedBelt = '2ª Fase - Branca Ponta Verde';
      } else if (convertedBelt === 'Faixa Verde') {
        convertedBelt = '3ª Fase - Verde';
      } else if (convertedBelt === 'Faixa Verde Lista Marrom' || convertedBelt === 'Azul' || convertedBelt === 'Roxa') {
        convertedBelt = '4ª Fase - Verde Ponta Marrom';
      } else if (convertedBelt === 'Faixa Marrom') {
        convertedBelt = '5ª Fase - Marrom';
      } else if (convertedBelt === 'Faixa Marrom Lista Preta') {
        convertedBelt = '6ª Fase - Marrom Ponta Preta';
      } else if (convertedBelt === 'Faixa Preta' || convertedBelt.includes('Toan')) {
        convertedBelt = '7ª Fase - Preta';
      }
    } else if (mod === 'Boxe Chinês') {
      if (convertedBelt.startsWith('Faixa ')) {
        convertedBelt = convertedBelt.replace('Faixa ', '');
      }
      if (convertedBelt === '') {
        convertedBelt = 'Branca';
      }
    } else if (mod === 'Tai Chi Chuan') {
      if (convertedBelt.startsWith('Faixa ')) {
        convertedBelt = convertedBelt.replace('Faixa ', '');
      }
      if (convertedBelt === '' || convertedBelt === 'Preparatória') {
        convertedBelt = 'Branca';
      }
    }

    if (updated.faixasPorModalidade![mod] !== convertedBelt) {
      updated.faixasPorModalidade![mod] = convertedBelt;
      needsChange = true;
    }

    // Hours
    if (updated.horasPorModalidade![mod] === undefined) {
      const isOriginalPrimary = (((al.modalidade as string) === 'Boxe Chinês / Sanda') ? 'Boxe Chinês' : (al.modalidade as string)) === mod || (!al.modalidade && mod === 'Kung Fu Garra de Águia');
      updated.horasPorModalidade![mod] = (isOriginalPrimary && al.horasAcumuladas !== undefined) ? al.horasAcumuladas : 0;
      needsChange = true;
    }

    // Month duration on belt
    if (updated.tempoNaFaixaPorModalidade![mod] === undefined) {
      const isOriginalPrimary = (((al.modalidade as string) === 'Boxe Chinês / Sanda') ? 'Boxe Chinês' : (al.modalidade as string)) === mod || (!al.modalidade && mod === 'Kung Fu Garra de Águia');
      updated.tempoNaFaixaPorModalidade![mod] = (isOriginalPrimary && al.tempoNaFaixaMeses !== undefined) ? al.tempoNaFaixaMeses : 0;
      needsChange = true;
    }

    // Last graduation date
    if (!updated.dataUltimaGraduacaoPorModalidade![mod]) {
      const isOriginalPrimary = (((al.modalidade as string) === 'Boxe Chinês / Sanda') ? 'Boxe Chinês' : (al.modalidade as string)) === mod || (!al.modalidade && mod === 'Kung Fu Garra de Águia');
      updated.dataUltimaGraduacaoPorModalidade![mod] = (isOriginalPrimary && al.dataUltimaGraduacao) ? al.dataUltimaGraduacao : (al.dataMatricula || new Date().toISOString().substring(0, 10));
      needsChange = true;
    }

    // Compute independent eligibility
    const belt = updated.faixasPorModalidade![mod];
    const hr = updated.horasPorModalidade![mod] || 0;
    const tp = updated.tempoNaFaixaPorModalidade![mod] || 0;
    let isEligible = false;

    if (mod === 'Kung Fu Garra de Águia') {
      const rule = REGRAS_KUNG_FU[belt];
      if (rule) {
        isEligible = (hr >= rule.horasMinimas) && (tp >= rule.mesesMinimos);
      }
    } else {
      isEligible = hr >= 30; // standard milestone for non-KungFu
    }

    if (updated.elegivelExamePorModalidade![mod] !== isEligible) {
      updated.elegivelExamePorModalidade![mod] = isEligible;
      needsChange = true;
    }
  });

  // 4. Update top-level legacy fields from the first modality to preserve backwards-compatibility
  const primaryMod = updated.modalidades[0];
  if (primaryMod) {
    if (updated.modalidade !== primaryMod) {
      updated.modalidade = primaryMod as ModalidadeAluno;
      needsChange = true;
    }
    const derivedFaixa = updated.faixasPorModalidade![primaryMod];
    if (updated.faixaAtual !== derivedFaixa) {
      updated.faixaAtual = derivedFaixa as any;
      needsChange = true;
    }
    const derivedHoras = updated.horasPorModalidade![primaryMod] || 0;
    if (updated.horasAcumuladas !== derivedHoras) {
      updated.horasAcumuladas = derivedHoras;
      needsChange = true;
    }
    const derivedTempo = updated.tempoNaFaixaPorModalidade![primaryMod] || 0;
    if (updated.tempoNaFaixaMeses !== derivedTempo) {
      updated.tempoNaFaixaMeses = derivedTempo;
      needsChange = true;
    }
    const derivedDataLast = updated.dataUltimaGraduacaoPorModalidade![primaryMod];
    if (updated.dataUltimaGraduacao !== derivedDataLast) {
      updated.dataUltimaGraduacao = derivedDataLast;
      needsChange = true;
    }
    const derivedEligible = updated.elegivelExamePorModalidade![primaryMod] || false;
    if (updated.elegivelExame !== derivedEligible) {
      updated.elegivelExame = derivedEligible;
      needsChange = true;
    }
  }

  return updated;
}

export function useGymState(isLoggedIn = false, userRole: 'admin' | 'aluno' | null = null, alunoId: string = '') {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [exames, setExames] = useState<GraduacaoExame[]>([]);
  const [uniformes, setUniformes] = useState<UniformeItem[]>([]);
  const [vendas, setVendas] = useState<VendaUniforme[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [feedbacks, setFeedbacks] = useState<BetaFeedback[]>([]);
  const [solicitacoesMatricula, setSolicitacoesMatricula] = useState<SolicitacaoMatricula[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from Firestore (no mock seeds of demonstration data)
  useEffect(() => {
    if (!isLoggedIn) {
      setAlunos([]);
      setFamilias([]);
      setMensalidades([]);
      setPresencas([]);
      setExames([]);
      setUniformes([]);
      setVendas([]);
      setAuditLogs([]);
      setUsuarios([]);
      setComunicados([]);
      setFeedbacks([]);
      setLoading(false);
      return;
    }
    async function initFirestoreData() {
      try {
        setLoading(true);

        if (userRole === 'aluno' && alunoId) {
          // Zero-Trust: Load ONLY data belonging to this student
          
          // 1. Single Aluno document
          const alDoc = await getDoc(doc(db, 'alunos', alunoId)).catch(err => 
            handleFirestoreError(err, OperationType.GET, `alunos/${alunoId}`)
          );
          let loadedAlunos: Aluno[] = [];
          if (alDoc && alDoc.exists()) {
            const rawAl = alDoc.data() as Aluno;
            const migrated = migrateAluno(rawAl);
            if (JSON.stringify(migrated) !== JSON.stringify(rawAl)) {
              setDoc(doc(db, 'alunos', rawAl.id), cleanUndefined(migrated)).catch(err => 
                handleFirestoreError(err, OperationType.UPDATE, `alunos/${rawAl.id}`)
              );
            }
            loadedAlunos = [migrated];
          }
          setAlunos(loadedAlunos);

          // 2. Clear Famílias (Not needed / unauthorized)
          setFamilias([]);

          // 3. Filtered Mensalidades
          const qMens = query(collection(db, 'mensalidades'), where('alunoId', '==', alunoId));
          const mensSnap = await getDocs(qMens).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'mensalidades')
          );
          const rawMens = mensSnap.empty ? [] : mensSnap.docs.map(d => d.data() as Mensalidade);
          // Deduplicate by ID
          const finalMens: Mensalidade[] = [];
          const seenMens = new Set<string>();
          for (const m of rawMens) {
            if (!seenMens.has(m.id)) {
              seenMens.add(m.id);
              finalMens.push(m);
            }
          }
          setMensalidades(finalMens);

          // 4. Filtered Presenças
          const qPres = query(collection(db, 'presencas'), where('alunoId', '==', alunoId));
          const presSnap = await getDocs(qPres).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'presencas')
          );
          const finalPres = presSnap.empty ? [] : presSnap.docs.map(d => d.data() as Presenca);
          setPresencas(finalPres);

          // 5. Filtered Graduações
          const qEx = query(collection(db, 'graduacoes'), where('alunoId', '==', alunoId));
          const exSnap = await getDocs(qEx).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'graduacoes')
          );
          const finalEx = exSnap.empty ? [] : exSnap.docs.map(d => d.data() as GraduacaoExame);
          setExames(finalEx);

          // 6. Clear Uniformes (Not needed for simple student screen)
          setUniformes([]);

          // 7. Filtered Vendas
          const qVendas = query(collection(db, 'vendas'), where('alunoId', '==', alunoId));
          const vendasSnap = await getDocs(qVendas).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'vendas')
          );
          const finalVendas = vendasSnap.empty ? [] : vendasSnap.docs.map(d => d.data() as VendaUniforme);
          setVendas(finalVendas);

          // 8. Clear Logs of Audit
          setAuditLogs([]);

          // 9. Clear Usuários
          setUsuarios([]);

          // 10. Comunicados (Publicly visible to students)
          const comSnap = await getDocs(collection(db, 'comunicados')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'comunicados')
          );
          const finalComunicados = comSnap.empty ? [] : comSnap.docs.map(d => d.data() as Comunicado);
          finalComunicados.sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime());
          setComunicados(finalComunicados);

          // 11. Clear Feedbacks / Matriculas lists
          setFeedbacks([]);
          setSolicitacoesMatricula([]);

        } else if (userRole === 'admin') {
          // Admin Mode: Load full datasets as normal

          // 1. Alunos
          const alunosSnap = await getDocs(collection(db, 'alunos')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'alunos')
          );
          const rawAlunos = alunosSnap.empty ? [] : alunosSnap.docs.map(d => d.data() as Aluno);
          const finalAlunos = rawAlunos.map(a => {
            const migrated = migrateAluno(a);
            if (JSON.stringify(migrated) !== JSON.stringify(a)) {
              setDoc(doc(db, 'alunos', a.id), cleanUndefined(migrated)).catch(err => 
                handleFirestoreError(err, OperationType.UPDATE, `alunos/${a.id}`)
              );
            }
            return migrated;
          });
          setAlunos(finalAlunos);

          // 2. Famílias
          const familiasSnap = await getDocs(collection(db, 'familias')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'familias')
          );
          const finalFamilias = familiasSnap.empty ? [] : familiasSnap.docs.map(d => d.data() as Familia);
          setFamilias(finalFamilias);

          // 3. Mensalidades with Deduplication
          const mensSnap = await getDocs(collection(db, 'mensalidades')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'mensalidades')
          );
          const rawMensalidades = mensSnap.empty ? [] : mensSnap.docs.map(d => d.data() as Mensalidade);
          const finalMensalidades: Mensalidade[] = [];
          const seenMens = new Set<string>();
          for (const m of rawMensalidades) {
            if (!seenMens.has(m.id)) {
              seenMens.add(m.id);
              finalMensalidades.push(m);
            }
          }
          setMensalidades(finalMensalidades);

          // 4. Presenças
          const presSnap = await getDocs(collection(db, 'presencas')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'presencas')
          );
          const finalPresencas = presSnap.empty ? [] : presSnap.docs.map(d => d.data() as Presenca);
          setPresencas(finalPresencas);

          // 5. Graduações (Exames)
          const exSnap = await getDocs(collection(db, 'graduacoes')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'graduacoes')
          );
          const finalExames = exSnap.empty ? [] : exSnap.docs.map(d => d.data() as GraduacaoExame);
          setExames(finalExames);

          // 6. Uniformes (Estoque)
          const uniSnap = await getDocs(collection(db, 'uniformes')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'uniformes')
          );
          const finalUniformes = uniSnap.empty ? [] : uniSnap.docs.map(d => d.data() as UniformeItem);
          setUniformes(finalUniformes);

          // 7. Vendas
          const vendasSnap = await getDocs(collection(db, 'vendas')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'vendas')
          );
          const finalVendas = vendasSnap.empty ? [] : vendasSnap.docs.map(d => d.data() as VendaUniforme);
          setVendas(finalVendas);

          // 8. Logs de Auditoria
          const auditSnap = await getDocs(collection(db, 'audit_logs')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'audit_logs')
          );
          const finalAudit = auditSnap.empty ? [] : auditSnap.docs.map(d => d.data() as AuditLog);
          finalAudit.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(finalAudit);

          // 9. Usuários
          const userSnap = await getDocs(collection(db, 'usuarios')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'usuarios')
          );
          const finalUsuarios = userSnap.empty ? [] : userSnap.docs.map(d => d.data() as Usuario);
          
          // Assegurar usuário admin bootstrap robusto
          const adminId1 = 'deciopadovanijr@gmail.com';
          const hasAdminDecio = finalUsuarios.some(u => u.email === adminId1);
          if (!hasAdminDecio) {
            const newAdmin: Usuario = {
              id: adminId1,
              email: adminId1,
              role: 'admin'
            };
            await setDoc(doc(db, 'usuarios', adminId1), cleanUndefined(newAdmin)).catch(err => 
              handleFirestoreError(err, OperationType.CREATE, `usuarios/${adminId1}`)
            );
            finalUsuarios.push(newAdmin);
          }

          const adminId2 = 'admin@garradeagua.com.br';
          const hasAdminDemo = finalUsuarios.some(u => u.email === adminId2);
          if (!hasAdminDemo) {
            const newAdminDemo: Usuario = {
              id: adminId2,
              email: adminId2,
              role: 'admin'
            };
            await setDoc(doc(db, 'usuarios', adminId2), cleanUndefined(newAdminDemo)).catch(err => 
              handleFirestoreError(err, OperationType.CREATE, `usuarios/${adminId2}`)
            );
            finalUsuarios.push(newAdminDemo);
          }

          setUsuarios(finalUsuarios);

          // 10. Comunicados
          const comSnap = await getDocs(collection(db, 'comunicados')).catch(err => 
            handleFirestoreError(err, OperationType.LIST, 'comunicados')
          );
          const finalComunicados = comSnap.empty ? [] : comSnap.docs.map(d => d.data() as Comunicado);
          finalComunicados.sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime());
          setComunicados(finalComunicados);

          // 11. Feedbacks (Beta)
          const fbSnap = await getDocs(collection(db, 'feedbacks')).catch(() => null);
          const finalFeedbacks = !fbSnap || fbSnap.empty ? [] : fbSnap.docs.map(d => d.data() as BetaFeedback);
          finalFeedbacks.sort((a, b) => new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime());
          setFeedbacks(finalFeedbacks);

          // 12. Solicitações de Matrícula (Pré-cadastros)
          const solSnap = await getDocs(collection(db, 'solicitacoes_matricula')).catch(() => null);
          const finalSolicitacoes = !solSnap || solSnap.empty ? [] : solSnap.docs.map(d => d.data() as SolicitacaoMatricula);
          finalSolicitacoes.sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
          setSolicitacoesMatricula(finalSolicitacoes);
        } else {
          // Normal/default single loads or loading is finished
          setLoading(false);
          return;
        }

      } catch (err) {
        console.error("Erro geral na inicialização de dados:", err);
      } finally {
        setLoading(false);
      }
    }
    initFirestoreData();
  }, [isLoggedIn, userRole, alunoId]);

  // Registrar Auditoria
  const addAuditLog = async (categoria: AuditLog['categoria'], tipo: AuditLog['tipo'], descricao: string, dadosAnteriores?: any, dadosNovos?: any) => {
    // Evitar que visitantes anônimos gerem logs ou façam gravações antes de autenticar na sessão e no Firebase Auth
    const isSessionActive = isLoggedIn || localStorage.getItem('garradeaguia_session') === 'active';
    if (!isSessionActive || !auth.currentUser) {
      return;
    }

    const newId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLog: AuditLog = {
      id: newId,
      timestamp: new Date().toISOString(),
      categoria,
      tipo,
      usuario: auth.currentUser.email || 'Prof. Decio Padovani',
      descricao,
      dadosAnteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : undefined,
      dadosNovos: dadosNovos ? JSON.stringify(dadosNovos) : undefined
    };

    try {
      await setDoc(doc(db, 'audit_logs', newId), cleanUndefined(newLog)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `audit_logs/${newId}`)
      );
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (err) {
      console.error("Erro ao persistir auditoria:", err);
    }
  };

  // Restauração de Backup Completo JSON
  const restoreBackup = async (backupData: any) => {
    try {
      setLoading(true);

      const clearCol = async (path: string) => {
        const snap = await getDocs(collection(db, path));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, path, d.id));
        }
      };

      // Clear all
      await clearCol('alunos');
      await clearCol('familias');
      await clearCol('mensalidades');
      await clearCol('presencas');
      await clearCol('graduacoes');
      await clearCol('uniformes');
      await clearCol('vendas');
      await clearCol('audit_logs');

      // Populate
      const upload = async (path: string, items: any[]) => {
        if (!items || !Array.isArray(items)) return;
        for (const item of items) {
          if (item && item.id) {
            await setDoc(doc(db, path, item.id), cleanUndefined(item));
          }
        }
      };

      await upload('alunos', backupData.alunos || []);
      await upload('familias', backupData.familias || []);
      await upload('mensalidades', backupData.mensalidades || []);
      await upload('presencas', backupData.presencas || []);
      await upload('graduacoes', backupData.graduacoes || []);
      await upload('uniformes', backupData.uniformes || []);
      await upload('vendas', backupData.vendas || []);
      await upload('audit_logs', backupData.auditLogs || []);

      setAlunos(backupData.alunos || []);
      setFamilias(backupData.familias || []);
      setMensalidades(backupData.mensalidades || []);
      setPresencas(backupData.presencas || []);
      setExames(backupData.graduacoes || []);
      setUniformes(backupData.uniformes || []);
      setVendas(backupData.vendas || []);
      
      const updatedAudit = backupData.auditLogs || [];
      updatedAudit.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(updatedAudit);

      await addAuditLog('Backup', 'Restauração', 'Sistema restaurado manualmente via arquivo de backup JSON.');
      return true;
    } catch (err) {
      console.error("Erro ao restaurar backup:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset/Clear Firestore for fresh starting point if requested
  const resetToDefault = async () => {
    try {
      setLoading(true);

      const deleteCollection = async (path: string) => {
        const snap = await getDocs(collection(db, path)).catch(err => 
          handleFirestoreError(err, OperationType.LIST, path)
        );
        for (const d of snap.docs) {
          await deleteDoc(doc(db, path, d.id)).catch(err => 
            handleFirestoreError(err, OperationType.DELETE, `${path}/${d.id}`)
          );
        }
      };

      await deleteCollection('alunos');
      await deleteCollection('familias');
      await deleteCollection('mensalidades');
      await deleteCollection('presencas');
      await deleteCollection('graduacoes');
      await deleteCollection('uniformes');
      await deleteCollection('vendas');
      await deleteCollection('audit_logs');

      setAlunos([]);
      setFamilias([]);
      setMensalidades([]);
      setPresencas([]);
      setExames([]);
      setUniformes([]);
      setVendas([]);
      setAuditLogs([]);

      await addAuditLog('Segurança', 'Excluir', 'Todo o banco de dados foi limpo de volta para as configurações iniciais vazias.');
    } catch (err) {
      console.error("Erro ao limpar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cadastrar aluno
  const addAluno = async (aluno: Omit<Aluno, 'id'>) => {
    const newId = `aluno-${Date.now()}`;
    const creationLog: AlunoHistoricoItem = {
      id: `log-${Date.now()}-1`,
      data: new Date().toISOString().substring(0, 16).replace('T', ' '),
      tipo: 'Cadastro',
      usuario: 'Professor Decio Padovani Junior',
      descricao: `Matrícula efetuada com plano ${aluno.plano} e faixa ${aluno.faixaAtual || 'Branca'}.`
    };

    const rawAluno = { 
      ...aluno, 
      id: newId, 
      excluido: false,
      historicoAlteracoes: [creationLog]
    } as Aluno;

    const newAluno = migrateAluno(rawAluno);

    try {
      await setDoc(doc(db, 'alunos', newId), cleanUndefined(newAluno)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `alunos/${newId}`)
      );
      setAlunos(prev => [...prev, newAluno]);
      await addAuditLog('Aluno', 'Criar', `Novo aluno cadastrado: ${newAluno.nome}.`, null, newAluno);

      // Criar usuário correspondente para login do aluno
      const userId = aluno.email.trim().toLowerCase();
      const novoUsuario: Usuario = {
        id: userId,
        email: userId,
        role: 'aluno',
        alunoId: newId
      };
      await setDoc(doc(db, 'usuarios', userId), cleanUndefined(novoUsuario)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `usuarios/${userId}`)
      );
      setUsuarios(prev => [...prev, novoUsuario]);

      const mesAtual = new Date().toISOString().substring(0, 7); // YYYY-MM
      
      // Calculate suggested monthly fee with scholarships, exemptions and individual discounts
      let pOriginal = newAluno.valorMensalidade !== undefined ? newAluno.valorMensalidade : (PRECO_PLANOS[newAluno.plano] || 0);
      let descontoAplicar = 0;

      if (newAluno.isento) {
        pOriginal = 0;
      } else if (newAluno.bolsaParcial !== undefined && newAluno.bolsaParcial > 0) {
        descontoAplicar = pOriginal * (newAluno.bolsaParcial / 100);
      } else if (newAluno.descontoIndividual !== undefined && newAluno.descontoIndividual > 0) {
        descontoAplicar = newAluno.descontoIndividual;
      }

      const pFinal = Math.max(0, pOriginal - descontoAplicar);
      const diaVenc = newAluno.diaVencimentoPlanos || 10;
      const dataVenc = `${mesAtual}-${String(diaVenc).padStart(2, '0')}`;

      if (newAluno.ativo && newAluno.plano !== 'TotalPass' && pOriginal > 0) {
        const novaMensalidade: Mensalidade = {
          id: `mens-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          alunoId: newId,
          competencia: mesAtual,
          valorOriginal: pOriginal,
          desconto: descontoAplicar,
          valorFinal: pFinal,
          status: 'pendente',
          vencimento: dataVenc,
          isBolsa: newAluno.bolsaParcial ? newAluno.bolsaParcial > 0 : false,
          isIsento: newAluno.isento || false
        };

        await setDoc(doc(db, 'mensalidades', novaMensalidade.id), cleanUndefined(novaMensalidade)).catch(err => 
          handleFirestoreError(err, OperationType.CREATE, `mensalidades/${novaMensalidade.id}`)
        );
        setMensalidades(prev => [...prev, novaMensalidade]);
        await addAuditLog('Mensalidade', 'Lançamento', `Faturamento inicial gerado para ${newAluno.nome} para competência ${mesAtual}.`, null, novaMensalidade);
      }

      return newAluno;
    } catch (err) {
      console.error("Erro ao cadastrar aluno:", err);
      throw err;
    }
  };

  // Atualizar aluno
  const updateAluno = async (updatedAluno: Aluno) => {
    try {
      updatedAluno.excluido = updatedAluno.excluido || false;
      const originalAl = alunos.find(a => a.id === updatedAluno.id);

      const migratedAl = migrateAluno(updatedAluno);

      // Limpeza de campos de exclusão caso esteja sendo restaurado
      if (originalAl && originalAl.excluido && !migratedAl.excluido) {
        migratedAl.ativo = true;
        migratedAl.dataExclusao = undefined;
        migratedAl.motivoExclusao = undefined;
      }

  // Registrar histórico interno no objeto do Aluno
      const changeDesc: string[] = [];
      if (originalAl) {
        if (originalAl.faixaAtual !== migratedAl.faixaAtual) changeDesc.push(`Graduação de ${originalAl.faixaAtual} para ${migratedAl.faixaAtual}`);
        if (originalAl.plano !== migratedAl.plano) changeDesc.push(`Plano alterado de ${originalAl.plano} para ${migratedAl.plano}`);
        if (originalAl.ativo !== migratedAl.ativo) changeDesc.push(migratedAl.ativo ? 'Reativado' : 'Desativado');
        if (originalAl.familiaId !== migratedAl.familiaId) changeDesc.push('Vínculo familiar alterado');
        if (JSON.stringify(originalAl.modalidades) !== JSON.stringify(migratedAl.modalidades)) {
          changeDesc.push(`Modalidades alteradas de [${(originalAl.modalidades || []).join(', ')}] para [${migratedAl.modalidades.join(', ')}]`);
        }
        if (originalAl.excluido && !migratedAl.excluido) {
          changeDesc.push('Cadastro restaurado da lixeira lógica');
        }
      }
      const descStr = changeDesc.length > 0 ? changeDesc.join(' • ') : 'Cadastro geral atualizado';

      const changeLog: AlunoHistoricoItem = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        data: new Date().toISOString().substring(0, 16).replace('T', ' '),
        tipo: 'Edição',
        usuario: 'Professor Decio Padovani Junior',
        descricao: descStr
      };

      migratedAl.historicoAlteracoes = [changeLog, ...(originalAl?.historicoAlteracoes || [])];

      await setDoc(doc(db, 'alunos', migratedAl.id), cleanUndefined(migratedAl)).catch(err => 
        handleFirestoreError(err, OperationType.UPDATE, `alunos/${migratedAl.id}`)
      );
      setAlunos(prev => prev.map(a => a.id === migratedAl.id ? migratedAl : a));
      await addAuditLog('Aluno', 'Atualizar', `Aluno atualizado: ${migratedAl.nome}. Alteração: ${descStr}`, originalAl, migratedAl);

      // Sincronizar membros da familia relacionada
      let novasFamilias = [...familias];
      novasFamilias = novasFamilias.map(fam => {
        const tinhaId = (fam.membros || []).includes(updatedAluno.id);
        if (tinhaId && updatedAluno.familiaId !== fam.id) {
          return {
            ...fam,
            membros: (fam.membros || []).filter(id => id !== updatedAluno.id)
          };
        }
        if (updatedAluno.familiaId === fam.id && !tinhaId) {
          return {
            ...fam,
            membros: [...(fam.membros || []), updatedAluno.id]
          };
        }
        return fam;
      });

      for (const fam of novasFamilias) {
        const originalFam = familias.find(f => f.id === fam.id);
        if (originalFam && JSON.stringify(originalFam.membros) !== JSON.stringify(fam.membros)) {
          await setDoc(doc(db, 'familias', fam.id), cleanUndefined(fam)).catch(err => 
            handleFirestoreError(err, OperationType.UPDATE, `familias/${fam.id}`)
          );
        }
      }
      setFamilias(novasFamilias);
    } catch (err) {
      console.error("Erro ao atualizar aluno:", err);
    }
  };

  // Exclusão lógica (não apagar dados da coleção)
  const deleteAluno = async (id: string, motivoExclusao: string = 'Não informado') => {
    try {
      const target = alunos.find(a => a.id === id);
      if (target) {
        const changeLog: AlunoHistoricoItem = {
          id: `log-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          data: new Date().toISOString().substring(0, 16).replace('T', ' '),
          tipo: 'Excluir',
          usuario: 'Prof. Decio Padovani',
          descricao: `Exclusão lógica realizada (Motivo: ${motivoExclusao}).`
        };

        const updatedAluno: Aluno = {
          ...target,
          excluido: true,
          ativo: false, // desativa automaticamente ao excluir logicamente
          dataExclusao: new Date().toISOString(),
          motivoExclusao,
          historicoAlteracoes: [changeLog, ...(target.historicoAlteracoes || [])]
        };

        await setDoc(doc(db, 'alunos', id), cleanUndefined(updatedAluno)).catch(err => 
          handleFirestoreError(err, OperationType.UPDATE, `alunos/${id}`)
        );
        setAlunos(prev => prev.map(a => a.id === id ? updatedAluno : a));
        await addAuditLog('Aluno', 'Excluir', `Exclusão lógica do aluno: ${target.nome}. Motivo: ${motivoExclusao}`, target, updatedAluno);
      }
    } catch (err) {
      console.error("Erro ao fazer exclusão lógica de aluno:", err);
    }
  };

  // Cadastrar nova Família
  const addFamilia = async (nomeFamilia: string, percentualDesconto: number, membros: string[], membrosRoles?: Familia['membrosRoles']) => {
    const newId = `familia-${Date.now()}`;
    const histItem = {
      id: `fhist-${Date.now()}`,
      data: new Date().toISOString().substring(0, 16).replace('T', ' '),
      usuario: 'Prof. Decio Padovani',
      descricao: `Família criada com percentual de ${percentualDesconto}% de desconto.`
    };

    const novaFamilia: Familia = {
      id: newId,
      nomeFamilia,
      percentualDesconto,
      membros,
      membrosRoles: membrosRoles || [],
      historicoAlteracoes: [histItem]
    };

    try {
      await setDoc(doc(db, 'familias', newId), cleanUndefined(novaFamilia)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `familias/${newId}`)
      );
      setFamilias(prev => [...prev, novaFamilia]);
      await addAuditLog('Família', 'Criar', `Unidade Família criada: ${nomeFamilia}.`, null, novaFamilia);

      const updatedAlunos = alunos.map(aluno => {
        if (membros.includes(aluno.id)) {
          return { ...aluno, familiaId: newId };
        }
        return aluno;
      });

      for (const al of updatedAlunos) {
        if (membros.includes(al.id)) {
          await setDoc(doc(db, 'alunos', al.id), cleanUndefined(al)).catch(err => 
            handleFirestoreError(err, OperationType.UPDATE, `alunos/${al.id}`)
          );
        }
      }
      setAlunos(updatedAlunos);
    } catch (err) {
      console.error("Erro ao adicionar família:", err);
    }
  };

  // Atualizar Família
  const updateFamilia = async (updatedFam: Familia) => {
    try {
      const originalFam = familias.find(f => f.id === updatedFam.id);
      
      const histItem = {
        id: `fhist-${Date.now()}`,
        data: new Date().toISOString().substring(0, 16).replace('T', ' '),
        usuario: 'Prof. Decio Padovani',
        descricao: `Configurações familiares atualizadas.`
      };
      updatedFam.historicoAlteracoes = [histItem, ...(originalFam?.historicoAlteracoes || [])];

      await setDoc(doc(db, 'familias', updatedFam.id), cleanUndefined(updatedFam)).catch(err => 
        handleFirestoreError(err, OperationType.UPDATE, `familias/${updatedFam.id}`)
      );
      setFamilias(prev => prev.map(f => f.id === updatedFam.id ? updatedFam : f));
      await addAuditLog('Família', 'Atualizar', `Família cadastrada atualizada: ${updatedFam.nomeFamilia}.`, originalFam, updatedFam);

      const updatedAlunos = alunos.map(aluno => {
        if (aluno.familiaId === updatedFam.id && !(updatedFam.membros || []).includes(aluno.id)) {
          const { familiaId, ...rest } = aluno;
          return rest as Aluno;
        }
        if ((updatedFam.membros || []).includes(aluno.id) && aluno.familiaId !== updatedFam.id) {
          return { ...aluno, familiaId: updatedFam.id };
        }
        return aluno;
      });

      for (const al of updatedAlunos) {
        const originalAl = alunos.find(a => a.id === al.id);
        if (originalAl && originalAl.familiaId !== al.familiaId) {
          await setDoc(doc(db, 'alunos', al.id), cleanUndefined(al)).catch(err => 
            handleFirestoreError(err, OperationType.UPDATE, `alunos/${al.id}`)
          );
        }
      }
      setAlunos(updatedAlunos);
    } catch (err) {
      console.error("Erro ao atualizar família:", err);
    }
  };

  // Excluir Família
  const deleteFamilia = async (id: string) => {
    try {
      const originalFam = familias.find(f => f.id === id);
      await deleteDoc(doc(db, 'familias', id)).catch(err => 
        handleFirestoreError(err, OperationType.DELETE, `familias/${id}`)
      );
      setFamilias(prev => prev.filter(f => f.id !== id));
      await addAuditLog('Família', 'Excluir', `Família removida: ${originalFam?.nomeFamilia || id}.`, originalFam, null);

      const updatedAlunos = alunos.map(aluno => {
        if (aluno.familiaId === id) {
          const { familiaId, ...rest } = aluno;
          return rest as Aluno;
        }
        return aluno;
      });

      for (const al of updatedAlunos) {
        const originalAl = alunos.find(a => a.id === al.id);
        if (originalAl && originalAl.familiaId === id) {
          await setDoc(doc(db, 'alunos', al.id), cleanUndefined(al)).catch(err => 
            handleFirestoreError(err, OperationType.UPDATE, `alunos/${al.id}`)
          );
        }
      }
      setAlunos(updatedAlunos);
    } catch (err) {
      console.error("Erro ao excluir família:", err);
    }
  };

  // Presença lançada por professor (confirmadoPorProfessor: boolean)
  const addPresenca = async (alunoId: string, data: string, horario: string, confirmadoPorProfessor: boolean, modalidade?: string, turma?: string) => {
    const aluno = alunos.find(a => a.id === alunoId);
    const novaPresenca: Presenca = {
      id: `pres-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      alunoId,
      data,
      horario,
      confirmadoPorProfessor,
      modalidade,
      turma
    };

    try {
      await setDoc(doc(db, 'presencas', novaPresenca.id), cleanUndefined(novaPresenca)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `presencas/${novaPresenca.id}`)
      );
      setPresencas(prev => [novaPresenca, ...prev]);
      const modDesc = modalidade ? ` [${modalidade}]` : '';
      const tDesc = turma ? ` (Turma: ${turma})` : '';
      await addAuditLog('Presença', 'Criar', `Presença lançada para ${aluno?.nome || alunoId} em ${data} ${horario}${modDesc}${tDesc}. Confirmado: ${confirmadoPorProfessor}`, null, novaPresenca);
    } catch (err) {
      console.error("Erro ao lançar presença:", err);
    }
  };

  // Confirmar chamada rápida
  const confirmPresenca = async (id: string) => {
    const updated = presencas.map(p => {
      if (p.id === id) {
        return {
          ...p,
          confirmadoPorProfessor: true
        };
      }
      return p;
    });

    try {
      const match = updated.find(p => p.id === id);
      const prAluno = match ? alunos.find(a => a.id === match.alunoId) : null;
      if (match) {
        await setDoc(doc(db, 'presencas', id), cleanUndefined(match)).catch(err => 
          handleFirestoreError(err, OperationType.UPDATE, `presencas/${id}`)
        );
      }
      setPresencas(updated);
      await addAuditLog('Presença', 'Atualizar', `Chamada confirmada pelo professor para ${prAluno?.nome || 'aluno'}.`, null, match);
    } catch (err) {
      console.error("Erro ao confirmar presença:", err);
    }
  };

  const deletePresenca = async (id: string) => {
    try {
      const match = presencas.find(p => p.id === id);
      const prAluno = match ? alunos.find(a => a.id === match.alunoId) : null;
      await deleteDoc(doc(db, 'presencas', id)).catch(err => 
        handleFirestoreError(err, OperationType.DELETE, `presencas/${id}`)
      );
      setPresencas(prev => prev.filter(p => p.id !== id));
      await addAuditLog('Presença', 'Excluir', `Chamada removida para ${prAluno?.nome || 'aluno'} no dia ${match?.data}.`, match, null);
    } catch (err) {
      console.error("Erro ao excluir presença:", err);
    }
  };

  // Cadastrar mensalidade avulsa/manual
  const addMensalidade = async (alunoId: string, competencia: string, valorOriginal: number, desconto: number, vencimento: string) => {
    const aluno = alunos.find(a => a.id === alunoId);
    const novaMens: Mensalidade = {
      id: `mens-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      alunoId,
      competencia,
      valorOriginal,
      desconto,
      valorFinal: valorOriginal - desconto,
      status: 'pendente',
      vencimento
    };

    try {
      await setDoc(doc(db, 'mensalidades', novaMens.id), cleanUndefined(novaMens)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `mensalidades/${novaMens.id}`)
      );
      setMensalidades(prev => [novaMens, ...prev]);
      await addAuditLog('Mensalidade', 'Lançamento', `Faturamento lançado manualmente para o aluno ${aluno?.nome || alunoId}: Competência ${competencia}.`, null, novaMens);
    } catch (err) {
      console.error("Erro ao lançar mensalidade:", err);
    }
  };

  // Processar pagamento mensal
  const payMensalidade = async (id: string, valorFinal: number, metodo: Mensalidade['formaPagamento']) => {
    const prevM = mensalidades.find(m => m.id === id);
    const mAluno = prevM ? alunos.find(a => a.id === prevM.alunoId) : null;
    const payHistory = `Confirmado por Prof. Decio Padovani para R$ ${valorFinal.toFixed(2)} em ${new Date().toLocaleDateString('pt-BR')} via ${metodo}.`;

    const updated = mensalidades.map(m => {
      if (m.id === id) {
        return {
          ...m,
          valorFinal,
          status: 'pago' as const,
          formaPagamento: metodo,
          dataPagamento: new Date().toISOString().substring(0, 10),
          historicoPagamento: payHistory
        };
      }
      return m;
    });

    try {
      const match = updated.find(m => m.id === id);
      if (match) {
        await setDoc(doc(db, 'mensalidades', id), cleanUndefined(match)).catch(err => 
          handleFirestoreError(err, OperationType.UPDATE, `mensalidades/${id}`)
        );
      }
      setMensalidades(updated);
      await addAuditLog('Mensalidade', 'Atualizar', `Pagamento recebido de ${mAluno?.nome || 'Aluno'}. Valor: R$ ${valorFinal.toFixed(2)} via ${metodo}.`, prevM, match);
    } catch (err) {
      console.error("Erro ao efetuar pagamento:", err);
    }
  };

  const deleteMensalidade = async (id: string) => {
    try {
      const prevM = mensalidades.find(m => m.id === id);
      const mAluno = prevM ? alunos.find(a => a.id === prevM.alunoId) : null;
      await deleteDoc(doc(db, 'mensalidades', id)).catch(err => 
        handleFirestoreError(err, OperationType.DELETE, `mensalidades/${id}`)
      );
      setMensalidades(prev => prev.filter(m => m.id !== id));
      await addAuditLog('Mensalidade', 'Excluir', `Faturamento excluído para ${mAluno?.nome || 'Aluno'} (Comp: ${prevM?.competencia}).`, prevM, null);
    } catch (err) {
      console.error("Erro ao excluir faturamento:", err);
    }
  };

  // Registrar Exame de Graduação re-definido
  const addExame = async (exame: Omit<GraduacaoExame, 'id'>) => {
    const newId = `exame-${Date.now()}`;
    const novoExame: GraduacaoExame = {
      ...exame,
      avaliador: 'Professor Decio Padovani Junior', // override custom evaluator fictitious names as per guidelines
      id: newId
    };

    try {
      await setDoc(doc(db, 'graduacoes', newId), cleanUndefined(novoExame)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `graduacoes/${newId}`)
      );
      setExames(prev => [novoExame, ...prev]);

      // Atualiza automaticamente a FaixaAtual do aluno promovido no Banco
      const prAl = alunos.find(a => a.id === exame.alunoId);
      if (prAl) {
        const mod = exame.modalidade || prAl.modalidades?.[0] || prAl.modalidade || 'Kung Fu Garra de Águia';
        
        const hLog: AlunoHistoricoItem = {
          id: `log-${Date.now()}-2`,
          data: exame.dataExame,
          tipo: 'Graduação',
          usuario: 'Professor Decio Padovani Junior',
          descricao: `Exame de ${mod} aprovado. Promovido de ${exame.faixaAnterior} para ${exame.faixaAtual}.`
        };

        const nextFaixas = { ...(prAl.faixasPorModalidade || {}) };
        nextFaixas[mod] = exame.faixaAtual;

        const nextHoras = { ...(prAl.horasPorModalidade || {}) };
        nextHoras[mod] = 0;

        const nextTempos = { ...(prAl.tempoNaFaixaPorModalidade || {}) };
        nextTempos[mod] = 0;

        const nextDatas = { ...(prAl.dataUltimaGraduacaoPorModalidade || {}) };
        nextDatas[mod] = exame.dataExame;

        const nextElegiveis = { ...(prAl.elegivelExamePorModalidade || {}) };
        nextElegiveis[mod] = false;

        const intermediateAluno: Aluno = {
          ...prAl,
          faixasPorModalidade: nextFaixas,
          horasPorModalidade: nextHoras,
          tempoNaFaixaPorModalidade: nextTempos,
          dataUltimaGraduacaoPorModalidade: nextDatas,
          elegivelExamePorModalidade: nextElegiveis,
          historicoAlteracoes: [hLog, ...(prAl.historicoAlteracoes || [])]
        };
        
        const updatedAluno = migrateAluno(intermediateAluno);

        await setDoc(doc(db, 'alunos', prAl.id), cleanUndefined(updatedAluno)).catch(err => 
          handleFirestoreError(err, OperationType.UPDATE, `alunos/${prAl.id}`)
        );
        setAlunos(prev => prev.map(a => a.id === prAl.id ? updatedAluno : a));
        await addAuditLog('Graduação', 'Criar', `Exame de faixa aprovado para ${prAl.nome}: Promovido a ${exame.faixaAtual} em ${mod}.`, null, novoExame);
      }
    } catch (err) {
      console.error("Erro ao lançar exame de promoção:", err);
    }
  };

  // Adicionar Item de Estoque (Estoque)
  const addUniformeItem = async (item: Omit<UniformeItem, 'id'>) => {
    const newId = `uni-${Date.now()}`;
    const firstMov: EstoqueMovimentacao = {
      id: `mov-${Date.now()}`,
      data: new Date().toISOString().substring(0, 10),
      tipo: 'entrada',
      quantidade: item.quantidade,
      motivo: 'Estoque inicial cadastrado',
      usuario: 'Prof. Decio Padovani'
    };

    const novoItem: UniformeItem = {
      ...item,
      id: newId,
      historicoMovimentacao: [firstMov]
    };

    try {
      await setDoc(doc(db, 'uniformes', newId), cleanUndefined(novoItem)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `uniformes/${newId}`)
      );
      setUniformes(prev => [...prev, novoItem]);
      await addAuditLog('Estoque', 'Estoque Entrada', `Novo produto cadastrado no estoque: ${novoItem.produto} (Tamanho: ${novoItem.tamanho}). Qtd: ${novoItem.quantidade}`, null, novoItem);
    } catch (err) {
      console.error("Erro ao cadastrar estoque:", err);
    }
  };

  // Atualizar Item de Uniforme (Estoque) / Registrar Entrada manual
  const updateUniformeItem = async (updatedItem: UniformeItem) => {
    try {
      const originalU = uniformes.find(u => u.id === updatedItem.id);
      
      // Se quantidade aumentou, registrar entrada
      if (originalU && updatedItem.quantidade !== originalU.quantidade) {
        const diff = updatedItem.quantidade - originalU.quantidade;
        const newMov: EstoqueMovimentacao = {
          id: `mov-${Date.now()}`,
          data: new Date().toISOString().substring(0, 10),
          tipo: diff > 0 ? 'entrada' : 'saida',
          quantidade: Math.abs(diff),
          motivo: diff > 0 ? `Entrada manual: fornecedor ${updatedItem.fornecedor || 'Geral'}` : 'Saída para ajuste manual de estoque',
          usuario: 'Prof. Decio Padovani'
        };
        updatedItem.historicoMovimentacao = [newMov, ...(originalU.historicoMovimentacao || [])];
      }

      await setDoc(doc(db, 'uniformes', updatedItem.id), cleanUndefined(updatedItem)).catch(err => 
        handleFirestoreError(err, OperationType.UPDATE, `uniformes/${updatedItem.id}`)
      );
      setUniformes(prev => prev.map(u => u.id === updatedItem.id ? updatedItem : u));
      await addAuditLog('Estoque', 'Atualizar', `Produto atualizado no estoque: ${updatedItem.produto} (Tam: ${updatedItem.tamanho}). Qtd: ${updatedItem.quantidade}`, originalU, updatedItem);
    } catch (err) {
      console.error("Erro ao atualizar estoque:", err);
    }
  };

  // Excluir Item de Uniforme
  const deleteUniformeItem = async (id: string) => {
    try {
      const originalU = uniformes.find(u => u.id === id);
      await deleteDoc(doc(db, 'uniformes', id)).catch(err => 
        handleFirestoreError(err, OperationType.DELETE, `uniformes/${id}`)
      );
      setUniformes(prev => prev.filter(u => u.id !== id));
      await addAuditLog('Estoque', 'Excluir', `Produto removido de estoque: ${originalU?.produto} (Tam: ${originalU?.tamanho}).`, originalU, null);
    } catch (err) {
      console.error("Erro ao excluir estoque:", err);
    }
  };

  // Adicionar comunicado
  const addComunicado = async (com: Omit<Comunicado, 'id' | 'dataPublicacao'>) => {
    const newId = `comunicado-${Date.now()}`;
    const novoCom: Comunicado = {
      ...com,
      id: newId,
      dataPublicacao: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'comunicados', newId), cleanUndefined(novoCom)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `comunicados/${newId}`)
      );
      setComunicados(prev => [novoCom, ...prev]);
      await addAuditLog('Segurança', 'Criar', `Novo comunicado publicado: "${novoCom.titulo}".`, null, novoCom);
    } catch (err) {
      console.error("Erro ao adicionar comunicado:", err);
    }
  };

  // Remover comunicado
  const deleteComunicado = async (id: string) => {
    try {
      const originalCom = comunicados.find(c => c.id === id);
      await deleteDoc(doc(db, 'comunicados', id)).catch(err => 
        handleFirestoreError(err, OperationType.DELETE, `comunicados/${id}`)
      );
      setComunicados(prev => prev.filter(c => c.id !== id));
      await addAuditLog('Segurança', 'Excluir', `Comunicado removido: "${originalCom?.titulo || id}".`, originalCom, null);
    } catch (err) {
      console.error("Erro ao remover comunicado:", err);
    }
  };

  // Vender Uniforme para Aluno (Dedução de estoque automática)
  const venderUniforme = async (itemId: string, alunoId: string, quantidade: number, valorTotal: number) => {
    const item = uniformes.find(u => u.id === itemId);
    const aluno = alunos.find(a => a.id === alunoId);
    if (!item || item.quantidade < quantidade) {
      alert('Estoque insuficiente para essa saída!');
      return;
    }

    // Registrar movimentacao de estoque do item
    const newMov: EstoqueMovimentacao = {
      id: `mov-${Date.now()}`,
      data: new Date().toISOString().substring(0, 10),
      tipo: 'saida',
      quantidade,
      motivo: `Venda para o aluno ${aluno?.nome || 'Geral'}`,
      usuario: 'Prof. Decio Padovani'
    };

    const updatedItem: UniformeItem = {
      ...item,
      quantidade: item.quantidade - quantidade,
      historicoMovimentacao: [newMov, ...(item.historicoMovimentacao || [])]
    };

    try {
      await setDoc(doc(db, 'uniformes', updatedItem.id), cleanUndefined(updatedItem)).catch(err => 
        handleFirestoreError(err, OperationType.UPDATE, `uniformes/${updatedItem.id}`)
      );
      setUniformes(prev => prev.map(u => u.id === updatedItem.id ? updatedItem : u));

      // Calcular custo total para lucro real
      const custoRealUnitario = item.precoCusto || 0;
      const custoTot = custoRealUnitario * quantidade;

      const novaVenda: VendaUniforme = {
        id: `venda-${Date.now()}`,
        itemId,
        alunoId,
        quantidade,
        valorTotal,
        valorCustoTotal: custoTot,
        dataVenda: new Date().toISOString().substring(0, 10)
      };

      await setDoc(doc(db, 'vendas', novaVenda.id), cleanUndefined(novaVenda)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `vendas/${novaVenda.id}`)
      );
      setVendas(prev => [novaVenda, ...prev]);
      await addAuditLog('Estoque', 'Venda', `Venda de uniforme registrada: ${quantidade}x ${item.produto} para ${aluno?.nome || 'Aluno'}. Valor total: R$ ${valorTotal.toFixed(2)} (Lucro: R$ ${(valorTotal - custoTot).toFixed(2)})`, null, novaVenda);
    } catch (err) {
      console.error("Erro ao registrar venda de uniforme:", err);
    }
  };

  // Cadastrar Solicitação de Matrícula (Pré-cadastro)
  const cadastrarSolicitacaoMatricula = async (sol: Omit<SolicitacaoMatricula, 'id' | 'dataSolicitacao' | 'status'>) => {
    const newId = `sol-${Date.now()}`;
    const newSolicitacao: SolicitacaoMatricula = {
      ...sol,
      id: newId,
      dataSolicitacao: new Date().toISOString(),
      status: 'pendente'
    };
    try {
      await setDoc(doc(db, 'solicitacoes_matricula', newId), cleanUndefined(newSolicitacao)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `solicitacoes_matricula/${newId}`)
      );
      setSolicitacoesMatricula(prev => [newSolicitacao, ...prev]);
      return newSolicitacao;
    } catch (err) {
      console.error("Erro ao cadastrar solicitação de matrícula:", err);
      throw err;
    }
  };

  // Aprovar Solicitação de Matrícula
  const aprovarSolicitacaoMatricula = async (id: string) => {
    const sol = solicitacoesMatricula.find(s => s.id === id);
    if (!sol) {
      throw new Error("Solicitação não encontrada.");
    }

    const updatedSolicitacao: SolicitacaoMatricula = {
      ...sol,
      status: 'aprovado'
    };

    try {
      // 1. Atualizar status na coleção solicitacoes_matricula
      await setDoc(doc(db, 'solicitacoes_matricula', id), cleanUndefined(updatedSolicitacao)).catch(err => 
        handleFirestoreError(err, OperationType.UPDATE, `solicitacoes_matricula/${id}`)
      );

      // Atualizar estado local das solicitações
      setSolicitacoesMatricula(prev => prev.map(s => s.id === id ? updatedSolicitacao : s));

      // 2. Criar registro do Aluno (alunos)
      const studentId = 'AL' + Math.floor(1000 + Math.random() * 9000);
      const creationLog: AlunoHistoricoItem = {
        id: `log-${Date.now()}-1`,
        data: new Date().toISOString().substring(0, 16).replace('T', ' '),
        tipo: 'Cadastro',
        usuario: 'Professor Decio Padovani Junior',
        descricao: `Matrícula via aprovação de pré-cadastro efetuada com sucesso.`
      };

      const rawAluno: Aluno = {
        id: studentId,
        nome: sol.nome,
        cpf: sol.cpf.replace(/\D/g, ''),
        rg: '',
        dataNascimento: sol.dataNascimento,
        telefone: sol.telefone,
        email: sol.email.trim().toLowerCase(),
        endereco: '',
        faixaAtual: 'Preparatória - Branca',
        plano: 'Avulsa',
        valorMensalidade: 0,
        ativo: true,
        dataMatricula: new Date().toISOString().substring(0, 10),
        excluido: false,
        modalidades: sol.modalidades && sol.modalidades.length > 0 ? sol.modalidades : ['Kung Fu Garra de Águia'],
        historicoAlteracoes: [creationLog]
      };

      const newAluno = migrateAluno(rawAluno);

      await setDoc(doc(db, 'alunos', studentId), cleanUndefined(newAluno)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `alunos/${studentId}`)
      );

      setAlunos(prev => [...prev, newAluno]);

      // 3. Criar registro do Usuário (usuarios) para login do aluno
      const userId = sol.email.trim().toLowerCase();
      const novoUsuario: Usuario = {
        id: userId,
        email: userId,
        role: 'aluno',
        alunoId: studentId
      };

      await setDoc(doc(db, 'usuarios', userId), cleanUndefined(novoUsuario)).catch(err => 
        handleFirestoreError(err, OperationType.CREATE, `usuarios/${userId}`)
      );

      setUsuarios(prev => [...prev, novoUsuario]);

      // 4. Registrar auditoria
      await addAuditLog('Aluno', 'Criar', `Pré-cadastro aprovado de Aluno: ${newAluno.nome}. Acesso liberado no sistema.`, null, newAluno);
    } catch (err) {
      console.error("Erro ao aprovar pré-cadastro:", err);
      throw err;
    }
  };

  // Rejeitar Solicitação de Matrícula
  const rejeitarSolicitacaoMatricula = async (id: string) => {
    const sol = solicitacoesMatricula.find(s => s.id === id);
    if (!sol) {
      throw new Error("Solicitação não encontrada.");
    }

    const updatedSolicitacao: SolicitacaoMatricula = {
      ...sol,
      status: 'rejeitado'
    };

    try {
      // Atualizar status na coleção solicitacoes_matricula
      await setDoc(doc(db, 'solicitacoes_matricula', id), cleanUndefined(updatedSolicitacao)).catch(err => 
        handleFirestoreError(err, OperationType.UPDATE, `solicitacoes_matricula/${id}`)
      );

      // Atualizar estado local das solicitações
      setSolicitacoesMatricula(prev => prev.map(s => s.id === id ? updatedSolicitacao : s));

      // Registrar auditoria
      await addAuditLog('Aluno', 'Excluir', `Pré-cadastro rejeitado de Aluno: ${sol.nome} (E-mail: ${sol.email}). Cadastro mantido no histórico como rejeitado.`, null, updatedSolicitacao);
    } catch (err) {
      console.error("Erro ao rejeitar pré-cadastro:", err);
      throw err;
    }
  };

  return {
    alunos,
    familias,
    mensalidades,
    presencas,
    exames,
    uniformes,
    vendas,
    auditLogs,
    loading,
    addAuditLog,
    restoreBackup,
    resetToDefault,
    addAluno,
    updateAluno,
    deleteAluno,
    addFamilia,
    updateFamilia,
    deleteFamilia,
    addPresenca,
    confirmPresenca,
    deletePresenca,
    addMensalidade,
    payMensalidade,
    deleteMensalidade,
    addExame,
    addUniformeItem,
    updateUniformeItem,
    deleteUniformeItem,
    venderUniforme,
    usuarios,
    comunicados,
    feedbacks,
    addComunicado,
    deleteComunicado,
    solicitacoesMatricula,
    cadastrarSolicitacaoMatricula,
    aprovarSolicitacaoMatricula,
    rejeitarSolicitacaoMatricula
  };
}
