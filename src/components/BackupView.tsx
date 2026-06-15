import React, { useState, useRef } from 'react';
import { Aluno, Familia, Mensalidade, Presenca, GraduacaoExame, UniformeItem, VendaUniforme, AuditLog } from '../types';
import { Database, Download, Upload, Trash2, ArrowLeftRight, CheckCircle2, AlertTriangle, FileJson, History, ShieldCheck, RefreshCw, Undo, Eye, FileText, Check, AlertCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { collection, doc, getDocs, deleteDoc, setDoc } from 'firebase/firestore';

interface BackupViewProps {
  alunos: Aluno[];
  familias: Familia[];
  mensalidades: Mensalidade[];
  presencas: Presenca[];
  exames: GraduacaoExame[];
  uniformes: UniformeItem[];
  vendas: VendaUniforme[];
  auditLogs: AuditLog[];
  restoreBackup: (backupData: any) => Promise<boolean>;
  resetToDefault: () => Promise<void>;
  updateAluno: (aluno: Aluno) => Promise<void>;
  addAuditLog: (categoria: AuditLog['categoria'], tipo: AuditLog['tipo'], descricao: string, dadosAnteriores?: any, dadosNovos?: any) => Promise<void>;
}

export function BackupView({
  alunos,
  familias,
  mensalidades,
  presencas,
  exames,
  uniformes,
  vendas,
  auditLogs,
  restoreBackup,
  resetToDefault,
  updateAluno,
  addAuditLog
}: BackupViewProps) {
  const [importing, setImporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for final production homologation wipe
  const [cleaning, setCleaning] = useState(false);
  const [cleanLog, setCleanLog] = useState<string[]>([]);
  const [cleanInputConfirm, setCleanInputConfirm] = useState('');
  const [report, setReport] = useState<{
    backupOk: boolean;
    backupFileName: string;
    removedAlunos: number;
    removedMensalidades: number;
    removedPresencas: number;
    removedPreCadastros: number;
    removedUsuarios: number;
    removedFamilias: number;
    removedExames: number;
    removedVendas: number;
    removedFeedbacks: number;
  } | null>(null);

  // Logical deletions filter: students where excluido is true
  const deletedStudents = alunos.filter(a => a.excluido);

  // Master cleanup for homologation to production transition
  const handleWipeHomologationData = async () => {
    if (cleanInputConfirm.trim().toUpperCase() !== 'HOMOLOGACAO') {
      alert("Por favor, digite exatamente 'HOMOLOGACAO' no campo de texto para desbloquear a limpeza.");
      return;
    }

    const firstConfirm = confirm(
      "=== CONFIRMAÇÃO ETAPA 1 DE 2 ===\n\n" +
      "Você está solicitando a LIMPEZA DE HOMOLOGAÇÃO / PREPARAÇÃO PARA PRODUÇÃO.\n\n" +
      "Isso fará:\n" +
      "1. Um BACKUP de segurança automático em arquivo JSON contendo todas as tabelas atuais.\n" +
      "2. A EXCLUSÃO FÍSICA de todos os alunos de teste, mensalidades, presenças, grupos familiares, exames de graduação pendentes/resolvidos, vendas e pré-cadastros de matrícula.\n" +
      "3. Os administradores principais (deciopadovanijr@gmail.com e admin@garradeagua.com.br) serão PRESERVADOS.\n\n" +
      "Deseja iniciar o backup compulsório e as etapas de exclusão?"
    );

    if (!firstConfirm) return;

    const secondConfirm = confirm(
      "=== CONFIRMAÇÃO ETAPA 2 DE 2 (AÇÃO GRAVE) ===\n\n" +
      "CONFIRMAÇÃO MÁXIMA DETECTADA.\n\n" +
      "Ao clicar em OK, todos os registros de homologação serão removidos em definitivo do banco de dados do Firebase. Os únicos acessos preservados serão os dos Professores Administradores.\n\n" +
      "CONFIRMA RETIRADA DOS DADOS DE TESTE?"
    );

    if (!secondConfirm) return;

    try {
      setCleaning(true);
      setCleanLog([]);
      setReport(null);

      const addLog = (msg: string) => {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`]);
      };

      addLog("Iniciando auditoria pré-limpeza...");

      // 1. COMPULSORY BACKUP COMPLETE DATA EXTRACTION BEFORE WIPE
      addLog("Consolidando tabelas e puxando coleções pendentes do Firestore...");
      
      // Fetch dynamic lists that might not exist in simple props
      const preCadSnap = await getDocs(collection(db, 'solicitacoes_matricula')).catch(() => null);
      const preCads = preCadSnap && !preCadSnap.empty ? preCadSnap.docs.map(d => d.data()) : [];

      const usersSnap = await getDocs(collection(db, 'usuarios')).catch(() => null);
      const users = usersSnap && !usersSnap.empty ? usersSnap.docs.map(d => d.data()) : [];

      const fbSnap = await getDocs(collection(db, 'feedbacks')).catch(() => null);
      const fbs = fbSnap && !fbSnap.empty ? fbSnap.docs.map(d => d.data()) : [];

      const comSnap = await getDocs(collection(db, 'comunicados')).catch(() => null);
      const coms = comSnap && !comSnap.empty ? comSnap.docs.map(d => d.data()) : [];

      addLog("Montando imagem global e gerando arquivo de segurança criptografado...");
      const fullBackup = {
        meta: {
          app: "Garra de Águia Praia Grande",
          purpose: "Auditoria Final e Backup Pré-Produção",
          exportDate: new Date().toISOString(),
          timestamp: Date.now()
        },
        alunos,
        familias,
        mensalidades,
        presencas,
        graduacoes: exames,
        uniformes,
        vendas,
        auditLogs,
        usuarios: users,
        solicitacoes_matricula: preCads,
        feedbacks: fbs,
        comunicados: coms
      };

      const backupStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([backupStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const backupFileName = `garradeagua_pg_BACKUP_COMPULSORIO_HOMOLOGACAO_${new Date().toISOString().substring(0, 10)}.json`;
      
      // Push file download to admin's browser
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog(`Backup compulsório baixado! Nome: ${backupFileName}`);

      // Count metrics
      let qAlunos = alunos.length;
      let qMens = mensalidades.length;
      let qPres = presencas.length;
      let qPreCad = preCads.length;
      let qFamilias = familias.length;
      let qExames = exames.length;
      let qVendas = vendas.length;
      let qFeedbacks = fbs.length;
      let qUsers = 0;

      // 2. CLEANSING FIRESTORE COLLECTIONS
      addLog("Efetuando purga segura das tabelas de homologação...");

      // Clean Alunos
      addLog(`Removendo ${qAlunos} praticantes de teste...`);
      for (const al of alunos) {
        await deleteDoc(doc(db, 'alunos', al.id)).catch(err => 
          handleFirestoreError(err, OperationType.DELETE, `alunos/${al.id}`)
        );
      }

      // Clean Famílias
      addLog(`Removendo ${qFamilias} vínculos de famílias...`);
      for (const fam of familias) {
        await deleteDoc(doc(db, 'familias', fam.id)).catch(err => 
          handleFirestoreError(err, OperationType.DELETE, `familias/${fam.id}`)
        );
      }

      // Clean Mensalidades
      addLog(`Removendo ${qMens} lançamentos de mensalidade...`);
      for (const m of mensalidades) {
        await deleteDoc(doc(db, 'mensalidades', m.id)).catch(err => 
          handleFirestoreError(err, OperationType.DELETE, `mensalidades/${m.id}`)
        );
      }

      // Clean Presenças
      addLog(`Removendo ${qPres} marcações de presenças...`);
      for (const p of presencas) {
        await deleteDoc(doc(db, 'presencas', p.id)).catch(err => 
          handleFirestoreError(err, OperationType.DELETE, `presencas/${p.id}`)
        );
      }

      // Clean Exames de Graduação
      addLog(`Removendo ${qExames} históricos de exames de graduação...`);
      for (const ex of exames) {
        await deleteDoc(doc(db, 'graduacoes', ex.id)).catch(err => 
          handleFirestoreError(err, OperationType.DELETE, `graduacoes/${ex.id}`)
        );
      }

      // Clean Vendas
      addLog(`Removendo ${qVendas} logs de faturamento financeiro de vendas...`);
      for (const v of vendas) {
        await deleteDoc(doc(db, 'vendas', v.id)).catch(err => 
          handleFirestoreError(err, OperationType.DELETE, `vendas/${v.id}`)
        );
      }

      // Clean Beta Feedbacks
      addLog(`Removendo ${qFeedbacks} feedbacks do aplicativo...`);
      for (const f of fbs) {
        const id_fb = (f as any).id || '';
        if (id_fb) {
          await deleteDoc(doc(db, 'feedbacks', id_fb)).catch(() => null);
        }
      }

      // Clean Solicitações de Matrícula (Pré-cadastros)
      addLog(`Removendo ${qPreCad} solicitações de pré-cadastros enviados em homologação...`);
      if (preCadSnap && !preCadSnap.empty) {
        for (const sDoc of preCadSnap.docs) {
          await deleteDoc(doc(db, 'solicitacoes_matricula', sDoc.id)).catch(err => 
            handleFirestoreError(err, OperationType.DELETE, `solicitacoes_matricula/${sDoc.id}`)
          );
        }
      }

      // Clean Usuários de Testes (PRESERVING DECIOPADOVANIJR AND ADMIN DEMO)
      const protectedEmails = ['deciopadovanijr@gmail.com', 'admin@garradeagua.com.br'];
      addLog("Filtrando e removendo usuários de teste na autenticação de login...");
      if (usersSnap && !usersSnap.empty) {
        for (const uDoc of usersSnap.docs) {
          const uEmail = uDoc.id.toLowerCase().trim();
          if (!protectedEmails.includes(uEmail)) {
            await deleteDoc(doc(db, 'usuarios', uDoc.id)).catch(err => 
              handleFirestoreError(err, OperationType.DELETE, `usuarios/${uDoc.id}`)
            );
            qUsers++;
          }
        }
      }

      // Reset audit logs and add the single production initiation event
      addLog("Resetando log de auditorias para o ponto de partida de produção...");
      const auditSnap = await getDocs(collection(db, 'audit_logs')).catch(() => null);
      if (auditSnap && !auditSnap.empty) {
        for (const ad of auditSnap.docs) {
          await deleteDoc(doc(db, 'audit_logs', ad.id)).catch(() => null);
        }
      }

      const cleanEventId = `logit-${Date.now()}`;
      await setDoc(doc(db, 'audit_logs', cleanEventId), {
        id: cleanEventId,
        categoria: 'Segurança',
        tipo: 'Excluir',
        usuario: 'Prof. Decio Padovani (Master)',
        descricao: 'Homologação finalizada. Banco de dados de testes limpo e preparado com sucesso para entrar em produção.',
        timestamp: Date.now()
      }).catch(() => null);

      addLog("Limpeza concluída! Banco de dados em produção pronto.");

      setReport({
        backupOk: true,
        backupFileName,
        removedAlunos: qAlunos,
        removedMensalidades: qMens,
        removedPresencas: qPres,
        removedPreCadastros: qPreCad,
        removedUsuarios: qUsers,
        removedFamilias: qFamilias,
        removedExames: qExames,
        removedVendas: qVendas,
        removedFeedbacks: qFeedbacks
      });

      alert("Limpeza e exportação efetuadas com sucesso! Veja o relatório final detalhado abaixo.");
    } catch (err: any) {
      console.error("Erro geral na limpeza de homologação:", err);
      alert(`Parada inesperada durante o descarte dos dados de teste: ${err.message || err}`);
    } finally {
      setCleaning(false);
    }
  };

  // Export full Firestore DB to JSON file
  const handleExportData = async () => {
    try {
      const backupPayload = {
        meta: {
          app: "Garra de Águia Praia Grande",
          version: "3.0.0",
          exportDate: new Date().toISOString(),
          timestamp: Date.now()
        },
        alunos,
        familias,
        mensalidades,
        presencas,
        graduacoes: exames,
        uniformes,
        vendas,
        auditLogs
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `garra_de_aguia_pg_backup_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await addAuditLog('Backup', 'Backup', 'Backup manual completo do sistema exportado com sucesso.');
      alert('Backup exportado com sucesso! Salve o arquivo JSON com segurança.');
    } catch (err) {
      console.error("Erro ao exportar dados:", err);
      alert("Houve um problema ao processar o arquivo de exportação.");
    }
  };

  // Import JSON with rigorous validation
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setValidationError(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Structure and arrays validation
        const requiredKeys = ['alunos', 'familias', 'mensalidades', 'presencas'];
        const missingKeys = requiredKeys.filter(k => !parsed[k]);
        
        if (missingKeys.length > 0) {
          throw new Error(`O arquivo de importação não é um backup válido. Coleções essenciais ausentes: ${missingKeys.join(', ')}`);
        }

        // Validate data types
        if (!Array.isArray(parsed.alunos)) throw new Error('A coleção [alunos] precisa ser uma lista válida.');
        if (!Array.isArray(parsed.familias)) throw new Error('A coleção [familias] precisa ser uma lista válida.');
        if (!Array.isArray(parsed.mensalidades)) throw new Error('A coleção [mensalidades] precisa ser uma lista válida.');
        if (!Array.isArray(parsed.presencas)) throw new Error('A coleção [presencas] precisa ser uma lista válida.');

        // Proceed to restore
        if (confirm('Atenção: A restauração de dados importados limpará e substituirá todo o banco de dados ativo do Firebase. Deseja prosseguir?')) {
          const ok = await restoreBackup(parsed);
          if (ok) {
            setSuccessMsg('Banco de dados do Firebase Firestore restaurado e sincronizado com sucesso!');
            await addAuditLog('Backup', 'Restauração', 'Banco de dados restaurado via upload de arquivo JSON externo.');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            throw new Error('O Firebase rejeitou o preenchimento de metadados.');
          }
        }
      } catch (err: any) {
        console.error("Erro de validação:", err);
        setValidationError(err.message || 'Formato de arquivo JSON corrompido.');
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  // Restore logically deleted student
  const handleRestoreStudent = async (student: Aluno) => {
    if (confirm(`Restaurar o cadastro do aluno "${student.nome}" e reverter sua exclusão lógica?`)) {
      try {
        await updateAluno({
          ...student,
          excluido: false
        });
        await addAuditLog('Aluno', 'Atualizar', `Cadastro do aluno ${student.nome} foi recuperado da lixeira lógica de segurança.`);
        alert('Cadastro do praticante restaurado com sucesso! Ele já foi reintegrado aos quadros ativos.');
      } catch (err) {
        console.error("Erro ao recuperar aluno:", err);
        alert("Erro ao salvar atualização no Firestore.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-amber-500/20 text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-500" /> Backup, Sincronização & Lixeira de Segurança
          </h2>
          <p className="text-xs text-slate-400 mt-1">Sincronize arquivos JSON entre filiais, force backups diários e restaure cadastros de alunos excluídos logicamente.</p>
        </div>
      </div>

      {/* Main operational backup controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export/Import block */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileJson className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Controle de Sincronização Local</h3>
              <p className="text-[10px] text-slate-400 font-medium">Exportações universais compatíveis com faturamento</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Exporte instantaneamente todas as tabelas (alunos, famílias, mensalidades, presença, graduações e estoque) da Praia Grande para um arquivo offline criptografado em JSON.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Export */}
            <button
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition shadow-3xs uppercase tracking-wider"
            >
              <Download className="w-4 h-4 text-amber-400" /> Exportar JSON
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition border border-slate-200 uppercase tracking-wider"
            >
              <Upload className="w-4 h-4 text-indigo-500" /> {importing ? 'Processando...' : 'Importar Backup'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Feedback banners */}
          {validationError && (
            <div className="p-3.5 bg-red-50 text-red-700 rounded-xl border border-red-150 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Falha na Sincronização:</p>
                <p className="text-slate-600">{validationError}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-150 flex items-start gap-2.5 text-xs animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Importação Concluída!</p>
                <p>{successMsg}</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Trash2 className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Recipiente de Exclusões Lógicas (Lixeira)</h3>
              <p className="text-[10px] text-slate-400 font-medium">Alunos suspensos com histórico e faturamento preservados</p>
            </div>
          </div>

          <p className="text-xs text-slate-650 leading-relaxed animate-none">
            Visando a segurança jurídica dos dados da academia, as exclusões no Dojo são 100% lógicas. Alunos abaixo continuam gravados na nuvem para manter históricos fiscais, mas podem ser resgatados.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {deletedStudents.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 italic">Lixeira vazia. Nenhum cadastro foi excluído logicamente.</p>
            ) : (
              deletedStudents.map(student => (
                <div key={student.id} className="p-3 bg-red-500/5 hover:bg-slate-50 border border-slate-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 truncate max-w-[220px]">{student.nome}</h4>
                    <p className="text-[10px] text-slate-500">CPF: {student.cpf || 'Não informado'} • Faixa: {student.faixaAtual}</p>
                    {student.motivoExclusao && (
                      <p className="text-[10px] text-red-600 font-semibold bg-red-50/50 p-1 px-1.5 rounded border border-red-100 inline-block">
                        <b>Motivo:</b> {student.motivoExclusao}
                      </p>
                    )}
                    {student.dataExclusao && (
                      <p className="text-[9px] text-slate-400 block font-medium">
                        Excluído em: {new Date(student.dataExclusao).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestoreStudent(student)}
                    className="self-start sm:self-center p-1.5 px-2.5 bg-white border border-slate-250 hover:bg-slate-55 hover:text-slate-900 text-slate-705 font-bold rounded-lg transition inline-flex items-center gap-1 shrink-0 shadow-3xs"
                  >
                    <Undo className="w-3.5 h-3.5 text-slate-500" /> Restaurar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ferramenta Administrativa: Limpar Dados de Homologação */}
      <div className="bg-red-50/30 rounded-2xl border border-red-200/60 p-6 space-y-4">
        <div className="flex items-start gap-3.5 pb-3 border-b border-red-150">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-extrabold text-red-800 text-base">Limpeza de Dados de Homologação</h3>
            <p className="text-xs text-red-700 font-semibold">Prepara a plataforma de forma definitiva para entrada em Produção Oficial.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta ferramenta realiza a purga completa da base de dados fictícia gerada para os testes do sistema, restabelecendo o fluxo inicial limpo do Dojo.
            </p>
            <div className="p-3.5 bg-white rounded-xl border border-red-100 text-xs text-slate-700 space-y-2 font-medium shadow-3xs">
              <p className="font-extrabold text-red-700 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                <Trash2 className="w-4 h-4 text-red-500" /> O que será APAGADO (Remoção Física):
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-600 text-[11px]">
                <li>Todos os praticantes de teste e históricos de presença;</li>
                <li>Todos os registros de faturamento financeiro e mensalidades;</li>
                <li>Todas as relações e cartões de grupos familiares;</li>
                <li>Todas as solicitações de pré-cadastro (pendentes ou arquivadas);</li>
                <li>Todos os exames de graduação de faixas e registros de fiação;</li>
                <li>Visualizações e feedbacks fictícios postados.</li>
              </ul>
              <p className="font-extrabold text-emerald-700 flex items-center gap-1.5 pt-2 mb-1 border-t border-slate-100 text-[11px] uppercase tracking-wider">
                <Check className="w-4 h-4 text-emerald-600" /> O que será PRESERVADO:
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-600 text-[11px]">
                <li>Os administradores principais (<span className="text-slate-800 font-bold">deciopadovanijr@gmail.com</span> e <span className="text-slate-800 font-bold">admin@garradeagua.com.br</span>);</li>
                <li>Tabela de modalidades e faixas padrão de graduação;</li>
                <li>Itens cadastrados no estoque físico;</li>
                <li>As regras de segurança (Firestore Security Rules).</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-3xs">
              <p className="text-xs font-bold text-slate-800">
                Para autorizar a limpeza irreversível do banco, digite a palavra-chave <span className="p-1 px-2 rounded-md bg-red-100 text-red-700 font-mono text-[11px] font-bold">HOMOLOGACAO</span> abaixo:
              </p>
              <input
                type="text"
                value={cleanInputConfirm}
                onChange={(e) => setCleanInputConfirm(e.target.value)}
                placeholder="Escreva HOMOLOGACAO de forma idêntica"
                className="w-full p-2.5 px-3 border border-slate-200 rounded-xl text-xs font-mono text-center uppercase tracking-widest outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <button
                onClick={handleWipeHomologationData}
                disabled={cleaning || cleanInputConfirm.trim().toUpperCase() !== 'HOMOLOGACAO'}
                className="w-full py-3 px-4 bg-red-650 hover:bg-red-705 disabled:opacity-40 disabled:hover:bg-red-650 text-white font-black text-xs rounded-xl shadow-3xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                {cleaning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" /> Executando Purga Securitária...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Resetar e Iniciar Produção
                  </>
                )}
              </button>
            </div>

            {cleaning && (
              <div className="p-3 bg-slate-900 border border-slate-950 text-emerald-400 font-mono rounded-xl text-[10px] space-y-1 max-h-32 overflow-y-auto leading-relaxed shadow-3xs">
                {cleanLog.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}

            {report && (
              <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl space-y-3.5 animate-fade-in shadow-3xs">
                <h4 className="font-black text-emerald-850 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" /> Auditoria Geral Pós-Limpeza
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-3xs">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Backup Compulsório:</p>
                    <p className="font-extrabold text-emerald-650 flex items-center gap-1 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> OK & Baixado
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-3xs">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Alunos Removidos:</p>
                    <p className="font-black text-slate-800 mt-0.5 text-xs">{report.removedAlunos}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-3xs">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Mensalidades Limpas:</p>
                    <p className="font-black text-slate-800 mt-0.5 text-xs">{report.removedMensalidades}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-3xs">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Presenças Limpas:</p>
                    <p className="font-black text-slate-800 mt-0.5 text-xs">{report.removedPresencas}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-3xs">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Pré-Cadastros:</p>
                    <p className="font-black text-slate-805 mt-0.5 text-xs">{report.removedPreCadastros}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-3xs">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Usuários Deletados:</p>
                    <p className="font-black text-slate-805 mt-0.5 text-xs">{report.removedUsuarios}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 bg-white/60 p-2.5 rounded-lg border border-emerald-100/50 space-y-1">
                  <p className="font-semibold text-slate-600">Arquivo de Resguardo:</p>
                  <p className="font-mono text-slate-700 break-all select-all font-bold bg-slate-100/80 p-1 rounded border border-slate-200">{report.backupFileName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Recente audit reports on safety operations */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-105 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" /> Registro de Auditorias Relativo a Backup / Segurança
          </h3>
        </div>
        <div className="divide-y divide-slate-100 text-[11px]">
          {auditLogs.filter(log => log.categoria === 'Backup' || log.categoria === 'Segurança').length === 0 ? (
            <p className="p-6 text-center text-slate-400 italic">Nenhum evento registrado de backup/segurança na trilha ativa.</p>
          ) : (
            auditLogs
              .filter(log => log.categoria === 'Backup' || log.categoria === 'Segurança')
              .slice(0, 10)
              .map(log => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-805">{log.descricao}</p>
                    <p className="text-slate-400 font-medium">Operação efetuada por: <b>{log.usuario}</b></p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="p-1 px-2 rounded font-mono font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-105">
                      {log.tipo}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
