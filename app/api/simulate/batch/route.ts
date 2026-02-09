import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { FlowData } from '@/types/flow';
import type { SimulationRun } from '@/types/simulation';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Sos un experto en QA de agentes conversacionales de DM de Instagram para Ninjo.

Tu tarea es analizar los resultados de multiples simulaciones de conversacion y generar un reporte ejecutivo.

## Lo que debes evaluar:

1. **Score general (0-100)**: Que tan bien el agente maneja los diferentes tipos de leads
2. **Tasa de conversion**: Porcentaje de leads que llegan al final del flujo exitosamente
3. **Cobertura de nodos**: Que porcentaje del flujo se ejercita en las simulaciones
4. **Nodos sin cubrir**: Que partes del flujo nunca se visitaron
5. **Issues criticos**: Problemas graves que necesitan atencion inmediata
6. **Recomendaciones**: Sugerencias para mejorar el flujo

## Formato de respuesta (SOLO JSON valido):

{
  "report": {
    "overallScore": 75,
    "conversionRate": 40,
    "avgMessages": 8,
    "nodeCoverage": 70,
    "uncoveredNodes": ["id1", "id2"],
    "criticalIssues": ["issue1", "issue2"],
    "recommendations": ["recomendacion1", "recomendacion2"],
    "personaSummaries": {
      "ideal": "resumen del resultado con lead ideal",
      "skeptic": "resumen del resultado con lead esceptico",
      "price_shopper": "resumen del resultado con lead que pregunta precio",
      "freeloader": "resumen del resultado con cazador de gratis",
      "minor": "resumen del resultado con menor de edad"
    }
  }
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runs, flowData }: { runs: SimulationRun[]; flowData: FlowData } = body;

    if (!runs || !Array.isArray(runs) || runs.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren resultados de simulacion' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key no configurada' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Build a summary of each run for the model
    const runSummaries = runs.map((run) => ({
      persona: run.personaId,
      outcome: run.outcome,
      messagesCount: run.messages.length,
      nodesCoverage: run.nodesCoverage,
      nodesVisited: run.nodesVisited,
      issuesCount: run.issues.length,
      criticalIssues: run.issues.filter((i) => i.severity === 'critical').map((i) => i.message),
      conversation: run.messages.map((m) => `${m.role === 'lead' ? 'Lead' : 'Agente'}: ${m.content}`).join('\n'),
    }));

    const allNodesInFlow = flowData.nodes.map((n) => ({ id: n.id, type: n.type, label: n.label }));
    const allVisitedNodes = [...new Set(runs.flatMap((r) => r.nodesVisited))];
    const uncoveredNodes = allNodesInFlow.filter((n) => !allVisitedNodes.includes(n.id));

    const userMessage = `Analiza estos resultados de simulacion de un agente de DM:

## Flujo del agente (${flowData.nodes.length} nodos):
${JSON.stringify(allNodesInFlow, null, 2)}

## Nodos no cubiertos:
${JSON.stringify(uncoveredNodes, null, 2)}

## Resultados por persona:
${JSON.stringify(runSummaries, null, 2)}

Genera un reporte ejecutivo completo.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'No se recibio respuesta del modelo' },
        { status: 500 }
      );
    }

    const rawText = textContent.text.trim();

    let parsed: { report?: Record<string, unknown> };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const braceMatch = rawText.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          parsed = JSON.parse(braceMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'No se pudo parsear el reporte' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No se pudo parsear el reporte' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      report: parsed.report || {},
    });
  } catch (error) {
    console.error('Batch report error:', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    );
  }
}
