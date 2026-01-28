# Ninjo Prompt Analyzer - Project Instructions

## Qué es este proyecto

Ninjo Prompt Analyzer es una herramienta interna para crear, analizar y optimizar prompts de agentes de DM (mensajes directos) para Instagram. La empresa Ninjo crea agentes conversacionales que interactúan con usuarios vía DM.

## Arquitectura Principal

```
┌────────────────────────────────────────────────────────────┐
│ HEADER: Logo | [Historial] | [Proyectos] | Config          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  EDITOR (55%)               │  CHAT NINJO (45%)            │
│  ─────────────────          │  ──────────────────          │
│  • Sidebar secciones        │  • Header: "Ninjo QA"        │
│  • Editor con líneas        │  • Mensajes estilo Claude    │
│  • Contexto colapsable      │  • Suggested questions       │
│  • Annotations              │  • Input fijo abajo          │
│                             │                              │
└────────────────────────────────────────────────────────────┘
```

## Componentes Clave

| Componente | Ubicación | Propósito |
|------------|-----------|-----------|
| `NinjoChatPanel` | `/components/chat/` | Chat estilo Claude para QA de prompts |
| `EditorPanel` | `/components/editor/` | Editor de prompts con secciones |
| `VersionHistoryModal` | `/components/versions/` | Modal de historial de versiones |
| `ProjectSelector` | `/components/projects/` | Selector de proyectos |

## Stores (Zustand)

- **`analysisStore`**: Estado del prompt actual, historial, undo/redo, anotaciones
- **`knowledgeStore`**: Proyectos, versiones, knowledge base

## Sincronización Prompt ↔ Proyecto

El hook `useProjectSync` (en `/lib/hooks/useProjectSync.ts`) sincroniza automáticamente:

1. **Al cambiar de proyecto**: Carga el `currentPrompt` del proyecto al editor
2. **Al editar el prompt**: Guarda automáticamente al proyecto (debounced 1s)

Esto significa que:
- No es necesario llamar `setPrompt()` manualmente al cambiar de proyecto
- Los cambios en el editor se persisten automáticamente al proyecto actual

## API Routes

- **`/api/chat`**: Chat con Claude para QA de prompts (system prompt especializado Ninjo)
- **`/api/analyze`**: Análisis estructurado de prompts (legacy, puede eliminarse)
- **`/api/optimize`**: Optimización de prompts

## Convenciones de Código

### Estilo Visual
- Tema oscuro obligatorio (variables CSS en `globals.css`)
- Colores principales: `--accent-primary: #00d4aa` (verde menta)
- Fuente mono: JetBrains Mono
- Fuente UI: Outfit

### Componentes
- Usar `'use client'` solo cuando sea necesario
- Estilos inline con variables CSS: `style={{ color: 'var(--text-primary)' }}`
- Iconos de `lucide-react`

### Estado
- Zustand para estado global
- `persist` middleware para localStorage
- Evitar prop drilling, usar stores directamente

## Sistema de Chat Ninjo

El chat usa un system prompt especializado ubicado en `/app/api/chat/route.ts`. Este prompt define el comportamiento del asistente de QA con 5 capacidades principales:

1. **QA V0** - Checklist sistemático para revisar prompts del Self-Serve
2. **Iteración Quirúrgica** - Cambios precisos y mínimos basados en feedback (capacidad principal)
3. **Documentación** - Registrar patrones para mejorar el Self-Serve
4. **Testing** - Generar casos de prueba (happy path, edge cases)
5. **Diagnóstico** - Analizar agentes en producción con problemas

### Reglas Críticas del Asistente

- NO reescribe prompts completos, solo da instrucciones de modificación
- Prioriza ediciones mínimas de alto impacto
- Preserva lo que ya funciona
- Siempre incluye sección de documentación para el Self-Serve
- Aplica meta-cognitive reasoning al final de cada respuesta

### Formato de Output para Cambios

```text
## MODIFICACIONES SECCIÓN POR SECCIÓN

### 1. [Cambio]
**Sección:** [nombre]
**Acción:** [Reemplazar | Insertar | Eliminar | Mover | Mantener]
**Antes:** "[texto original]"
**Después:** "[texto nuevo]"
**Razón:** [justificación]

## 📝 PARA DOCUMENTAR (Self-Serve)
### Patrón detectado: [descripción]
### Sugerencia: [mejora para el Self-Serve]
### Prioridad: [Alta/Media/Baja]
```

## Estructura de un Prompt Ninjo

Los prompts de agentes tienen estas secciones típicas:

- **Identidad**: Quién es el agente, personalidad
- **Keywords**: Palabras clave que disparan respuestas
- **Comportamiento**: Cómo debe actuar
- **Restricciones**: Qué NO debe hacer
- **Knowledge Base**: Información del negocio, links, FAQs
- **Flujo de Conversión**: Pasos para llevar al usuario a la acción

## Comandos Útiles

```bash
npm run dev      # Desarrollo
npm run build    # Build de producción
npm run lint     # Linter
```

## Variables de Entorno Requeridas

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
