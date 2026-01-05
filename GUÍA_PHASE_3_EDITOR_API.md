# 🎯 GUÍA COMPLETA: PHASE 3 - EDITOR + AUDIT TRAIL API

**Versión**: 1.0
**Estado**: READY TO COPY (Todos los archivos listos para integración)
**Tiempo de integración estimado**: 30-40 minutos
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

**Objetivo**: Permitir que usuarios (y CPAs/Preparers) editen valores extraídos con razón registrada, recalculación automática, y audit trail completo.

**Casos de Uso**:
1. **Usuario edita sueldos**: "Recibí documento actualizado del empleador"
2. **CPA hace override**: "Verificado con cliente, número correcto es X"
3. **Ver historial**: "¿Cuántas veces se cambió esto? ¿Por qué?"

**Beneficios**:
- ✅ Edición con razón (compliance)
- ✅ Recalculación automática (precisión)
- ✅ Audit trail completo (responsabilidad)
- ✅ Override para CPAs (control)

---

## 📁 Archivos a Crear

```
✅ Backend (API Endpoints):
   └─ READY_TO_COPY_EDITOR_endpoints.ts
      └─ Integrar en: apps/api/src/index.ts
         • POST /returns/:id/fields/:key/edit
         • GET /returns/:id/fields/:key/audit
         • PUT /returns/:id/fields/:key/override
         • GET /returns/:id/audit-trail (bonus)

✅ Frontend (React Components):
   ├─ READY_TO_COPY_FieldEditor.tsx
   │  └─ apps/web/src/components/FieldEditor.tsx
   │     Componente para editar un campo
   │
   ├─ READY_TO_COPY_AuditTrailViewer.tsx
   │  └─ apps/web/src/components/AuditTrailViewer.tsx
   │     Ver audit trail completo del return
   │
   └─ READY_TO_COPY_ChangeHistory.tsx
      └─ apps/web/src/components/ChangeHistory.tsx
         Historial de cambios para un campo específico
```

---

## Paso 1: Backend - API Endpoints

### 1.1 Integración del archivo endpoints

**Ubicación**: `apps/api/src/index.ts`

1. Abre `apps/api/src/index.ts`
2. Ubícate ANTES de `app.listen()`
3. Copia TODOS estos endpoints de `READY_TO_COPY_EDITOR_endpoints.ts`:

```typescript
// POST /api/returns/:returnId/fields/:fieldKey/edit
app.post('/api/returns/:returnId/fields/:fieldKey/edit', authenticateJWT, async (req, res) => {
  // Editar campo con razón + recalcular
  // Requiere: { newValue, reason }
});

// GET /api/returns/:returnId/fields/:fieldKey/audit
app.get('/api/returns/:returnId/fields/:fieldKey/audit', authenticateJWT, async (req, res) => {
  // Ver audit trail de un campo específico
});

// PUT /api/returns/:returnId/fields/:fieldKey/override
app.put('/api/returns/:returnId/fields/:fieldKey/override', authenticateJWT, async (req, res) => {
  // Override por CPA/Preparer
  // Requiere role: preparer|cpa|admin
});

// GET /api/returns/:returnId/audit-trail
app.get('/api/returns/:returnId/audit-trail', authenticateJWT, async (req, res) => {
  // Ver audit trail completo del return
});
```

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

### 1.3 Prisma Schema - Verificar AuditLog

Asegúrate que tu schema Prisma tenga el modelo AuditLog:

```prisma
model AuditLog {
  id           String   @id @default(cuid())
  returnId     String
  return       TaxReturn @relation(fields: [returnId], references: [id], onDelete: Cascade)
  tenantId     String
  userId       String
  action       String   // FIELD_EDITED, FIELD_OVERRIDDEN, etc
  fieldKey     String   // income.wages, etc
  previousValue Json?
  newValue     Json?
  reason       String?
  metadata     Json?
  createdAt    DateTime @default(now())
  
  @@index([returnId, fieldKey])
  @@index([tenantId])
}
```

Si no existe, agrega y ejecuta:
```bash
npx prisma migrate dev --name add_audit_log
```

### 1.4 Verificación de endpoints

**Test GET /api/returns/:id/audit-trail**:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/audit-trail

# Respuesta esperada:
# {
#   "returnId": "550e8400-...",
#   "timeline": [
#     {
#       "timestamp": "2025-01-04T10:00:00Z",
#       "action": "FIELD_EDITED",
#       "field": "income.wages",
#       "previousValue": 50000,
#       "newValue": 55000,
#       "reason": "Documentado actualizado"
#     }
#   ],
#   "statistics": {
#     "totalChanges": 5,
#     "changesByType": { "fieldEdited": 3, "overridden": 2, "extracted": 0 }
#   }
# }
```

---

## Paso 2: Frontend - Componentes React

### 2.1 Crear archivos de componentes

Para cada `READY_TO_COPY_*.tsx`:

1. Copia TODO el contenido
2. Crea el archivo en la ubicación exacta:

```bash
# Componente 1: FieldEditor (Editar un campo)
apps/web/src/components/FieldEditor.tsx

# Componente 2: AuditTrailViewer (Ver historial completo)
apps/web/src/components/AuditTrailViewer.tsx

# Componente 3: ChangeHistory (Historial de un campo)
apps/web/src/components/ChangeHistory.tsx
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
├── FieldEditor.tsx              ← Nuevo
├── AuditTrailViewer.tsx         ← Nuevo
├── ChangeHistory.tsx            ← Nuevo
├── TaxSummaryExplainer.tsx      (Phase 2)
├── WhatIfCalculator.tsx         (Phase 2)
└── ... (otros componentes)
```

---

## Paso 3: Integración en Páginas

### 3.1 Agregar FieldEditor en ExtractedFieldsViewer

**Ubicación**: `apps/web/src/components/ExtractedFieldsViewer.tsx`

En cada campo extraído, reemplaza el display estático con el componente FieldEditor:

```typescript
// ANTES:
<p className="text-lg font-bold">${field.value.toLocaleString()}</p>

// DESPUÉS:
<FieldEditor
  returnId={returnId}
  fieldKey={field.key}
  fieldLabel={field.label}
  currentValue={field.value}
  onSuccess={(newValue) => {
    // Refetch o actualizar estado local
  }}
/>
```

### 3.2 Agregar AuditTrailViewer en Dashboard

**Ubicación**: `apps/web/src/app/dashboard/page.tsx` o nueva página

```typescript
'use client';

import AuditTrailViewer from '@/components/AuditTrailViewer';
import { useParams } from 'next/navigation';

export default function DashboardPage() {
  const params = useParams();
  const returnId = params.returnId as string;

  return (
    <div className="space-y-6">
      {/* ... otras secciones ... */}

      {/* Audit Trail Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Historial Completo</h2>
        <AuditTrailViewer returnId={returnId} />
      </div>
    </div>
  );
}
```

### 3.3 Agregar ChangeHistory en ExtractedFieldsViewer

Para cada campo, agrega botón de historial:

```typescript
<ChangeHistory
  returnId={returnId}
  fieldKey={field.key}
  fieldLabel={field.label}
/>
```

---

## Paso 4: Testing

### 4.1 Verificación de endpoints manualmente

```bash
# Test 1: POST /api/returns/:id/fields/:key/edit
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newValue": 55000,
    "reason": "Documentos actualizados del empleador"
  }' \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/fields/income.wages/edit

# Respuesta esperada:
# {
#   "success": true,
#   "field": "income.wages",
#   "previousValue": 50000,
#   "newValue": 55000,
#   "reason": "Documentos actualizados del empleador",
#   "updatedReturn": { ... }
# }

# Test 2: GET /api/returns/:id/fields/:key/audit
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/fields/income.wages/audit

# Test 3: PUT /api/returns/:id/fields/:key/override (CPA)
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "overrideValue": 52000,
    "overrideReason": "Verificado con cliente, número correcto",
    "requiresApproval": false
  }' \
  http://localhost:3001/api/returns/550e8400-e29b-41d4-a716-446655440000/fields/income.wages/override
```

### 4.2 Pruebas en la UI

1. **FieldEditor**:
   - Click en "Editar"
   - Ingresa nuevo valor
   - Ingresa razón
   - Click "Guardar"
   - Verifica que se actualice el campo
   - Verifica que se recalcule el total de impuestos

2. **ChangeHistory**:
   - Click en "Historial de Cambios"
   - Debe mostar todos los cambios previos
   - Cada cambio muestra: Antes → Después, razón, usuario

3. **AuditTrailViewer**:
   - Click en "Ver Historial Completo"
   - Debe mostrar timeline de todos los cambios
   - Estadísticas: total cambios por tipo
   - Expandir cada cambio para ver detalles

### 4.3 Checklist de validación

- [ ] Backend inicia sin errores
- [ ] Los 4 endpoints responden con status 200
- [ ] POST /edit guarda el cambio + recalcula
- [ ] GET /audit retorna historial del campo
- [ ] PUT /override solo funciona con role correcto
- [ ] GET /audit-trail muestra timeline completo
- [ ] Los componentes renderean sin errores
- [ ] Los botones hacen click y cargan datos
- [ ] Los números se recalculan automáticamente
- [ ] El audit trail se actualiza en real time

---

## Troubleshooting

### Error: "Solo preparers/CPAs pueden hacer overrides"

**Causa**: El usuario no tiene role correcto

**Solución**:
```typescript
// En tu middleware o controller, verifica que el user tenga:
user.role = 'preparer' | 'cpa' | 'admin'
```

### Error: "fieldKey no encontrado"

**Causa**: El fieldKey está mal formateado

**Solución**:
```typescript
// Usa formato correcto:
'income.wages'    ✓
'income_wages'    ✗
'incomeWages'     ✗

// Asegúrate de URL-encodear si es necesario:
encodeURIComponent('income.wages') // income%2Ewages
```

### Error: "AuditLog table doesn't exist"

**Causa**: Falta tabla en base de datos

**Solución**:
```bash
# Agregar a Prisma schema y migrar
npx prisma migrate dev --name add_audit_log
```

### Los componentes no cargan datos

**Causa**: Token JWT no se envía correctamente

**Solución**:
```typescript
// Verifica en FieldEditor/AuditTrailViewer:
const token = typeof window !== 'undefined'
  ? localStorage.getItem('token')
  : null;

// El header debe ser exacto:
headers: {
  Authorization: `Bearer ${token}`,
}
```

### Error: "Cambio no se guarda"

**Causa**: El endpoint retorna error de validación

**Solución**:
```typescript
// Verifica:
1. newValue es un número válido
2. reason no está vacío
3. fieldKey es válido
4. returnId existe

// Ver logs del servidor para más detalles
```

---

## ✅ Checklist de Integración

**Backend**:
- [ ] Endpoints agregados en `apps/api/src/index.ts`
- [ ] Dependencias instaladas
- [ ] Prisma schema actualizado con AuditLog
- [ ] Migraciones ejecutadas
- [ ] Servidor inicia sin errores

**Frontend**:
- [ ] 3 componentes creados
- [ ] Dependencias instaladas
- [ ] Componentes integrados en páginas
- [ ] FieldEditor integrado en ExtractedFieldsViewer
- [ ] AuditTrailViewer integrado en dashboard

**Testing**:
- [ ] Los 4 endpoints responden correctamente
- [ ] Los componentes cargan datos
- [ ] Los cambios se guardan y recalculan
- [ ] El audit trail se actualiza

---

## 📊 Endpoints API - Referencia Rápida

| Método | Endpoint | Función | Body |
|--------|----------|---------|------|
| POST | `/api/returns/:id/fields/:key/edit` | Editar campo | `{newValue, reason}` |
| GET | `/api/returns/:id/fields/:key/audit` | Ver audit de campo | - |
| PUT | `/api/returns/:id/fields/:key/override` | Override CPA | `{overrideValue, overrideReason}` |
| GET | `/api/returns/:id/audit-trail` | Ver audit completo | - |

---

## 📚 Componentes React - Referencia Rápida

| Componente | Props | Función |
|-----------|-------|---------|
| FieldEditor | `returnId, fieldKey, fieldLabel, currentValue` | Editar un campo |
| AuditTrailViewer | `returnId` | Ver audit trail completo |
| ChangeHistory | `returnId, fieldKey, fieldLabel` | Ver historial de un campo |

---

## 🎓 Flujo de Usuario

```
1. Usuario ve ExtractedFieldsViewer
   ├─ Cada campo muestra FieldEditor
   └─ Click "Editar" → Modal de edición

2. Usuario ingresa nuevo valor + razón
   ├─ Backend: POST /fields/:key/edit
   ├─ Sistema recalcula impuestos
   ├─ AuditLog registra cambio
   └─ Frontend: Muestra éxito

3. Usuario hace click "Historial de Cambios"
   ├─ ChangeHistory: GET /fields/:key/audit
   └─ Muestra timeline de cambios

4. CPA ve Dashboard
   ├─ AuditTrailViewer: GET /audit-trail
   ├─ Ve todos los cambios del return
   └─ Puede hacer override si necesario

5. Compliance: Ver audit trail completo
   ├─ Quién cambió qué
   ├─ Cuándo
   ├─ Por qué (razón registrada)
   └─ Impacto en impuestos
```

---

## 🎉 ¡Listo para integrar!

Todos los archivos están en formato **READY_TO_COPY**. No necesitas modificaciones. Solo copia y pega siguiendo esta guía.

**Tiempo estimado**: 30-40 minutos para integración completa + testing.

**Resultado**: Los usuarios pueden editar valores con razón registrada, el sistema recalcula automáticamente, y tienes audit trail completo para compliance.
