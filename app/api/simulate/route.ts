import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { FlowData } from '@/types/flow';
import type { SimulationMessage, SimulationIssue } from '@/types/simulation';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-sonnet-4-5-20250929';

function buildSystemPrompt(flowData: FlowData, personaBehavior: string, promptContext?: string): string {
  return `Sos un simulador de conversaciones de DM de Instagram. Tu rol es jugar DOS personajes en una conversacion:

## ROL 1: LEAD (persona que escribe al agente)
${personaBehavior}

## ROL 2: AGENTE (bot de DM que sigue el flujo)
Debes seguir este flujo conversacional para las respuestas del agente:

${JSON.stringify(flowData, null, 2)}

${promptContext ? `\nContexto adicional del prompt del agente:\n${promptContext.substring(0, 1500)}` : ''}

## REGLAS DE SIMULACION:

1. En cada turno generas UN mensaje del lead y UNO del agente
2. Los mensajes deben ser estilo WhatsApp/DM: cortos, naturales, con emojis moderados
3. El agente DEBE seguir el flujo: cada mensaje debe corresponder a un nodo
4. Identifica en que nodo del flujo esta la conversacion (currentNodeId)
5. Evalua si hay problemas en cada turno
6. La conversacion termina cuando:
   - Se llega a un nodo "end"
   - El lead deja de responder
   - Se detecta un problema critico (ej: menor de edad)
   - Se alcanza el limite de turnos

## PROBLEMAS A DETECTAR:
- El agente salta pasos del flujo
- El agente no maneja una objecion
- El agente no detecta señales importantes (menor de edad, no califica)
- El agente es muy agresivo o pushy
- El agente no respeta los nodos de decision

## FORMATO DE RESPUESTA (SOLO JSON valido, sin markdown):

{
  "leadMessage": "mensaje del lead",
  "agentResponse": "respuesta del agente",
  "currentNodeId": "id del nodo actual",
  "nextNodeId": "id del siguiente nodo esperado",
  "annotation": "nota breve sobre que paso en este turno (opcional)",
  "issues": [
    { "id": "issue-xxx", "severity": "warning|critical|info", "message": "descripcion del problema", "nodeId": "nodo relacionado (opcional)" }
  ],
  "isComplete": false,
  "outcome": "converted|nurture|lost|blocked|null si no termino"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowData, persona, history, promptContext, turnNumber, maxTurns = 15 } = body;

    if (!flowData || !persona) {
      return NextResponse.json(
        { error: 'Se requiere flowData y persona' },
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

    const systemPrompt = buildSystemPrompt(flowData, persona.behavior, promptContext);

    // Build conversation history for context
    let userMessage = `Turno ${turnNumber || 1} de maximo ${maxTurns}.`;

    if (history && history.length > 0) {
      userMessage += '\n\nHistorial de la conversacion hasta ahora:\n';
      history.forEach((msg: SimulationMessage) => {
        userMessage += `${msg.role === 'lead' ? 'Lead' : 'Agente'}: ${msg.content}\n`;
      });
      userMessage += '\nGenera el siguiente turno de la conversacion.';
    } else {
      userMessage += '\nGenera el primer turno de la conversacion. El lead inicia.';
    }

    if (turnNumber && turnNumber >= maxTurns - 1) {
      userMessage += '\nEste es uno de los ultimos turnos. Busca cerrar la conversacion de forma natural.';
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
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

    let parsed: {
      leadMessage?: string;
      agentResponse?: string;
      currentNodeId?: string;
      nextNodeId?: string;
      annotation?: string;
      issues?: SimulationIssue[];
      isComplete?: boolean;
      outcome?: string | null;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const braceMatch = rawText.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          parsed = JSON.parse(braceMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'No se pudo parsear la respuesta de simulacion' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No se pudo parsear la respuesta de simulacion' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      leadMessage: parsed.leadMessage || '',
      agentResponse: parsed.agentResponse || '',
      currentNodeId: parsed.currentNodeId || null,
      nextNodeId: parsed.nextNodeId || null,
      annotation: parsed.annotation || null,
      issues: parsed.issues || [],
      isComplete: parsed.isComplete || false,
      outcome: parsed.outcome || null,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Error en la simulacion' },
      { status: 500 }
    );
  }
}
