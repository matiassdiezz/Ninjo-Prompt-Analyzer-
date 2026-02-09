import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateFlow } from '@/lib/utils/flowValidator';
import type { FlowData } from '@/types/flow';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Sos un experto en extraer flujos conversacionales de texto estructurado para agentes de DM de Instagram de Ninjo.

Tu tarea es convertir una sección de texto que describe un flujo conversacional (pasos numerados, condicionales, acciones) en un flujo visual estructurado en formato JSON.

## REGLA PRINCIPAL: NO inventar nada
- Solo representá lo que existe en el texto original
- Cada paso numerado → un nodo (action o decision)
- NO agregar pasos que no están en el texto
- Preservar los labels originales (truncados a 40 caracteres si es necesario)

## Reglas de mapeo:

1. Primer nodo: siempre un nodo "start" con el nombre del flujo como label
2. Cada paso numerado (1., 2., etc.) → nodo "action"
3. Pasos con condicionales explícitos (Si/No, If/Else, cuando/cuando no) → nodo "decision" con dos ramas:
   - sourceHandle "yes" para la rama positiva (Si)
   - sourceHandle "no" para la rama negativa (No)
4. Referencias a otros flujos ("ir a X_FLOW", "move to X_FLOW", "pasar a X_FLOW") → nodo "end" con label "→ X_FLOW"
5. Si un paso es claramente un cierre o despedida → nodo "end"
6. Los edges de decisiones DEBEN tener sourceHandle "yes" o "no"

## Layout:
- Start node: x=400, y=50
- Cada capa siguiente: y += 150
- Ramas de decisión: rama "Si" en x=250, rama "No" en x=550
- Nodos que reconvergen: volver a x=400
- Centro principal: x=400

## Formato de respuesta (SOLO JSON válido, sin texto adicional, sin markdown):

{
  "flow": {
    "nodes": [
      {
        "id": "ext-0001",
        "type": "start",
        "label": "FLOW_NAME",
        "position": { "x": 400, "y": 50 },
        "data": {}
      }
    ],
    "edges": [
      {
        "id": "e-ext-001",
        "source": "ext-0001",
        "target": "ext-0002",
        "label": "opcional",
        "sourceHandle": "solo para decisions: yes o no"
      }
    ]
  },
  "summary": "Breve descripción del flujo extraído",
  "suggestions": ["sugerencia de mejora 1"]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowText, flowName, context } = body;

    if (!flowText || typeof flowText !== 'string' || flowText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Se requiere el texto del flujo' },
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

    let userMessage = `Extraé el flujo conversacional de esta sección de texto y convertilo a formato visual.\n\nNombre del flujo: ${flowName || 'Sin nombre'}\n\n## Texto del flujo:\n${flowText.trim()}`;

    if (context && typeof context === 'string' && context.trim().length > 0) {
      userMessage += `\n\n## Contexto adicional del prompt:\n${context.trim().substring(0, 1500)}`;
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
      summary: parsed.summary || 'Flujo extraído exitosamente',
      suggestions: parsed.suggestions || [],
      warnings,
    });
  } catch (error) {
    console.error('Flow extraction error:', error);
    return NextResponse.json(
      { error: 'Error al extraer el flujo' },
      { status: 500 }
    );
  }
}
