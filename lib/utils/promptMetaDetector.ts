/**
 * Detects agent name and channel type from raw prompt text.
 * Used during quick-paste onboarding to auto-populate project/agent metadata.
 */

interface PromptMeta {
  agentName: string | null;
  channelType: string | null;
}

const CHANNEL_PATTERNS: { type: string; patterns: RegExp[] }[] = [
  {
    type: 'instagram',
    patterns: [
      /\binstagram\b/i,
      /\b(?:DMs?|mensajes?\s*directos?)\s*(?:de\s+)?(?:IG|insta)\b/i,
      /\bIG\s*DMs?\b/i,
    ],
  },
  {
    type: 'whatsapp',
    patterns: [
      /\bwhatsapp\b/i,
      /\bwhats\s*app\b/i,
      /\bwpp\b/i,
    ],
  },
  {
    type: 'tiktok',
    patterns: [
      /\btik\s*tok\b/i,
    ],
  },
  {
    type: 'web',
    patterns: [
      /\bchat\s*(?:de\s+)?(?:la\s+)?(?:web|pagina|página|landing|sitio)\b/i,
      /\bwidget\s*(?:de\s+)?chat\b/i,
      /\bformulario\b/i,
    ],
  },
];

/**
 * Patterns to extract the agent persona name from prompt text.
 * Ordered by specificity — first match wins.
 */
const NAME_PATTERNS: RegExp[] = [
  // "Tu nombre es Luna" / "Tu nombre: Luna"
  /tu\s+nombre\s+(?:es|será|sera|:)\s*["""]?([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{1,30}?)[""".,;\n]/i,
  // "Te llamas Luna"
  /te\s+llamas?\s+["""]?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,20})/i,
  // "Eres Luna," / "Eres Luna de FitnessPro" / "Eres el asistente de Luna"
  /\beres\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,20})\b/i,
  // "Your name is Luna"
  /your\s+name\s+is\s+["""]?([A-Z][a-zA-Z\s]{1,30}?)[""".,;\n]/i,
  // "You are Luna"
  /you\s+are\s+([A-Z][a-zA-Z]{1,20})\b/,
  // "Nombre del agente: Luna" / "Agente: Luna"
  /(?:nombre\s+del\s+)?agente\s*:\s*["""]?([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{1,30}?)[""".,;\n]/i,
];

/** Words that commonly follow "Eres" but are NOT a persona name */
const FILLER_WORDS = new Set([
  'un', 'una', 'el', 'la', 'los', 'las', 'mi', 'tu', 'su',
  'the', 'a', 'an', 'my', 'our',
]);

function detectChannel(text: string): string | null {
  for (const { type, patterns } of CHANNEL_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      return type;
    }
  }
  return null;
}

function detectName(text: string): string | null {
  // Only search in the first ~2000 chars (identity is always near the top)
  const head = text.slice(0, 2000);

  for (const pattern of NAME_PATTERNS) {
    const match = head.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      // Skip if it's a filler word (e.g., "Eres un asistente")
      if (FILLER_WORDS.has(name.toLowerCase())) continue;
      // Skip very short or very long matches
      if (name.length < 2 || name.length > 30) continue;
      return name;
    }
  }

  return null;
}

/**
 * Extracts metadata from a raw prompt string.
 * Returns detected agentName and channelType, or null for each if not found.
 */
export function detectPromptMeta(promptText: string): PromptMeta {
  return {
    agentName: detectName(promptText),
    channelType: detectChannel(promptText),
  };
}
