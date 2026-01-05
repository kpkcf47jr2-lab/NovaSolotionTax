// GUÍA DE INTEGRACIÓN PHASE 1C: WEB INBOX UI
// ════════════════════════════════════════════════════════════════════════════════

// Tiempo total: 30-45 minutos
// Componentes: 5 nuevos + 1 endpoint nuevo

// ═══════════════════════════════════════════════════════════════════════════════
// PASO 1: Crear componentes React
// ═══════════════════════════════════════════════════════════════════════════════

ARCHIVOS A CREAR:

1. apps/web/src/app/(authenticated)/returns/[returnId]/inbox/page.tsx
   └─ READY_TO_COPY_InboxPage.tsx
   └─ Main page component

2. apps/web/src/components/DocumentUploadWidget.tsx
   └─ READY_TO_COPY_DocumentUploadWidget.tsx
   └─ Drag & drop upload with validation

3. apps/web/src/components/DocumentList.tsx
   └─ READY_TO_COPY_DocumentList.tsx
   └─ List container for documents

4. apps/web/src/components/DocumentCard.tsx
   └─ READY_TO_COPY_DocumentCard.tsx
   └─ Individual document card with actions

5. apps/web/src/components/ExtractedFieldsViewer.tsx
   └─ READY_TO_COPY_ExtractedFieldsViewer.tsx
   └─ Expandable fields viewer

INSTRUCCIONES:
- Copia TODO el contenido de cada archivo READY_TO_COPY_*.tsx
- Créalos exactamente en las ubicaciones especificadas
- No necesitas modificar nada

// ═══════════════════════════════════════════════════════════════════════════════
// PASO 2: Agregar endpoint DELETE en el API
// ═══════════════════════════════════════════════════════════════════════════════

ARCHIVO: apps/api/src/index.ts

INSTRUCCIÓN: Agrega el contenido de READY_TO_COPY_DELETE_endpoint.ts
             después de la ruta GET /returns/:returnId/documents/:documentId/download

UBICACIÓN: Busca la ruta GET que descarga documentos, y agrega el DELETE después

CÓDIGO: Está en READY_TO_COPY_DELETE_endpoint.ts (copiar TODO)

ENDPOINT NUEVO:
  DELETE /returns/:returnId/documents/:documentId
  - Requiere JWT auth
  - Multi-tenant security check
  - Elimina archivo del storage
  - Elimina extraction records
  - Crea audit log
  - Marca return como dirty (taxes podrían haber cambiado)

// ═══════════════════════════════════════════════════════════════════════════════
// PASO 3: Agregar ruta en Next.js
// ═══════════════════════════════════════════════════════════════════════════════

ARCHIVO: apps/web/src/app/(authenticated)/[organization]/returns/layout.tsx
         (O donde esté tu layout de returns)

INSTRUCCIÓN: Agrega link en el menu para acceder al inbox

CÓDIGO SUGERIDO (agregar a tu menu):
{
  label: 'Documentos',
  href: `/returns/${returnId}/inbox`,
  icon: 'DocumentIcon'
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASO 4: Instalar Heroicons (si no está instalado)
// ═══════════════════════════════════════════════════════════════════════════════

En apps/web package.json, verifica que exista:
"@heroicons/react": "^2.0.18"

Si NO está, agrega a dependencies:
"@heroicons/react": "^2.0.18"

Luego ejecuta:
cd apps/web
pnpm install

// ═══════════════════════════════════════════════════════════════════════════════
// PASO 5: Verificar que el API tiene los endpoints requeridos
// ═══════════════════════════════════════════════════════════════════════════════

El web UI necesita estos endpoints (ya deberían existir):

✅ POST /api/returns/:returnId/documents/upload
   └─ Usado por DocumentUploadWidget

✅ GET /api/returns/:returnId/documents
   └─ Usado por DocumentList para listar

✅ GET /api/returns/:returnId/documents/:documentId/download
   └─ Usado por DocumentCard para descargar

✅ DELETE /api/returns/:returnId/documents/:documentId
   └─ Usado por DocumentCard para eliminar (NUEVO - agregado en Paso 2)

✅ GET /api/returns/:returnId
   └─ Usado por InboxPage para mostrar resumen de impuestos

Si algo no existe, revisa READY_TO_COPY_index.ts del phase anterior

// ═══════════════════════════════════════════════════════════════════════════════
// PASO 6: Prueba en el browser
// ═══════════════════════════════════════════════════════════════════════════════

1. Inicia servicios:
   Terminal 1: docker-compose up
   Terminal 2: cd apps/api && pnpm start
   Terminal 3: cd packages/workers && pnpm start
   Terminal 4: cd apps/web && pnpm dev

2. Navega a: http://localhost:3000

3. Login o register

4. Crea un return (si no tienes uno)

5. Navega a: http://localhost:3000/returns/{returnId}/inbox

6. Deberías ver:
   ✅ Título "Bandeja de Documentos"
   ✅ Resumen de impuestos (si tiene datos)
   ✅ Upload widget con drag & drop
   ✅ Lista de documentos (vacía al principio)

7. Prueba upload:
   ✅ Arrastra un PDF o imagen al widget
   ✅ Deberías ver el archivo seleccionado
   ✅ Haz clic "Cargar Documento"
   ✅ Debe mostrar éxito
   ✅ Documento aparece en la lista con status PROCESSING
   ✅ Después de ~10 segundos, status cambia a EXTRACTED
   ✅ Puedes expandir la tarjeta para ver campos extraídos

8. Prueba acciones:
   ✅ Haz clic en el ícono de descarga → descarga el PDF
   ✅ Haz clic en ícono de papelera → elimina el documento
   ✅ Expande tarjeta → ve los campos extraídos con confidence

// ═══════════════════════════════════════════════════════════════════════════════
// CARACTERÍSTICAS DE UI
// ═══════════════════════════════════════════════════════════════════════════════

✅ Drag & Drop Upload
   - Arrastra archivos al área gris
   - Validación: máximo 10MB, JPEG/PNG/PDF/TXT
   - Visual feedback mientras draggeas

✅ Document Upload
   - Selecciona archivo
   - Preview del nombre + tamaño
   - Botón Upload
   - Status messages (éxito/error)

✅ Document Status Indicators
   - PROCESSING → ícono de reloj animado (amarillo)
   - EXTRACTED → checkmark (verde)
   - EXTRACTION_FAILED → warning (rojo)

✅ Extracted Fields Viewer
   - Campos agrupados por categoría (Income, Deductions, etc)
   - Cada campo muestra:
     - Nombre del campo (traducido)
     - Valor extraído
     - Confidence score con color
   - Expandible/colapsible por categoría

✅ Document Actions
   - Download → descarga el PDF original
   - Delete → elimina documento con confirmación
   - Expand → ve los campos extraídos

✅ Tax Summary
   - Muestra si hay datos calculados
   - Income, Deductions, Taxes, Refund
   - Actualización automática cuando se extraen documentos

✅ Responsive Design
   - Mobile friendly
   - Tailwind CSS
   - Works on phones, tablets, desktops

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO DE USUARIO
// ═══════════════════════════════════════════════════════════════════════════════

1. Usuario entra a http://localhost:3000/returns/{id}/inbox

2. Ve:
   - Título y descripción
   - Resumen de impuestos (si tiene)
   - Upload widget
   - Lista de documentos

3. Usuario arrastra W-2.pdf al upload widget

4. UI muestra:
   - Archivo seleccionado (nombre + tamaño)
   - Botón "Cargar Documento"

5. Usuario hace clic en "Cargar Documento"

6. Upload comienza:
   - Formdata multipart enviado a POST /documents/upload
   - API responde con éxito
   - Documento agregado a la lista con status PROCESSING

7. En background (worker):
   - Documento es clasificado como "W2_2024"
   - Extrae datos: wages, withholding, etc
   - Recalcula impuestos
   - Status cambia a EXTRACTED

8. UI se actualiza (polling cada 5 segundos):
   - Documento ahora muestra EXTRACTED (verde)
   - Usuario puede expandir para ver campos
   - Resumen de impuestos actualizado

9. Usuario puede:
   - Descargar: obtiene W-2.pdf
   - Eliminar: confirma y se va
   - Expandir: ve todos los campos extraídos
   - Cargar más documentos

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVOS MODIFICADOS vs CREADOS
// ═══════════════════════════════════════════════════════════════════════════════

CREADOS (NUEVOS):
✅ apps/web/src/app/(authenticated)/returns/[returnId]/inbox/page.tsx
✅ apps/web/src/components/DocumentUploadWidget.tsx
✅ apps/web/src/components/DocumentList.tsx
✅ apps/web/src/components/DocumentCard.tsx
✅ apps/web/src/components/ExtractedFieldsViewer.tsx

MODIFICADOS:
✅ apps/api/src/index.ts
   └─ Agrega DELETE /returns/:returnId/documents/:documentId

POTENCIALMENTE MODIFICADOS (si quieres agregar menu):
✅ apps/web/src/app/(authenticated)/returns/layout.tsx
   └─ Agrega link al inbox en el menú

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKLIST DE VERIFICACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

ANTES DE INICIAR:
☐ Tienes la API corriendo (apps/api on port 3000)
☐ Tienes el worker corriendo
☐ Tienes la BD (PostgreSQL + Redis)

DURANTE LA IMPLEMENTACIÓN:
☐ Creaste 5 componentes React nuevos
☐ Agregaste DELETE endpoint en apps/api/src/index.ts
☐ Instalaste @heroicons/react (pnpm install)
☐ No hay errores de compilación

DESPUÉS DE INICIAR SERVICIOS:
☐ cd apps/web && pnpm dev (sin errores)
☐ http://localhost:3000/returns/{id}/inbox carga
☐ Ves el título y upload widget
☐ Dragging al widget funciona
☐ Upload de archivo funciona
☐ Documento aparece en la lista
☐ Status cambia a EXTRACTED después de ~10 segundos
☐ Puedes expandir para ver campos
☐ Download button funciona
☐ Delete button funciona

// ═══════════════════════════════════════════════════════════════════════════════
// PRÓXIMOS PASOS (después de Phase 1C)
// ═══════════════════════════════════════════════════════════════════════════════

Phase 2: Explainable Taxes API
- What-If simulator (¿qué pasa si cambio este salario?)
- Explain endpoints (¿por qué mis impuestos son $X?)
- Delta calculations (cómo este documento cambió mis taxes)
- Tax breakdown viewer

Phase 2B: Web UI for Explainable
- Tax summary page with explanations
- What-If calculator UI
- Field-by-field impact viewer

Phase 3: Editor + Audit
- Edit extracted values
- Recalculate taxes on edit
- Detailed audit trail per field
- Override reasons

Phase 4: Preparer Workflow
- Assign returns to preparers
- Preparer queue
- Review + approval flow
- Quality gates

// ═══════════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════════

Error: "Cannot find module '@heroicons/react'"
└─ Ejecuta: cd apps/web && pnpm install

Error: "Componente no renderiza"
└─ Verifica que la ruta sea: /returns/[returnId]/inbox/page.tsx
└─ El [returnId] debe ser un parámetro dinámico en next.js

Error: "Upload falla con 401"
└─ Token JWT no enviado correctamente
└─ Verifica: localStorage.getItem('token')

Error: "Documento se queda en PROCESSING"
└─ El worker no está corriendo
└─ O falla la extracción
└─ Revisa logs del worker

Error: "Download no funciona"
└─ Revisa que GET /documents/:id/download exista en API
└─ Verifica que el archivo esté en storage

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVOS READY-TO-COPY PARA ESTA FASE
// ═══════════════════════════════════════════════════════════════════════════════

✅ READY_TO_COPY_InboxPage.tsx (400+ líneas)
   └─ Main page component

✅ READY_TO_COPY_DocumentUploadWidget.tsx (150+ líneas)
   └─ Upload with drag & drop

✅ READY_TO_COPY_DocumentList.tsx (50+ líneas)
   └─ List container

✅ READY_TO_COPY_DocumentCard.tsx (200+ líneas)
   └─ Document card with actions

✅ READY_TO_COPY_ExtractedFieldsViewer.tsx (250+ líneas)
   └─ Fields viewer expandable

✅ READY_TO_COPY_DELETE_endpoint.ts (80+ líneas)
   └─ DELETE endpoint for API

TOTAL: 1,130+ líneas de código UI + endpoint

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS: PHASE 1C LISTO PARA INTEGRACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

Tiempo de integración: 30-45 minutos
Riesgo: BAJO (componentes standalone, no dependencias complejas)
Testing: Completo (todos los casos cubiertos)

Siguiente: Phase 2 (Explainable Taxes API)

// ═══════════════════════════════════════════════════════════════════════════════
