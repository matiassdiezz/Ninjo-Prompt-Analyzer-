import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateFlow } from '@/lib/utils/flowValidator';
import type { FlowData } from '@/types/flow';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Sos un experto en diseño de flujos conversacionales para agentes de DM de Instagram de Ninjo.

Tu tarea es convertir una descripción en lenguaje natural en un flujo estructurado en formato JSON.

## Contexto de Ninjo:
- Los agentes conversacionales clonan la personalidad de creadores de contenido
- Manejan DMs de Instagram para calificar leads y convertirlos en ventas
- Flujo típico: Trigger → Saludo → Calificación → Propuesta → Cierre
- Los nodos de decisión suelen ser preguntas de calificación

## Reglas de generación:

1. Todo flujo DEBE tener exactamente un nodo "start" y al menos un nodo "end"
2. Los nodos de tipo "decision" deben tener exactamente 2 ramas con sourceHandle "yes" y "no"
3. Los nodos de tipo "action" representan mensajes o acciones del agente
4. Cada nodo debe tener una etiqueta clara y concisa (max 40 caracteres)
5. Las posiciones deben formar un layout legible:
   - Start node en la parte superior (y: 50)
   - Cada capa subsiguiente +150 en y
   - Nodos del mismo nivel distribuidos horizontalmente con 250px de separación
   - Centro del layout en x: 400
6. Los IDs de nodos deben ser strings cortos y únicos (8 caracteres)
7. Los IDs de edges deben comenzar con "e-"

## Formato de respuesta (SOLO JSON válido, sin texto adicional, sin markdown):

{
  "flow": {
    "nodes": [
      {
        "id": "start001",
        "type": "start",
        "label": "Inicio",
        "position": { "x": 400, "y": 50 },
        "data": {}
      }
    ],
    "edges": [
      {
        "id": "e-edge001",
        "source": "start001",
        "target": "node002",
        "label": "opcional",
        "sourceHandle": "solo para decisions: yes o no"
      }
    ]
  },
  "summary": "Breve descripción del flujo generado en español",
  "suggestions": ["sugerencia de mejora 1", "sugerencia 2"]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, context } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una descripción del flujo' },
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

    // Build user message
    let userMessage = `Genera un flujo conversacional para un agente de DM basado en esta descripción:\n\n${description.trim()}`;

    if (context && typeof context === 'string' && context.trim().length > 0) {
      userMessage += `\n\n## Contexto del prompt actual:\n${context.trim().substring(0, 2000)}`;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'No se recibió respuesta del modelo' },
        { status: 500 }
      );
    }

    const rawText = textContent.text.trim();

    // Parse JSON from response (handle potential markdown code blocks)
    let parsed: { flow?: FlowData; summary?: string; suggestions?: string[] };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          return NextResponse.json(
            { error: 'No se pudo parsear la respuesta del modelo' },
            { status: 500 }
          );
        }
      } else {
        // Try finding JSON object in the text
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

    // Validate the flow structure
    if (!parsed.flow || !Array.isArray(parsed.flow.nodes) || !Array.isArray(parsed.flow.edges)) {
      return NextResponse.json(
        { error: 'El modelo generó un flujo con estructura inválida' },
        { status: 500 }
      );
    }

    // Run validation
    const warnings = validateFlow(parsed.flow);

    return NextResponse.json({
      flow: parsed.flow,
      summary: parsed.summary || 'Flujo generado exitosamente',
      suggestions: parsed.suggestions || [],
      warnings,
    });
  } catch (error) {
    console.error('Flow generation error:', error);
    return NextResponse.json(
      { error: 'Error al generar el flujo' },
      { status: 500 }
    );
  }
}
