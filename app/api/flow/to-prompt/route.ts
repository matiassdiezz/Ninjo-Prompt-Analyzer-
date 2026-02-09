import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { FlowData } from '@/types/flow';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Sos un experto en diseño de prompts para agentes conversacionales de DM de Instagram de Ninjo.

Tu tarea es convertir un flujo conversacional (FlowData JSON) en secciones de prompt estructuradas.

## Contexto de Ninjo:
- Los agentes clonan la personalidad de creadores de contenido
- Manejan DMs de Instagram para calificar leads y convertirlos
- Los prompts tienen secciones bien definidas

## Lo que debes generar:

### 1. conversationLogic (Seccion 3: Logica de Conversacion)
Describe paso a paso como debe fluir la conversacion:
- Cada nodo de accion se convierte en un paso numerado
- Cada nodo de decision se convierte en una bifurcacion con condiciones claras
- Incluye triggers, reglas de calificacion y transiciones
- Usa formato claro con viñetas y sub-viñetas

### 2. happyPath (Seccion 4: Happy Path)
Escribe una conversacion completa de ejemplo siguiendo las ramas "Si" del flujo:
- Formato de chat de WhatsApp/DM
- El lead responde positivamente en cada decision
- Mensajes cortos y naturales (estilo DM real)
- Incluye emojis moderados
- Formato: "Lead: ..." y "Agente: ..."

### 3. triggers
Lista de palabras clave o acciones que inician el flujo.

### 4. qualificationQuestions
Lista de preguntas de calificacion extraidas de los nodos de decision.

### 5. summary
Un resumen breve de que hace este flujo.

## Formato de respuesta (SOLO JSON valido, sin markdown):

{
  "conversationLogic": "texto completo de la seccion",
  "happyPath": "conversacion completa de ejemplo",
  "triggers": ["trigger1", "trigger2"],
  "qualificationQuestions": ["pregunta1", "pregunta2"],
  "summary": "resumen breve"
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowData, context, clientName, agentGoal } = body;

    if (!flowData || !Array.isArray(flowData.nodes) || !Array.isArray(flowData.edges)) {
      return NextResponse.json(
        { error: 'Se requiere un flujo valido con nodos y conexiones' },
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

    let userMessage = `Convierte este flujo conversacional en secciones de prompt:\n\n${JSON.stringify(flowData, null, 2)}`;

    if (clientName) {
      userMessage += `\n\nNombre del cliente/creador: ${clientName}`;
    }
    if (agentGoal) {
      userMessage += `\nObjetivo del agente: ${agentGoal}`;
    }
    if (context && typeof context === 'string' && context.trim().length > 0) {
      userMessage += `\n\nContexto del prompt actual:\n${context.trim().substring(0, 2000)}`;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
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

    let parsed: {
      conversationLogic?: string;
      happyPath?: string;
      triggers?: string[];
      qualificationQuestions?: string[];
      summary?: string;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          const braceMatch = rawText.match(/\{[\s\S]*\}/);
          if (braceMatch) {
            try {
              parsed = JSON.parse(braceMatch[0]);
            } catch {
              return NextResponse.json(
                { error: 'No se pudo parsear la respuesta del modelo' },
                { status: 500 }
              );
            }
          } else {
            return NextResponse.json(
              { error: 'No se pudo parsear la respuesta del modelo' },
              { status: 500 }
            );
          }
        }
      } else {
        const braceMatch = rawText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            parsed = JSON.parse(braceMatch[0]);
          } catch {
            return NextResponse.json(
              { error: 'No se pudo parsear la respuesta del modelo' },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'No se pudo parsear la respuesta del modelo' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      conversationLogic: parsed.conversationLogic || '',
      happyPath: parsed.happyPath || '',
      triggers: parsed.triggers || [],
      qualificationQuestions: parsed.qualificationQuestions || [],
      summary: parsed.summary || 'Secciones generadas exitosamente',
    });
  } catch (error) {
    console.error('Flow to prompt error:', error);
    return NextResponse.json(
      { error: 'Error al generar secciones de prompt' },
      { status: 500 }
    );
  }
}
