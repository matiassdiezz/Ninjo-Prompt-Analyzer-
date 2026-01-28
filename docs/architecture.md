# Arquitectura - Ninjo Prompt Analyzer

## Resumen

Herramienta interna para crear, analizar y optimizar prompts de agentes de DM para Instagram.

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 16.x | Framework principal |
| React | 19.x | UI |
| TypeScript | 5.x | Tipado |
| Zustand | 5.x | Estado global |
| Tailwind CSS | 3.x | Estilos |
| Supabase | 2.x | Base de datos y sync |
| Anthropic SDK | 0.71.x | Integración con Claude |

---

## Estructura de Carpetas

```
/
├── app/
│   ├── page.tsx              # Página principal
│   └── api/
│       ├── chat/             # API del chat Ninjo
│       ├── analyze/          # Análisis de prompts (legacy)
│       └── optimize/         # Optimización
├── components/
│   ├── chat/                 # NinjoChatPanel
│   ├── editor/               # EditorPanel, ContextCollapsible
│   ├── projects/             # ProjectSelector, ProjectsDashboard
│   ├── versions/             # VersionHistoryModal
│   ├── review/               # VersionTimeline
│   └── ui/                   # Componentes genéricos
├── store/
│   ├── analysisStore.ts      # Estado del análisis
│   └── knowledgeStore.ts     # Proyectos y knowledge base
├── lib/
│   ├── semanticParser.ts     # Parser de secciones del prompt
│   ├── supabase/             # Cliente y hooks de Supabase
│   └── hooks/                # Custom hooks
├── types/                    # Definiciones TypeScript
└── docs/                     # Documentación interna
```

---

## Layout Principal

```
┌────────────────────────────────────────────────────────────┐
│ HEADER                                                     │
│ Logo | [Historial ▾] | [Proyectos] | Selector | Reset      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  EDITOR (flex-[55])         │  CHAT NINJO (flex-[45])      │
│  ─────────────────          │  ──────────────────          │
│  EditorPanel                │  NinjoChatPanel              │
│  • Sidebar de secciones     │  • Header con token count    │
│  • Editor con líneas        │  • Mensajes scrolleables     │
│  • Anotaciones inline       │  • Suggested questions       │
│                             │  • Input fijo abajo          │
│  ─────────────────          │                              │
│  ContextCollapsible         │                              │
│  • Feedback del cliente     │                              │
│  • Contexto adicional       │                              │
│                             │                              │
├────────────────────────────────────────────────────────────┤
│ FOOTER: Powered by Claude Sonnet 4.5                       │
└────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

### 1. Editor → Store
```
Usuario escribe en EditorPanel
    ↓
useAnalysisStore.setPrompt(text)
    ↓
Estado actualizado en Zustand
    ↓
Persiste en localStorage
```

### 2. Chat → API → Claude
```
Usuario envía mensaje en NinjoChatPanel
    ↓
POST /api/chat { prompt, question, history }
    ↓
System prompt de Ninjo + mensajes
    ↓
Claude Sonnet responde
    ↓
Respuesta mostrada en el chat
```

### 3. Versiones
```
Cambio aplicado
    ↓
useAnalysisStore.createVersion()
    ↓
Nueva versión en promptHistory
    ↓
Visible en VersionHistoryModal
```

### 4. Sincronización Prompt ↔ Proyecto
```
useProjectSync hook (en page.tsx)
    ↓
Detecta cambio en currentProjectId
    ↓
Carga project.currentPrompt al editor
    ↓
Mientras se edita (debounced 1s)
    ↓
Guarda currentPrompt al proyecto
```

El hook `useProjectSync` mantiene sincronizado el prompt del editor con el proyecto actual:
- **Al cambiar proyecto**: Carga automáticamente el prompt del nuevo proyecto
- **Al editar**: Guarda automáticamente al proyecto (con debounce de 1 segundo)

---

## API del Chat (/api/chat)

### Request
```typescript
{
  prompt: string;      // Prompt completo del editor
  question: string;    // Pregunta del usuario
  history: Array<{     // Historial de conversación
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

### Response
```typescript
{
  response: string;              // Respuesta de Claude
  learnings?: ExtractedLearning[]; // Aprendizajes detectados (si hay "PARA DOCUMENTAR")
}
```

### System Prompt

El chat usa un system prompt especializado para Ninjo con estas capacidades:

| Capacidad | Descripción |
|-----------|-------------|
| **QA V0** | Checklist sistemático para revisar prompts nuevos |
| **Iteración Quirúrgica** | Cambios precisos basados en feedback del cliente |
| **Testing** | Generación de casos de prueba y edge cases |
| **Diagnóstico** | Análisis de problemas de conversión |

---

## Componentes Principales

### NinjoChatPanel

Chat estilo Claude para interactuar con el asistente de QA.

**Props:** Ninguno (lee del store)

**Estado interno:**
- `messages`: Array de mensajes
- `input`: Texto del input
- `isLoading`: Estado de carga

**Características:**
- Suggested questions en estado vacío
- Auto-scroll al último mensaje
- Textarea que crece automáticamente
- Enter para enviar, Shift+Enter para nueva línea

### EditorPanel

Editor principal de prompts con sidebar de secciones.

**Props:**
- `onSectionSelect?: (section) => void` (opcional)

**Características:**
- Números de línea
- Sidebar con secciones detectadas automáticamente
- Anotaciones inline
- Undo/redo

### VersionHistoryModal

Modal para ver y restaurar versiones anteriores.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`

---

## Stores

### analysisStore

```typescript
interface AnalysisStore {
  currentPrompt: string;
  promptHistory: PromptVersion[];
  annotations: PromptAnnotation[];
  undoStack: string[];
  redoStack: string[];

  setPrompt: (prompt: string) => void;
  createVersion: (label?, changeType?, changeDetails?) => void;
  restoreVersion: (versionId: string) => void;
  undo: () => void;
  redo: () => void;
  // ...más acciones
}
```

### knowledgeStore

```typescript
interface KnowledgeStore {
  projects: Project[];
  currentProjectId: string | null;

  getCurrentProject: () => Project | null;
  createProject: (name: string) => void;
  selectProject: (id: string) => void;
  // ...más acciones
}
```

---

## Variables CSS (Tema Oscuro)

```css
--bg-primary: #0a0e14;
--bg-secondary: #0d1117;
--bg-tertiary: #161b22;
--bg-elevated: #1c2128;

--text-primary: #e6edf3;
--text-secondary: #8b949e;
--text-tertiary: #6e7681;

--accent-primary: #00d4aa;  /* Verde menta */
--accent-secondary: #00b896;

--error: #f85149;
--warning: #f0b429;
--success: #3fb950;
--info: #58a6ff;
```

---

## Patrones de UI

### Botones
- `.btn-primary`: Acción principal (gradiente verde)
- `.btn-secondary`: Acción secundaria
- `.btn-ghost`: Acción terciaria
- `.btn-danger`: Acción destructiva

### Cards
- `.card`: Container con borde y fondo
- `.card-elevated`: Container elevado con sombra

### Badges
- `.badge-accent`: Info neutral
- `.badge-success`: Estado positivo
- `.badge-warning`: Advertencia
- `.badge-error`: Error

---

## Testing Manual

### Checklist de Verificación

- [ ] Build exitoso (`npm run build`)
- [ ] Chat conecta con API y recibe respuestas
- [ ] El prompt del editor se envía automáticamente como contexto
- [ ] Historial de versiones accesible desde el header
- [ ] Conversación se mantiene durante la sesión
- [ ] Undo/redo funciona en el editor
- [ ] Proyectos se guardan y cargan correctamente
- [ ] UI responsive en diferentes tamaños

---

## Memoria de Ninjo (Knowledge Capture)

Sistema de captura automática de aprendizajes del chat para nutrir el Self-Serve.

### Flujo
```
Chat Ninjo QA
    ↓
Claude responde con "📝 PARA DOCUMENTAR"
    ↓
Sistema detecta y parsea aprendizajes
    ↓
LearningCard aparece en el chat
    ↓
Usuario revisa/edita y guarda
    ↓
Se guarda en KnowledgeStore + Supabase
    ↓
Visible en panel "Memoria"
```

### Componentes
- `lib/utils/learningExtractor.ts` - Parser de aprendizajes
- `components/chat/LearningCard.tsx` - Card para guardar aprendizajes
- `components/memory/NinjoMemory.tsx` - Panel de memoria

### Estructura de ExtractedLearning
```typescript
interface ExtractedLearning {
  pattern: string;           // Descripción del patrón
  suggestion: string;        // Sugerencia para Self-Serve
  priority: 'Alta' | 'Media' | 'Baja';
  frequency: 'Único' | 'Ocasional' | 'Recurrente';
  category?: string;         // Detectado automáticamente
}
```

---

## Supabase Sync

### Setup

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar el schema SQL: `docs/supabase-schema.sql`
3. Configurar variables de entorno:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Tablas
| Tabla | Descripción |
|-------|-------------|
| `devices` | Identifica cada instalación |
| `projects` | Proyectos de prompts |
| `prompt_versions` | Historial de versiones |
| `knowledge_entries` | Memoria de aprendizajes |
| `suggestion_decisions` | Decisiones de sugerencias |

### Sincronización
- **Offline-first**: Datos se guardan localmente primero
- **Pending operations**: Cambios se encolan si no hay conexión
- **Auto-sync**: Se sincroniza automáticamente al volver online

---

## Mejoras Futuras

- [ ] Streaming de respuestas en el chat
- [ ] Aplicar cambios sugeridos directamente al editor
- [ ] Exportar/importar prompts
- [ ] Colaboración en tiempo real
- [ ] Historial de conversaciones persistente
- [x] Memoria de aprendizajes del chat
