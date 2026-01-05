# 🤖 GUÍA PHASE 8: AI + RAG + CHATBOT

**Fecha**: 4 de enero de 2026  
**Versión**: 1.0  
**Tiempo de Integración**: 45-50 minutos  

---

## 📋 Contenido Entregado

### 1. Backend API (5 Endpoints)
- **POST /api/ai-rag/chat** - AI chat con RAG context
- **GET /api/ai-rag/chat/:conversationId** - Historial de conversación
- **POST /api/ai-rag/feedback** - Feedback en respuestas
- **POST /api/ai-rag/embed-documents** - Batch embedding de documentos
- **GET /api/ai-rag/stats** - Estadísticas de uso

### 2. React Components (1 Component)
- **ChatbotUI.tsx** (750+ líneas) - Chat interface completo

### 3. Database Models (4 Modelos)
- `AiChatMessage` - Mensajes de chat
- `AiResponseFeedback` - Feedback en respuestas
- `RagEmbedding` - Vector embeddings
- `AiUsageMetric` - Tracking de uso
- `AiEscalation` - Escalations a tickets

### 4. Documentation
- Setup instructions
- Integration guide
- API reference
- Troubleshooting

---

## 🚀 SETUP RÁPIDO (45 minutos)

### Paso 1: Configurar Backend (10 min)

#### 1.1 Instalación de dependencias
```bash
cd apps/api
npm install openai pinecone-client # Para vector DB
npm install dotenv # Para env variables
```

#### 1.2 Environment variables
```bash
# .env.local en apps/api
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=tax-rag
```

#### 1.3 Agregar rutas en Express
```typescript
// apps/api/src/app.ts
import aiRagRouter from './routes/ai-rag';

app.use('/api/ai-rag', aiRagRouter);
```

#### 1.4 Actualizar Prisma Schema
```bash
# Copiar modelos de READY_TO_COPY_AI_RAG_PrismaModels.ts
# a apps/api/prisma/schema.prisma
```

#### 1.5 Ejecutar migraciones
```bash
cd apps/api
npx prisma migrate dev --name "add_ai_rag_models"
npx prisma generate
```

### Paso 2: Crear frontend component (15 min)

#### 2.1 Crear archivo
```bash
# apps/web/src/app/chat/page.tsx
# Copiar contenido de READY_TO_COPY_ChatbotUI.tsx
```

#### 2.2 Crear layout para chat
```typescript
// apps/web/src/app/chat/layout.tsx
export default function ChatLayout({ children }) {
  return (
    <div className="h-screen">
      {children}
    </div>
  );
}
```

#### 2.3 Agregar ruta en Next.js
```typescript
// apps/web/src/app/_layout.tsx (app router)
// Agregar link a /chat en navigation
```

### Paso 3: Seed RAG Embeddings (10 min)

#### 3.1 Crear seed script
```bash
# apps/api/scripts/seed-rag.ts
```

```typescript
import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../lib/embeddings';

const prisma = new PrismaClient();

const ragDocuments = [
  {
    type: 'guide',
    topic: 'Income',
    text: 'W-2 forms report wages. Report in Box 1 on Form 1040.',
  },
  {
    type: 'calculation',
    topic: 'Deductions',
    text: '2025 standard deduction: Single=$15,000, MFJ=$30,000, HoH=$22,500',
  },
  {
    type: 'tip',
    topic: 'Credits',
    text: 'Child Tax Credit: $2,000 per child under 17',
  },
  {
    type: 'error',
    topic: 'Common Mistakes',
    text: 'Don\'t confuse credits with deductions. Credits reduce tax directly.',
  },
  {
    type: 'faq',
    topic: 'Filing Status',
    text: 'Choose the filing status that applies on Dec 31 of tax year.',
  },
];

async function main() {
  for (const doc of ragDocuments) {
    const embedding = await generateEmbedding(doc.text);
    
    await prisma.ragEmbedding.create({
      data: {
        ...doc,
        embedding: JSON.stringify(embedding),
      },
    });
  }
  
  console.log('✅ RAG embeddings seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

#### 3.2 Ejecutar seed
```bash
cd apps/api
npx ts-node scripts/seed-rag.ts
```

### Paso 4: Testing (10 min)

#### 4.1 Test POST /api/ai-rag/chat
```bash
curl -X POST http://localhost:3000/api/ai-rag/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "content": "What is the standard deduction?",
    "includeContext": true
  }'

# Response esperado:
{
  "success": true,
  "message": { "id": "msg_...", "role": "user", "content": "..." },
  "response": { "id": "msg_...", "role": "assistant", "content": "..." },
  "ragContext": { "documents": [...] },
  "tokens": { "query": 5, "response": 120, "total": 125 }
}
```

#### 4.2 Test POST /api/ai-rag/feedback
```bash
curl -X POST http://localhost:3000/api/ai-rag/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "messageId": "msg_...",
    "helpful": true,
    "reason": "Clear and accurate"
  }'
```

#### 4.3 Test GET /api/ai-rag/stats
```bash
curl -X GET "http://localhost:3000/api/ai-rag/stats?period=month" \
  -H "Authorization: Bearer <token>"

# Response esperado:
{
  "success": true,
  "period": "month",
  "stats": {
    "totalMessages": 25,
    "userMessages": 12,
    "assistantMessages": 13,
    "totalTokens": 3500,
    "estimatedCost": 0.0070,
    "feedback": {
      "total": 10,
      "helpful": 8,
      "unhelpful": 2,
      "helpfulPercentage": "80.00"
    }
  }
}
```

---

## 📊 Arquitectura RAG

### Flujo de ejecución:

```
User Query
    ↓
[1] Generate Embedding (OpenAI)
    ↓
[2] Vector Search (Pinecone)
    ↓
[3] Retrieve Context (Top 3 documents)
    ↓
[4] Build Prompt (System + Context + History)
    ↓
[5] Call LLM (GPT-4)
    ↓
[6] Save Message + Response
    ↓
[7] Log Audit + Check Escalation
    ↓
Response to User
```

### Componentes:

1. **Embeddings**: text-embedding-3-small (OpenAI)
2. **Vector DB**: Pinecone or Weaviate
3. **LLM**: GPT-4-turbo-preview
4. **Chat Store**: PostgreSQL (AiChatMessage)
5. **Feedback**: PostgreSQL (AiResponseFeedback)

---

## 🔌 Integración con Otros Modelos

### Relacionado con Phase 4 (Preparer Workflow)
- Chat puede escalarse a ticket para preparadores
- Chat message → AiEscalation → Ticket creado

### Relacionado con Phase 3 (Editor)
- Respuestas del AI pueden incluir sugerencias de edición
- Link a /editor para modificar campos

### Relacionado con Phase 2 (Explainable Taxes)
- Chat puede explicar deltas de cálculos
- Referencia a TaxSummaryExplainer para contexto

---

## 🧠 Prompt Engineering

### System Prompt (Mejorable)

```
You are a helpful US tax assistant. You help users understand their tax situation.

INSTRUCTIONS:
- Be accurate and cite tax law where possible
- Suggest escalation to a tax professional for complex scenarios
- Never provide definitive tax advice, suggest consultation
- Keep responses concise and helpful
- If unsure, say "I don't know" rather than guessing
- Format monetary amounts as $X,XXX.XX
- Cite 2025 tax brackets and rules

RELEVANT CONTEXT FROM KNOWLEDGE BASE:
1. [guide] W-2 forms report wages. Report in Box 1.
2. [calculation] 2025 standard deduction: Single=$15,000
3. [tip] Child Tax Credit: $2,000 per child under 17
```

### Ejemplos de optimización:
- Agregar more-shots examples
- Fine-tune con feedback real
- Add task-specific instructions

---

## 📈 Performance & Scaling

### Optimizaciones:

1. **Caching de embeddings**: Cache queries frecuentes
2. **Batch processing**: Embed múltiples documentos juntos
3. **Rate limiting**: 30 req/min por usuario
4. **Token tracking**: Monitor cost por usuario
5. **Async processing**: Use BullMQ para background jobs

### Tokens y Costos:

```
Input cost: $0.01 per 1M tokens (GPT-4)
Output cost: $0.03 per 1M tokens
Embedding cost: $0.02 per 1M tokens

Avg cost por message: ~$0.004-0.008
Expected: 1000 messages/month = $4-8
```

---

## 🐛 Troubleshooting

### Error: "Failed to generate query embedding"
```
Solución: Verificar OPENAI_API_KEY válida
- npm install openai@latest
- Verificar cuota de OpenAI
```

### Error: "Vector search failed"
```
Solución: Verificar conexión a Pinecone
- Verificar PINECONE_API_KEY
- Revisar índice existe: PINECONE_INDEX_NAME
- Test: curl https://api.pinecone.io/status
```

### Error: "RAG context documents empty"
```
Solución: Seed documents no cargados
- Ejecutar: npx ts-node scripts/seed-rag.ts
- Verificar embeddings en DB: SELECT COUNT(*) FROM RagEmbedding;
```

### Error: "Rate limit exceeded"
```
Solución: Usuario excedió límite de 30 req/min
- Implementar backoff exponencial
- Mostrar UI message: "Please wait a moment"
```

### Error: "Escalation failed: ticket not created"
```
Solución: Verificar Phase 9 Ticket System deployado
- Asegurar POST /api/tickets endpoint exists
- Verificar permisos de usuario
```

---

## ✅ Checklist de Implementación

- [ ] Variables de entorno configuradas (OPENAI_API_KEY, etc)
- [ ] Dependencias instaladas (openai, pinecone-client)
- [ ] Rutas agregadas en Express app
- [ ] Modelos de Prisma agregados
- [ ] Migraciones ejecutadas
- [ ] React component creado
- [ ] RAG embeddings seeded
- [ ] Endpoints testeados (5/5)
- [ ] UI component funciona
- [ ] Feedback endpoint funciona
- [ ] Stats endpoint funciona
- [ ] Escalation a tickets funciona
- [ ] Rate limiting activo
- [ ] Audit logging activo
- [ ] Error handling completo

---

## 🎯 Características Principales

### ChatbotUI Component
- ✅ Message history display
- ✅ Streaming response
- ✅ Suggestion pills
- ✅ RAG context display
- ✅ Feedback buttons (👍👎)
- ✅ Token tracking
- ✅ Error handling
- ✅ Escalation button
- ✅ Clear conversation
- ✅ Responsive design

### Backend Endpoints
- ✅ Multi-user support
- ✅ Multi-tenant isolation
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Token tracking
- ✅ Escalation logic
- ✅ Feedback collection
- ✅ Stats aggregation

---

## 🔐 Seguridad

- ✅ JWT authentication
- ✅ Multi-tenant checks
- ✅ Rate limiting
- ✅ Input validation (Zod schemas)
- ✅ Audit logging
- ✅ Error message redaction
- ✅ Token usage tracking

---

## 📝 Próximos Pasos

1. **Phase 9**: Ticket System (escalation destination)
2. **Phase 10**: Preparer Program (license management)
3. **Phase 11**: Mobile App (reuse all backends)

---

## 📞 Support

Para preguntas o issues:
1. Revisar troubleshooting section
2. Verificar logs: `docker logs api`
3. Test endpoints manualmente
4. Verificar variables de entorno

---

**Generated**: 4 de enero de 2026  
**Type**: Production Implementation Guide  
**Status**: ✅ Ready to Deploy
