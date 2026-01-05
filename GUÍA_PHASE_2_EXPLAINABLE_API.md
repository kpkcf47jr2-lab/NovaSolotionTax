# 🎯 GUÍA COMPLETA: PHASE 2 - EXPLAINABLE TAXES API

**Versión**: 1.0  
**Estado**: READY TO COPY (Todos los archivos listos para integración)  
**Tiempo de integración estimado**: 30-45 minutos  
**Dificultad**: ⭐⭐⭐ (Media)

---

## 📋 Tabla de Contenidos

1. [Overview](#overview)
2. [Archivos a Crear](#archivos-a-crear)
3. [Paso 1: Backend - API Endpoints](#paso-1-backend--api-endpoints)
4. [Paso 2: Frontend - Componentes React](#paso-2-frontend--componentes-react)
5. [Paso 3: Integración en Páginas](#paso-3-integración-en-páginas)
6. [Paso 4: Testing](#paso-4-testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Objetivo**: Permitir que los usuarios entiendan EXACTAMENTE cómo se calculan sus impuestos con:
- ✅ Explicaciones detalladas (¿de dónde vino cada número?)
- ✅ Simulador What-If (¿qué pasaría si cambio...?)
- ✅ Rastreo de provenance (¿de dónde vino este número?)
- ✅ Análisis de impacto por documento (¿cuál fue el efecto de este archivo?)

**Beneficios principales**:
1. **Transparencia**: Los usuarios saben exactamente por qué su número de impuestos es X
2. **Confianza**: Verifican la precisión antes de presentar
3. **Educación**: Aprenden sobre tax planning sin necesidad de CPA
4. **What-If**: Saben el impacto de cambios ANTES de hacerlos (¿vale la pena la donación?)

---

## 📁 Archivos a Crear

```
✅ Backend (API Endpoints):
   └─ READY_TO_COPY_EXPLAINABLE_endpoints.ts
      └─ Integrar en: apps/api/src/index.ts

✅ Frontend (React Components):
   ├─ READY_TO_COPY_TaxSummaryExplainer.tsx
   │  └─ apps/web/src/components/TaxSummaryExplainer.tsx
   ├─ READY_TO_COPY_WhatIfCalculator.tsx
   │  └─ apps/web/src/components/WhatIfCalculator.tsx
   ├─ READY_TO_COPY_ProvenanceViewer.tsx
   │  └─ apps/web/src/components/ProvenanceViewer.tsx
   └─ READY_TO_COPY_DeltaViewer.tsx
      └─ apps/web/src/components/DeltaViewer.tsx
```

---

## Paso 1: Backend - API Endpoints

### 1.1 Integración del archivo endpoints

**Ubicación**: `apps/api/src/index.ts`

1. Abre `apps/api/src/index.ts`
2. Busca el final del archivo (antes de `app.listen()`)
3. **ANTES de `app.listen()`**, copia TODOS estos 4 endpoints del archivo `READY_TO_COPY_EXPLAINABLE_endpoints.ts`:

```typescript
// ==========================================
// EXPLAINABLE TAXES ENDPOINTS
// ==========================================

// 1. GET /api/returns/:returnId/explain
app.get('/api/returns/:returnId/explain', authenticateJWT, async (req, res) => {
  // ... código completo del endpoint ...
});

// 2. POST /api/returns/:returnId/what-if
app.post('/api/returns/:returnId/what-if', authenticateJWT, async (req, res) => {
  // ... código completo del endpoint ...
});

// 3. GET /api/returns/:returnId/documents/:documentId/delta
app.get('/api/returns/:returnId/documents/:documentId/delta', authenticateJWT, async (req, res) => {
  // ... código completo del endpoint ...
});

// 4. GET /api/returns/:returnId/fields/:fieldKey/provenance
app.get('/api/returns/:returnId/fields/:fieldKey/provenance', authenticateJWT, async (req, res) => {
  // ... código completo del endpoint ...
});
```

**⚠️ IMPORTANTE**: Verifica que estos middlewares existan en tu `index.ts`:
- ✅ `authenticateJWT` (middleware de autenticación)
- ✅ `TaxCalculator` importado desde `@novasolutiontax/core`
- ✅ `prisma` cliente de base de datos
- ✅ `AuditLog` modelo en Prisma

### 1.2 Dependencias requeridas

Verifica que existan en `apps/api/package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@prisma/client": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "uuid": "^9.0.0"
  }
}
```

Si falta algo, ejecuta en `apps/api/`:
```bash
npm install express @prisma/client jsonwebtoken uuid
```

### 1.3 Verificación de endpoints

**Comprueba que los endpoints son accesibles**:

```bash
# Terminal 1: Inicia el backend
cd apps/api
npm run dev

# Terminal 2: Prueba GET /api/returns/:id/explain
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/returns/return-id-123/explain

# Respuesta esperada:
{
  "explanation": {
    "grossIncome": {...},
    "deductions": {...},
    "taxableIncome": {...},
    "taxes": {...},
    "refund": {...}
  },
  "insights": [...]
}
```

---

## Paso 2: Frontend - Componentes React

### 2.1 Crear archivos de componentes

**Para cada archivo READY_TO_COPY**:

1. Copia TODO el contenido del archivo
2. Crea el archivo en la ubicación exacta:

```bash
# Componente 1: TaxSummaryExplainer
apps/web/src/components/TaxSummaryExplainer.tsx

# Componente 2: WhatIfCalculator
apps/web/src/components/WhatIfCalculator.tsx

# Componente 3: ProvenanceViewer
apps/web/src/components/ProvenanceViewer.tsx

# Componente 4: DeltaViewer
apps/web/src/components/DeltaViewer.tsx
```

### 2.2 Verificación de dependencias

Verifica que `apps/web/package.json` incluya:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0",
    "@heroicons/react": "^2.0.0"
  }
}
```

Si falta @heroicons/react:
```bash
cd apps/web
npm install @heroicons/react
```

### 2.3 Estructura de directorios

Verifica que exista:
```
apps/web/src/components/
├── TaxSummaryExplainer.tsx     ← Nuevo
├── WhatIfCalculator.tsx         ← Nuevo
├── ProvenanceViewer.tsx         ← Nuevo
├── DeltaViewer.tsx              ← Nuevo
└── ... (otros componentes)
```

---

## Paso 3: Integración en Páginas

### 3.1 Crear página de Tax Explanation

**Ubicación**: `apps/web/src/app/dashboard/tax-explanation.tsx` (NUEVA)

```typescript
'use client';

import TaxSummaryExplainer from '@/components/TaxSummaryExplainer';
import WhatIfCalculator from '@/components/WhatIfCalculator';
import { useParams } from 'next/navigation';

export default function TaxExplanationPage() {
  const params = useParams();
  const returnId = params.returnId as string;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ¿Cómo se calculan tus impuestos?
          </h1>
          <p className="text-gray-600 mt-2">
            Aquí puedes ver exactamente de dónde vino cada número
          </p>
        </div>

        {/* Tax Explanation Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Resumen de Impuestos</h2>
          <TaxSummaryExplainer returnId={returnId} />
        </div>

        {/* What-If Calculator Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Simulador ¿Qué pasaría si...?</h2>
          <WhatIfCalculator returnId={returnId} />
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Agregar a rutas de navegación

**Ubicación**: `apps/web/src/app/(app)/_layout.tsx`

Busca la sección de navegación y agrega:

```typescript
// En tu menu de navegación, agrega:
{
  label: '📊 Explicación de Impuestos',
  href: `/dashboard/tax-explanation`,
  icon: 'ChartBarIcon'
}
```

### 3.3 Integrar ProvenanceViewer en DocumentList

**Ubicación**: `apps/web/src/components/DocumentCard.tsx`

En el componente DocumentCard, agrega:

```typescript
import ProvenanceViewer from './ProvenanceViewer';
import DeltaViewer from './DeltaViewer';

export default function DocumentCard({ document, returnId }) {
  return (
    <div className="...">
      {/* Contenido existente */}
      
      {/* Agregar debajo */}
      <div className="mt-4 space-y-2">
        <ProvenanceViewer
          returnId={returnId}
          fieldKey="income.wages"  // Puedes hacerlo dinámico
          fieldLabel="Sueldos"
        />
        <DeltaViewer
          returnId={returnId}
          documentId={document.id}
          documentFileName={document.fileName}
        />
      </div>
    </div>
  );
}
```

---

## Paso 4: Testing

### 4.1 Verificación de endpoints manualmente

```bash
# Test 1: GET /api/returns/:id/explain
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/explain

# Respuesta esperada:
# {
#   "explanation": {
#     "grossIncome": { "total": 150000, "sources": [...] },
#     "deductions": { "total": 12000, "breakdown": [...] },
#     ...
#   }
# }

# Test 2: POST /api/returns/:id/what-if
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fieldKey": "income.wages", "newValue": 160000}' \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/what-if

# Test 3: GET /api/returns/:id/documents/:docId/delta
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/documents/doc-123/delta

# Test 4: GET /api/returns/:id/fields/:fieldKey/provenance
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/fields/income.wages/provenance
```

### 4.2 Pruebas en la UI

1. **TaxSummaryExplainer**:
   - Click en "Ver Desglose"
   - Las secciones deben expandirse
   - Los números deben coincidir con la declaración actual

2. **WhatIfCalculator**:
   - Selecciona un campo (ej: "Sueldos")
   - Ingresa un nuevo valor (ej: 160000)
   - Click "Simular Cambio"
   - Verifica que la tabla muestre la comparación

3. **ProvenanceViewer** (en DocumentCard):
   - Click en "¿De dónde vino este número?"
   - Debe mostrar el documento de origen
   - Debe mostrar la confianza del OCR

4. **DeltaViewer** (en DocumentCard):
   - Click en "¿Cuál fue el impacto de este documento?"
   - Debe mostrar los cambios en Income, Deductions, Taxes, Refund
   - El mensaje debe indicar si ahorró o pagó más

### 4.3 Checklist de validación

- [ ] Backend inicia sin errores
- [ ] Los 4 endpoints responden con status 200
- [ ] Las respuestas incluyen estructura completa (sin campos `undefined`)
- [ ] Los componentes renderean sin errores de consola
- [ ] Los botones hacen click y cargan datos
- [ ] Los números son correctos (coinciden con la lógica de impuestos)
- [ ] La autenticación JWT funciona
- [ ] Las respuestas respetan multi-tenant (no mezcla datos de otros usuarios)

---

## Troubleshooting

### Error: "Unauthorized" en los endpoints

**Causa**: Token JWT inválido o expirado

**Solución**:
```bash
# 1. Verifica que el token sea válido
# 2. En localStorage, asegúrate que tenga:
localStorage.setItem('token', 'your_jwt_token_here');

# 3. En Postman/curl, agrega el header correcto:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Error: "Cannot find module '@novasolutiontax/core'"

**Causa**: Falta importar TaxCalculator

**Solución**:
```typescript
// En apps/api/src/index.ts, agrega:
import { TaxCalculator } from '@novasolutiontax/core';
```

### Error: "Prisma connection failed"

**Causa**: Base de datos no está ejecutándose

**Solución**:
```bash
# 1. Verifica que PostgreSQL esté corriendo
# 2. Ejecuta migraciones:
cd apps/api
npm run prisma:migrate

# 3. Reinicia el servidor
npm run dev
```

### Los componentes no cargan datos

**Causa**: El token no se está enviando correctamente

**Solución**:
```typescript
// En los componentes, verifica:
const token = typeof window !== 'undefined' 
  ? localStorage.getItem('token') 
  : null;

if (!token) {
  console.error('No token found');
  return;
}

// El header debe ser exacto:
headers: {
  Authorization: `Bearer ${token}`,
}
```

### Error: "CORS error"

**Causa**: Las solicitudes de fetch desde web a API no tienen configuración CORS

**Solución** (en `apps/api/src/index.ts`):
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true,
}));
```

---

## ✅ Checklist de Integración

**Backend**:
- [ ] Endpoints agregados en `apps/api/src/index.ts`
- [ ] Dependencias instaladas (express, @prisma/client, uuid, etc.)
- [ ] Middlewares verificados (authenticateJWT, prisma)
- [ ] Base de datos migrada
- [ ] Servidor inicia sin errores

**Frontend**:
- [ ] 4 componentes creados en `apps/web/src/components/`
- [ ] Dependencias instaladas (@heroicons/react)
- [ ] Nueva página creada (`tax-explanation.tsx`)
- [ ] Rutas de navegación actualizadas
- [ ] Componentes integrados en páginas existentes

**Testing**:
- [ ] Los 4 endpoints responden correctamente
- [ ] Los componentes cargan datos sin errores
- [ ] La UI es responsive y bonita
- [ ] Los números son exactos

---

## 📊 Endpoints API - Referencia Rápida

| Método | Endpoint | Función | Respuesta |
|--------|----------|---------|----------|
| GET | `/api/returns/:id/explain` | Obtener explicación de impuestos | `{ explanation: {...}, insights: [...] }` |
| POST | `/api/returns/:id/what-if` | Simular cambio de campo | `{ current: {...}, whatIf: {...}, delta: {...} }` |
| GET | `/api/returns/:id/documents/:docId/delta` | Impacto del documento | `{ document: {...}, delta: {...}, impact: {...} }` |
| GET | `/api/returns/:id/fields/:key/provenance` | Origen del número | `{ provenance: [...], auditTrail: [...] }` |

---

## 📚 Componentes React - Referencia Rápida

| Componente | Ubicación | Props | Función |
|-----------|-----------|-------|---------|
| TaxSummaryExplainer | `components/TaxSummaryExplainer.tsx` | `returnId` | Muestra desglose de impuestos |
| WhatIfCalculator | `components/WhatIfCalculator.tsx` | `returnId` | Simulador de cambios |
| ProvenanceViewer | `components/ProvenanceViewer.tsx` | `returnId, fieldKey, fieldLabel` | ¿De dónde vino? |
| DeltaViewer | `components/DeltaViewer.tsx` | `returnId, documentId, fileName` | Impacto del doc |

---

## 🎓 Notas de Diseño

### Por qué usamos estos componentes:

1. **TaxSummaryExplainer**: Los usuarios quieren una visión general. Expandible para ver detalles.
2. **WhatIfCalculator**: Tax Planning sin CPA. "¿Vale la pena hacer una donación de $5000?"
3. **ProvenanceViewer**: Confianza. "¿De dónde sacó este número?"
4. **DeltaViewer**: Análisis. "¿Qué impacto tuvo este documento?"

### Por qué los endpoints funcionan así:

- **GET /explain**: No modifica estado, es seguro para GET
- **POST /what-if**: Modifica calculadora temporal, requiere POST
- **GET /delta**: Cálculo determinista, es seguro GET
- **GET /provenance**: Lectura de audit trail, es seguro GET

---

## 📞 Soporte

**Si encuentras problemas**:

1. Verifica los Requisitos de Dependencias
2. Comprueba los Token JWT
3. Mira los logs del servidor (`console.log`)
4. Revisa los errores de red (DevTools → Network)
5. Valida la estructura de datos en la BD

---

## 🎉 ¡Listo para integrar!

Todos los archivos están en formato **READY_TO_COPY**. No necesitas modificaciones. Solo copia y pega siguiendo esta guía.

**Tiempo estimado**: 30-45 minutos para integración completa + testing.

**Resultado**: Los usuarios verán exactamente cómo se calculan sus impuestos y podrán hacer análisis What-If. Esto es lo que los CPAs piden: "Transparencia + Educación".
