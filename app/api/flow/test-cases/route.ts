import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { FlowData } from '@/types/flow';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Sos un experto en QA de agentes conversacionales de DM de Instagram para Ninjo.

Tu tarea es analizar un flujo conversacional (FlowData JSON) y generar test cases que cubran todos los caminos posibles.

## Test cases a generar:

1. **Happy path**: Lead ideal que sigue todas las ramas "Si"
2. **Cada rama "No"**: Un test por cada nodo de decision, donde el lead toma la rama negativa
3. **Edge cases**: Situaciones que el flujo podria no manejar bien
4. **Keyword trigger test**: Si hay un nodo start con keyword, probar el trigger
5. **Pregunta directa de precio**: Lead que solo pregunta precio sin seguir el flujo

## Personas disponibles:
- "ideal": Lead ideal que acepta todo
- "skeptic": Esceptico que quiere pruebas
- "price_shopper": Solo pregunta precio
- "freeloader": Solo quiere cosas gratis
- "minor": Menor de edad (16 años)

## Formato de respuesta (SOLO JSON valido):

{
  "testCases": [
    {
      "id": "tc-001",
      "name": "Nombre corto del test",
      "description": "Que se prueba en este test",
      "triggerMessage": "Mensaje inicial del lead",
      "personaId": "ideal|skeptic|price_shopper|freeloader|minor",
      "expectedBehavior": "Como deberia comportarse el agente",
      "expectedOutcome": "converted|nurture|lost|blocked|timeout",
      "redFlags": ["cosas que NO deberian pasar"],
      "nodesExpectedToVisit": ["ids de nodos que deberian visitarse"]
    }
  ],
  "summary": "Resumen de la cobertura del testing"
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowData, promptContext } = body;

    if (!flowData || !Array.isArray(flowData.nodes) || !Array.isArray(flowData.edges)) {
      return NextResponse.json(
        { error: 'Se requiere un flujo valido' },
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

    let userMessage = `Analiza este flujo conversacional y genera test cases completos:\n\n${JSON.stringify(flowData, null, 2)}`;

    if (promptContext && typeof promptContext === 'string' && promptContext.trim().length > 0) {
      userMessage += `\n\nContexto del prompt del agente:\n${promptContext.trim().substring(0, 1500)}`;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
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

    let parsed: { testCases?: unknown[]; summary?: string };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const braceMatch = rawText.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          parsed = JSON.parse(braceMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'No se pudo parsear la respuesta' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No se pudo parsear la respuesta' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      testCases: parsed.testCases || [],
      summary: parsed.summary || 'Test cases generados',
    });
  } catch (error) {
    console.error('Test case generation error:', error);
    return NextResponse.json(
      { error: 'Error al generar test cases' },
      { status: 500 }
    );
  }
}
