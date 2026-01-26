import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-5-20250929';

const CHAT_SYSTEM_PROMPT = `Eres un experto en análisis de prompts para sistemas de IA y agentes conversacionales.
El usuario te compartirá un prompt que está desarrollando y te hará preguntas sobre él.

Tu rol es:
1. Analizar profundamente el prompt compartido
2. Responder preguntas específicas sobre la estructura, objetivos e intenciones del prompt
3. Ofrecer insights sobre posibles mejoras cuando sea relevante
4. Identificar la misión, tono, restricciones y comportamientos esperados del agente

Responde de manera concisa pero completa. Usa ejemplos específicos del prompt cuando sea posible.
Responde en el mismo idioma en que te preguntan.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, question, history = [] } = body as {
      prompt: string;
      question: string;
      history: ChatMessage[];
    };

    if (!prompt || !question) {
      return NextResponse.json(
        { error: 'Prompt and question are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Build messages array with history
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Add the initial context message with the prompt
    messages.push({
      role: 'user',
      content: `Aquí está el prompt que estoy analizando:\n\n<prompt>\n${prompt}\n</prompt>\n\nTengo algunas preguntas sobre este prompt.`,
    });

    messages.push({
      role: 'assistant',
      content: 'Entendido, he leído el prompt. Estoy listo para responder tus preguntas sobre él. ¿Qué te gustaría saber?',
    });

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add the current question
    messages.push({
      role: 'user',
      content: question,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: CHAT_SYSTEM_PROMPT,
      messages,
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return NextResponse.json({ response: textContent.text });
  } catch (error) {
    console.error('Chat error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get response',
      },
      { status: 500 }
    );
  }
}
