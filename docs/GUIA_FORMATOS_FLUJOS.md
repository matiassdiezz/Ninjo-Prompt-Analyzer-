# Guía de Formatos para Flujos Conversacionales

Esta guía documenta los formatos óptimos para escribir flujos conversacionales en prompts, asegurando la mejor detección por parte del editor de flujos.

## Formatos Recomendados (Mayor Probabilidad de Detección)

### 1. Headers Markdown con Pasos Numerados (Recomendado)

El formato más confiable. Usa un header con palabra clave de flujo seguido de pasos numerados.

```markdown
### SALES_FLOW

1. **Saludo inicial**: Dar la bienvenida al usuario
2. **Calificación**: Preguntar presupuesto y timeline
   - Si califica → continuar
   - No califica → pasar a nurtura
3. **Propuesta**: Presentar solución personalizada
4. **Cierre**: Pedir confirmación y siguiente paso

### SUPPORT_FLOW

1. Recopilar información del problema
2. Diagnosticar categoría
3. Aplicar solución o escalar
```

**¿Por qué funciona bien?**
- Header con `_FLOW` o `_FLUJO` suffix
- Pasos numerados claros (1., 2., 3.)
- Negrita para etiquetas de pasos
- Condicionales con flechas (→) o texto (Si/No)

### 2. Secuencias con Bullets

Alternativa efectiva usando bullets.

```markdown
### Mi Flujo de Ventas

- **Paso 1**: Calificación inicial ✅
- **Paso 2**: Presentación de demo
- **Paso 3**: Manejo de objeciones
  - Si hay dudas de precio → justificar valor
  - Si no tiene autoridad → identificar decisor
- **Paso 4**: Cierre del trato ❌
```

**¿Por qué funciona?**
- Bullets (•, -, *)
- Etiquetas en negrita
- Emojis como indicadores visuales
- Indentación para subpasos

### 3. Diagramas ASCII Art

Para flujos complejos con decisiones visuales.

```
┌─────────────────┐
│   Inicio        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ¿Califica?      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌─────────┐
│  Sí   │ │   No    │
└───┬───┘ └────┬────┘
    │          │
    ▼          ▼
┌───────┐ ┌─────────┐
│Venta  │ │Nurtura  │
└───────┘ └─────────┘
```

**Caracteres soportados:**
- Unicode: `┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴`
- ASCII: `+ - |` y `+---+`
- Flechas: `→ ➡ ▼ ▲ ↓ ↑`

### 4. Texto con Flechas y Emojis

Formato moderno y legible.

```markdown
### CONVERSATION_FLOW

🎯 Inicio → Calificación del lead
  ├─ ✅ Califica → Presentación
  └─ ❌ No califica → Educación

📊 Presentación → Manejo de objeciones
  ├─ 💰 Precio → Justificar ROI
  ├─ ⏰ Timing → Crear urgencia
  └─ 👤 Autoridad → Conectar con decisor

✅ Cierre → Onboarding
```

## Formatos con Detección Media

### Pasos con Letras o Números Romanos

```markdown
### PROCESO

A. Etapa de descubrimiento
B. Etapa de propuesta
C. Etapa de negociación
I. Primera llamada
II. Seguimiento
III. Cierre
```

## Formatos que NO se Detectan Bien

❌ **Evitar:**

```markdown
// Solo párrafos sin estructura
El proceso empieza cuando el usuario escribe. Primero hay que saludarlo, después preguntarle qué necesita, y entonces darle una respuesta adecuada.

// Tablas sin contexto de flujo
| Paso | Acción |
|------|--------|
| 1 | Saludo |
| 2 | Calificar |

// Headers sin keywords de flujo
### Proceso de Venta
(no contiene flow, flujo, funnel, etc)
```

## Palabras Clave que Activan Detección

### En Headers (título de la sección)
- `FLOW`, `FLUJO`
- `FUNNEL`, `EMBUDO`
- `SEQUENCE`, `SECUENCIA`
- Sufijos: `_FLOW`, `_FLUJO`, `-FLOW`, `-FLUJO`
- Prefijos: `FLOW_`, `FLUJO_`

### En Contenido (aumentan confianza)
- **Condicionales:** si, if, entonces, otherwise, cuando, depende
- **Transiciones:** primero, luego, después, a continuación, finalmente
- **Referencias:** move to, ir a, pasar a, go to, switch to, redirigir
- **Calificación:** califica, cualifica, qualify, descalifica, objeción, conversión

### Visuales
- Flechas: `→ ➡ — > ▸ ▶ ➜ ⇒ ⟶`
- Emojis de estado: `✅ ❌ ✓ ✗ ⬇️ ⬆️`
- Emojis de acción: `⚡ 🔥 💡 📝 🔍`

## Consejos para Máxima Detección

### 1. Usar Headers Claros
```markdown
### MiNombre_FLOW  ✅
### MiNombre FLUJO  ✅
### Mi flujo de conversión  ⚠️ (puede fallar)
```

### 2. Incluir Múltiples Pasos
- Mínimo: 2 pasos claros
- Ideal: 3-5 pasos
- Más de 5: Asegurar variedad en el formato

### 3. Agregar Contexto Condicional
```markdown
1. Calificar al lead
   - Si tiene presupento → Paso 2
   - Si no tiene → Paso educación
```

### 4. Mezclar Formatos para Flujos Complejos
```markdown
### MAIN_FLOW

📍 **Fase 1**: Calificación
- ✅ Presupuesto OK
- ✅ Timeline OK
- → Mover a PRESENTATION_FLOW

📍 **Fase 2**: Presentación (ver PRESENTATION_FLOW)
```

## Solución de Problemas

### "Mi flujo no se detecta"

**Verificar:**
1. ¿Tiene un header markdown (###) con keyword de flujo?
2. ¿Tiene al menos 2 pasos numerados/bullets?
3. ¿No está dentro de un bloque de código (```)?
4. ¿No hay un tag `<flow>` ya existente?

**Fix rápido:**
```markdown
### MI_FLUJO_FIX

1. [contenido existente paso 1]
2. [contenido existente paso 2]
```

### "El flujo se detecta pero incompleto"

- Agregar más keywords de condición (si/entonces)
- Usar flechas (→) entre pasos
- Incluir referencias a otros flujos
- Agregar emojis de estado

## Ejemplo Completo Óptimo

```markdown
### LEAD_QUALIFICATION_FLOW

🎯 **Objetivo**: Calificar leads en 5 minutos o menos

1️⃣ **Saludo y Validación**
   - Confirmar nombre y empresa
   - Verificar que coincide con ICP
   - ✅ Match → Continuar
   - ❌ No match → Descartar amablemente

2️⃣ **Descubrimiento B2B**
   - ¿Qué problema intentan resolver?
   - ¿Cuál es el timeline ideal?
   - ¿Quién más toma la decisión?

3️⃣ **Calificación BANT**
   - **Budget**: ¿Presupuesto asignado? [Si/No/Desarrollando]
   - **Authority**: ¿Es el decisor? [Si/No/Consejo]
   - **Need**: ¿Urgencia confirmada? [Alta/Media/Baja]
   - **Timeline**: ¿Timeline definido? [<30d/<90d/>90d]

4️⃣ **Siguiente Paso**
   - Si 4/4 BANT positivo → Book demo
   - Si 2-3/4 positivo → Enviar caso de estudio
   - Si <2 positivo → Añadir a nurtura

🔄 **Handoff**: PASAR A DEMO_BOOKING_FLOW si califica
```

Este formato tiene:
- ✅ Header con `_FLOW` suffix
- ✅ 4 pasos numerados con emojis
- ✅ Etiquetas en negrita
- ✅ Condicionales con flechas y checkmarks
- ✅ Keywords de calificación (BANT, decisor, presupuesto)
- ✅ Referencia a otro flujo
- ✅ Transiciones claras (→)

---

*Para flujos aún más complejos, considera usar el editor visual directamente.*
