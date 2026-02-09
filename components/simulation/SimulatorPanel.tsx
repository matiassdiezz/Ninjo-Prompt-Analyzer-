'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  PlayCircle,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
  Play,
} from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { useSimulationStore } from '@/store/simulationStore';
import { useFlowStore } from '@/store/flowStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { LEAD_PERSONAS } from '@/lib/simulation/leadPersonas';
import { BatchReportPanel } from './BatchReportPanel';
import type { LeadPersona } from '@/types/simulation';
import type {
  SimulationMessage,
  SimulationIssue,
  SimulationOutcome,
  PersonaId,
  SimulationRun,
  PersonaResult,
} from '@/types/simulation';

interface SimulatorPanelProps {
  onClose: () => void;
}

const OUTCOME_LABELS: Record<SimulationOutcome, { label: string; color: string }> = {
  converted: { label: 'Convertido', color: 'var(--success)' },
  nurture: { label: 'Nurture', color: '#388bfd' },
  lost: { label: 'Perdido', color: 'var(--error)' },
  blocked: { label: 'Bloqueado', color: 'var(--warning)' },
  timeout: { label: 'Timeout', color: 'var(--text-muted)' },
};

const MAX_TURNS = 15;

export function SimulatorPanel({ onClose }: SimulatorPanelProps) {
  const {
    currentRun,
    testCases,
    isGeneratingTestCases,
    batchResult,
    isBatchRunning,
    batchProgress,
    startSimulation,
    addMessage,
    addIssue,
    completeSimulation,
    failSimulation,
    clearSimulation,
    setTestCases,
    setGeneratingTestCases,
    startBatch,
    updateBatchProgress,
    setBatchResult,
    clearBatch,
  } = useSimulationStore();

  const { getFlowData, nodes } = useFlowStore();
  const { currentPrompt } = useAnalysisStore();
  const { addToast } = useToastStore();

  const [selectedPersona, setSelectedPersona] = useState<LeadPersona>(LEAD_PERSONAS[0]);
  const [showIssues, setShowIssues] = useState(false);
  const [showTestCases, setShowTestCases] = useState(false);
  const [showBatchReport, setShowBatchReport] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRun?.messages]);

  // Run simulation turn by turn
  const runSimulation = useCallback(
    async (persona: LeadPersona) => {
      const flowData = getFlowData();
      if (flowData.nodes.length === 0) return;

      abortRef.current = false;
      startSimulation(persona.id, flowData);

      const allMessages: SimulationMessage[] = [];
      const allNodesVisited: string[] = [];
      let turnNumber = 1;

      while (turnNumber <= MAX_TURNS && !abortRef.current) {
        try {
          const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              flowData,
              persona,
              history: allMessages,
              promptContext: currentPrompt || undefined,
              turnNumber,
              maxTurns: MAX_TURNS,
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            failSimulation(errData.error || 'Error en la simulacion');
            return null;
          }

          const data = await response.json();

          // Add lead message
          if (data.leadMessage) {
            const leadMsg: SimulationMessage = {
              id: `lead-${turnNumber}`,
              role: 'lead',
              content: data.leadMessage,
              timestamp: Date.now(),
              currentNodeId: data.currentNodeId || undefined,
              annotation: data.annotation || undefined,
            };
            allMessages.push(leadMsg);
            addMessage(leadMsg);
          }

          // Add agent message
          if (data.agentResponse) {
            const agentMsg: SimulationMessage = {
              id: `agent-${turnNumber}`,
              role: 'agent',
              content: data.agentResponse,
              timestamp: Date.now() + 1,
              currentNodeId: data.currentNodeId || undefined,
            };
            allMessages.push(agentMsg);
            addMessage(agentMsg);
          }

          // Track nodes
          if (data.currentNodeId) allNodesVisited.push(data.currentNodeId);
          if (data.nextNodeId) allNodesVisited.push(data.nextNodeId);

          // Add issues
          if (data.issues && data.issues.length > 0) {
            data.issues.forEach((issue: SimulationIssue) => addIssue(issue));
          }

          // Check completion
          if (data.isComplete) {
            completeSimulation(
              (data.outcome as SimulationOutcome) || 'timeout',
              allNodesVisited
            );
            // Return the completed run for batch usage
            const finalRun = useSimulationStore.getState().currentRun;
            return finalRun;
          }

          turnNumber++;

          // Small delay between turns for visual effect
          await new Promise((r) => setTimeout(r, 300));
        } catch {
          failSimulation('Error de conexion durante la simulacion');
          return null;
        }
      }

      if (!abortRef.current) {
        completeSimulation('timeout', allNodesVisited);
      }
      return useSimulationStore.getState().currentRun;
    },
    [getFlowData, currentPrompt, startSimulation, addMessage, addIssue, completeSimulation, failSimulation]
  );

  const handleRunSimulation = () => {
    runSimulation(selectedPersona);
  };

  const handleReset = () => {
    abortRef.current = true;
    clearSimulation();
  };

  // Generate test cases
  const handleGenerateTestCases = async () => {
    const flowData = getFlowData();
    if (flowData.nodes.length === 0) return;

    setGeneratingTestCases(true);
    try {
      const response = await fetch('/api/flow/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowData,
          promptContext: currentPrompt || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok && data.testCases) {
        setTestCases(data.testCases);
        setShowTestCases(true);
      }
    } catch {
      addToast('Error al generar test cases', 'error');
    } finally {
      setGeneratingTestCases(false);
    }
  };

  // Run test case
  const handleRunTestCase = (testCase: typeof testCases[0]) => {
    const persona = LEAD_PERSONAS.find((p) => p.id === testCase.personaId) || LEAD_PERSONAS[0];
    setSelectedPersona(persona);
    clearSimulation();
    setTimeout(() => runSimulation(persona), 100);
  };

  // Batch test
  const handleBatchTest = async () => {
    const flowData = getFlowData();
    if (flowData.nodes.length === 0) return;

    const personas = LEAD_PERSONAS;
    startBatch(personas.length);
    const completedRuns: SimulationRun[] = [];

    for (let i = 0; i < personas.length; i++) {
      if (abortRef.current) break;

      const persona = personas[i];
      updateBatchProgress(i + 1, persona.name);

      clearSimulation();
      await new Promise((r) => setTimeout(r, 200));

      const run = await runSimulation(persona);
      if (run) {
        completedRuns.push({ ...run });
      }
    }

    if (completedRuns.length > 0) {
      // Call batch analysis API
      try {
        const response = await fetch('/api/simulate/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runs: completedRuns, flowData }),
        });

        if (response.ok) {
          const reportData = await response.json();

          // Build local batch result
          const personaResults: PersonaResult[] = completedRuns.map((run) => {
            const persona = LEAD_PERSONAS.find((p) => p.id === run.personaId);
            const expected = persona?.expectedOutcome;
            const actual = run.outcome;
            const pass = expected === actual || (expected === 'conversion' && actual === 'converted');
            return {
              personaId: run.personaId,
              outcome: run.outcome || 'timeout',
              messagesCount: run.messages.length,
              issues: run.issues,
              nodesVisited: run.nodesVisited,
              verdict: run.issues.some((i) => i.severity === 'critical') ? 'fail' : pass ? 'pass' : 'warning',
              notes: reportData.report?.personaSummaries?.[run.personaId] || '',
            };
          });

          const totalMessages = completedRuns.reduce((sum, r) => sum + r.messages.length, 0);
          const conversions = completedRuns.filter((r) => r.outcome === 'converted').length;
          const allVisited = [...new Set(completedRuns.flatMap((r) => r.nodesVisited))];

          setBatchResult({
            id: crypto.randomUUID().slice(0, 8),
            timestamp: Date.now(),
            runs: completedRuns,
            totalRuns: completedRuns.length,
            conversionRate: completedRuns.length > 0 ? (conversions / completedRuns.length) * 100 : 0,
            avgMessages: completedRuns.length > 0 ? totalMessages / completedRuns.length : 0,
            nodeCoverage: allVisited.length,
            totalNodeCoveragePercent: flowData.nodes.length > 0 ? (allVisited.length / flowData.nodes.length) * 100 : 0,
            personaResults,
          });
          setShowBatchReport(true);
        } else {
          // Even without API report, show basic results
          const personaResults: PersonaResult[] = completedRuns.map((run) => ({
            personaId: run.personaId,
            outcome: run.outcome || 'timeout',
            messagesCount: run.messages.length,
            issues: run.issues,
            nodesVisited: run.nodesVisited,
            verdict: run.issues.some((i) => i.severity === 'critical') ? 'fail' : 'warning',
            notes: '',
          }));

          const totalMessages = completedRuns.reduce((sum, r) => sum + r.messages.length, 0);
          const conversions = completedRuns.filter((r) => r.outcome === 'converted').length;
          const allVisited = [...new Set(completedRuns.flatMap((r) => r.nodesVisited))];

          setBatchResult({
            id: crypto.randomUUID().slice(0, 8),
            timestamp: Date.now(),
            runs: completedRuns,
            totalRuns: completedRuns.length,
            conversionRate: completedRuns.length > 0 ? (conversions / completedRuns.length) * 100 : 0,
            avgMessages: completedRuns.length > 0 ? totalMessages / completedRuns.length : 0,
            nodeCoverage: allVisited.length,
            totalNodeCoveragePercent: flowData.nodes.length > 0 ? (allVisited.length / flowData.nodes.length) * 100 : 0,
            personaResults,
          });
          setShowBatchReport(true);
        }
      } catch {
        // Fallback: show basic results without API analysis
        const personaResults: PersonaResult[] = completedRuns.map((run) => ({
          personaId: run.personaId,
          outcome: run.outcome || 'timeout',
          messagesCount: run.messages.length,
          issues: run.issues,
          nodesVisited: run.nodesVisited,
          verdict: run.issues.some((i) => i.severity === 'critical') ? 'fail' : 'warning',
          notes: '',
        }));

        const totalMessages = completedRuns.reduce((sum, r) => sum + r.messages.length, 0);
        const conversions = completedRuns.filter((r) => r.outcome === 'converted').length;
        const allVisited = [...new Set(completedRuns.flatMap((r) => r.nodesVisited))];

        setBatchResult({
          id: crypto.randomUUID().slice(0, 8),
          timestamp: Date.now(),
          runs: completedRuns,
          totalRuns: completedRuns.length,
          conversionRate: completedRuns.length > 0 ? (conversions / completedRuns.length) * 100 : 0,
          avgMessages: completedRuns.length > 0 ? totalMessages / completedRuns.length : 0,
          nodeCoverage: allVisited.length,
          totalNodeCoveragePercent: flowData.nodes.length > 0 ? (allVisited.length / flowData.nodes.length) * 100 : 0,
          personaResults,
        });
        setShowBatchReport(true);
      }
    }

    clearSimulation();
  };

  const isRunning = currentRun?.status === 'running';
  const isCompleted = currentRun?.status === 'completed';
  const issues = currentRun?.issues || [];
  const criticalIssues = issues.filter((i) => i.severity === 'critical');

  // Batch report view
  if (showBatchReport && batchResult) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
              <Zap className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Reporte de Batch Test
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowBatchReport(false); clearBatch(); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              Volver al simulador
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <BatchReportPanel result={batchResult} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
            <PlayCircle className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Simulador de Conversacion
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Prueba tu flujo con diferentes perfiles de leads
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* No flow warning */}
      {nodes.length === 0 && (
        <div
          className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No hay flujo definido. Crea un flujo primero para poder simular.
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - Persona selector + controls */}
        <div
          className="w-[280px] shrink-0 border-r flex flex-col overflow-y-auto"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
        >
          {/* Personas */}
          <div className="p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Persona del Lead
            </h3>
            <div className="space-y-1.5">
              {LEAD_PERSONAS.map((persona) => {
                const isSelected = selectedPersona.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona)}
                    disabled={isRunning || isBatchRunning}
                    className="w-full text-left p-2.5 rounded-lg border transition-all disabled:opacity-50"
                    style={{
                      background: isSelected ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{persona.emoji}</span>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {persona.name}
                        </p>
                        <p
                          className="text-[11px] truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {persona.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="space-y-2">
              <button
                onClick={handleRunSimulation}
                disabled={isRunning || isBatchRunning || nodes.length === 0}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Simulando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Simular
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={!currentRun}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>

              <button
                onClick={handleBatchTest}
                disabled={isRunning || isBatchRunning || nodes.length === 0}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{
                  background: isBatchRunning ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                  color: isBatchRunning ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${isBatchRunning ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                {isBatchRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {batchProgress.current}/{batchProgress.total} - {batchProgress.currentPersona}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Batch Test (5 personas)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results summary */}
          {isCompleted && currentRun && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Resultado
              </h3>
              <div className="space-y-2">
                {currentRun.outcome && (
                  <div className="flex items-center gap-2">
                    {currentRun.outcome === 'converted' ? (
                      <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
                    ) : currentRun.outcome === 'lost' || currentRun.outcome === 'blocked' ? (
                      <XCircle className="h-4 w-4" style={{ color: 'var(--error)' }} />
                    ) : (
                      <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                    )}
                    <span
                      className="text-sm font-medium"
                      style={{ color: OUTCOME_LABELS[currentRun.outcome]?.color }}
                    >
                      {OUTCOME_LABELS[currentRun.outcome]?.label}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="p-2 rounded-lg text-center"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {currentRun.messages.length}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>mensajes</p>
                  </div>
                  <div
                    className="p-2 rounded-lg text-center"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {Math.round(currentRun.nodesCoverage)}%
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>cobertura</p>
                  </div>
                </div>
                {issues.length > 0 && (
                  <div
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                    style={{
                      background: criticalIssues.length > 0 ? 'var(--error-subtle)' : 'var(--warning-subtle)',
                      color: criticalIssues.length > 0 ? 'var(--error)' : 'var(--warning)',
                    }}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {issues.length} problema{issues.length !== 1 ? 's' : ''} detectado{issues.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Cases section */}
          <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Test Cases
              </h3>
              {testCases.length > 0 && (
                <button
                  onClick={() => setShowTestCases(!showTestCases)}
                  className="p-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showTestCases ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
            <button
              onClick={handleGenerateTestCases}
              disabled={isGeneratingTestCases || nodes.length === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {isGeneratingTestCases ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3" />
                  Generar Test Cases
                </>
              )}
            </button>

            {showTestCases && testCases.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {testCases.map((tc) => {
                  const persona = LEAD_PERSONAS.find((p) => p.id === tc.personaId);
                  return (
                    <div
                      key={tc.id}
                      className="p-2 rounded-lg border"
                      style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {tc.name}
                        </p>
                        <button
                          onClick={() => handleRunTestCase(tc)}
                          disabled={isRunning}
                          className="shrink-0 p-1 rounded transition-colors"
                          style={{ color: 'var(--accent-primary)' }}
                          title="Ejecutar test case"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{persona?.emoji}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {tc.expectedOutcome}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!currentRun && !isBatchRunning && (
              <div className="h-full flex flex-col items-center justify-center">
                <div
                  className="p-4 rounded-2xl mb-4"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <PlayCircle className="h-12 w-12" style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Listo para simular
                </h3>
                <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                  Selecciona una persona de lead y haz clic en &quot;Simular&quot; para ver como interactua con tu flujo.
                </p>
              </div>
            )}

            {currentRun?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'lead' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[75%]">
                  <div
                    className="px-3 py-2 rounded-2xl text-sm"
                    style={{
                      background: msg.role === 'lead' ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                      color: msg.role === 'lead' ? 'var(--text-primary)' : 'var(--bg-primary)',
                      borderBottomLeftRadius: msg.role === 'lead' ? '4px' : undefined,
                      borderBottomRightRadius: msg.role === 'agent' ? '4px' : undefined,
                    }}
                  >
                    {msg.role === 'lead' && (
                      <span className="mr-1.5">{selectedPersona.emoji}</span>
                    )}
                    {msg.content}
                  </div>
                  {msg.annotation && (
                    <p
                      className="text-[10px] mt-0.5 px-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {msg.annotation}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {isRunning && (
              <div className="flex justify-center">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Simulando turno...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Issues panel (collapsible) */}
          {issues.length > 0 && (
            <div
              className="border-t shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <button
                onClick={() => setShowIssues(!showIssues)}
                className="w-full flex items-center justify-between px-4 py-2"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {issues.length} problema{issues.length !== 1 ? 's' : ''} detectado{issues.length !== 1 ? 's' : ''}
                </span>
                {showIssues ? <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} /> : <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />}
              </button>
              {showIssues && (
                <div className="px-4 py-2 space-y-1.5 max-h-40 overflow-y-auto" style={{ background: 'var(--bg-secondary)' }}>
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg"
                      style={{
                        background: issue.severity === 'critical' ? 'var(--error-subtle)' : issue.severity === 'warning' ? 'var(--warning-subtle)' : 'var(--bg-tertiary)',
                        color: issue.severity === 'critical' ? 'var(--error)' : issue.severity === 'warning' ? 'var(--warning)' : 'var(--text-secondary)',
                      }}
                    >
                      {issue.severity === 'critical' ? <XCircle className="h-3 w-3 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />}
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
