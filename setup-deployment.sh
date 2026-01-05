#!/bin/bash

# ============================================================================
# NovaSolutionTax - Deployment Automation Script
# ============================================================================
# Este script automatiza TODA la configuración local para despliegue
# Uso: bash setup-deployment.sh
# ============================================================================

set -e  # Exit on error

echo "🚀 NovaSolutionTax - Setup Automation"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# PASO 1: Verificaciones
# ============================================================================
echo -e "${YELLOW}[PASO 1/6] Verificando ambiente...${NC}"

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: No estás en la carpeta del proyecto${NC}"
  echo "Ejecuta: cd /Users/marioisaacrodriguezdelrey/Desktop/novasolutiontax"
  exit 1
fi

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js no está instalado${NC}"
  echo "Descárgalo: https://nodejs.org"
  exit 1
fi

# Verificar npm/pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}⚠️  pnpm no instalado. Instalando...${NC}"
  npm install -g pnpm
fi

echo -e "${GREEN}✅ Ambiente verificado${NC}"
echo ""

# ============================================================================
# PASO 2: Generar Secrets
# ============================================================================
echo -e "${YELLOW}[PASO 2/6] Generando secrets de seguridad...${NC}"

JWT_SECRET=$(openssl rand -hex 32)
NEXT_AUTH_SECRET=$(openssl rand -hex 32)
INTERNAL_API_KEY=$(openssl rand -hex 32)

echo -e "${GREEN}✅ Secrets generados:${NC}"
echo "  JWT_SECRET=${JWT_SECRET:0:16}..."
echo "  NEXT_AUTH_SECRET=${NEXT_AUTH_SECRET:0:16}..."
echo "  INTERNAL_API_KEY=${INTERNAL_API_KEY:0:16}..."
echo ""

# ============================================================================
# PASO 3: Crear .env files
# ============================================================================
echo -e "${YELLOW}[PASO 3/6] Creando archivos .env...${NC}"

# Archivo: .env.production.local
cat > .env.production.local << EOF
# ============================================================================
# NovaSolutionTax - Production Secrets
# ⚠️  NUNCA commits esto a Git - está en .gitignore
# ============================================================================

# Security
JWT_SECRET=${JWT_SECRET}
NEXT_AUTH_SECRET=${NEXT_AUTH_SECRET}
INTERNAL_API_KEY=${INTERNAL_API_KEY}

# Database (actualizar después de crear en Railway)
DATABASE_URL=postgresql://user:password@localhost:5432/novasolutiontax_prod
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=production

# URLs
API_URL=https://api.novasolition.tax
FRONTEND_URL=https://app.novasolition.tax
NEXT_PUBLIC_API_URL=https://api.novasolition.tax
NEXT_AUTH_URL=https://app.novasolition.tax
CORS_ORIGIN=https://app.novasolition.tax

# External APIs (Obtener keys en cada servicio)
OPENAI_API_KEY=sk-your-key-here
STRIPE_SECRET_KEY=sk_live_your-key-here
STRIPE_PUBLISHABLE_KEY=pk_live_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-key-here
CHECKR_API_KEY=your-key-here

# Optional: Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EOF

echo -e "${GREEN}✅ Archivo creado: .env.production.local${NC}"
echo "   ⚠️  Actualiza manualmente con las keys de:"
echo "   • Railway (DATABASE_URL, REDIS_URL)"
echo "   • Stripe (STRIPE_SECRET_KEY, etc.)"
echo "   • OpenAI (OPENAI_API_KEY)"
echo ""

# ============================================================================
# PASO 4: Crear archivos de configuración para Vercel/Railway
# ============================================================================
echo -e "${YELLOW}[PASO 4/6] Creando configuraciones para Vercel y Railway...${NC}"

# vercel.json
cat > vercel.json << 'EOF'
{
  "version": 2,
  "buildCommand": "cd ../.. && pnpm build",
  "installCommand": "cd ../.. && pnpm install",
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "https://api.novasolition.tax",
    "NEXT_AUTH_URL": "https://app.novasolition.tax"
  },
  "domains": [
    "app.novasolition.tax"
  ],
  "github": {
    "enabled": true,
    "autoAlias": false
  }
}
EOF

# railway.json
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd apps/api && npm run build"
  },
  "deploy": {
    "startCommand": "cd apps/api && npm start",
    "restartPolicyMaxRetries": 3,
    "restartPolicyWindowMs": 60000
  },
  "plugins": [
    {
      "source": "https://github.com/railwayapp/railway-templates/tree/main/plugins/postgres"
    },
    {
      "source": "https://github.com/railwayapp/railway-templates/tree/main/plugins/redis"
    }
  ]
}
EOF

echo -e "${GREEN}✅ Archivos creados:${NC}"
echo "   • vercel.json (configuración Vercel)"
echo "   • railway.json (configuración Railway)"
echo ""

# ============================================================================
# PASO 5: Crear GitHub Actions para CI/CD
# ============================================================================
echo -e "${YELLOW}[PASO 5/6] Creando GitHub Actions CI/CD...${NC}"

mkdir -p .github/workflows

# deploy-production.yml
cat > .github/workflows/deploy-production.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Vercel Deploy
        run: |
          npm install -g vercel
          vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      
      - name: Railway Deploy
        run: |
          npm install -g @railway/cli
          railway up --service api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          RAILWAY_PROJECT_ID: ${{ secrets.RAILWAY_PROJECT_ID }}
EOF

# test.yml
cat > .github/workflows/test.yml << 'EOF'
name: Test

on:
  pull_request:
    branches: [main, master, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Build
        run: pnpm build
EOF

echo -e "${GREEN}✅ GitHub Actions creado:${NC}"
echo "   • .github/workflows/deploy-production.yml"
echo "   • .github/workflows/test.yml"
echo ""

# ============================================================================
# PASO 6: Instrucciones finales
# ============================================================================
echo -e "${YELLOW}[PASO 6/6] Generando checklist final...${NC}"

cat > DEPLOYMENT_READY.md << 'EOF'
# ✅ NovaSolutionTax - Listo para Despliegue

## 🎯 Lo que se ha automatizado:

✅ Secrets generados y guardados en .env.production.local
✅ Configuraciones creadas (vercel.json, railway.json)
✅ GitHub Actions CI/CD configurado
✅ Estructura lista para deploying

## 📋 Próximos pasos (SOLO CLICKS visuales):

### 1. GitHub - Preparar Repo
```bash
git add .
git commit -m "Setup: Deploy automation"
git push origin main
```

### 2. Vercel - 5 minutos (CLICKS)
- [ ] Ve a https://vercel.com/new
- [ ] Click "Import Git Repository"
- [ ] Selecciona repo: novasolutiontax
- [ ] Root Directory: `apps/web`
- [ ] Click "Deploy"
- [ ] Espera 3-5 minutos
- [ ] Copia URL temporal: `https://novasolutiontax.vercel.app`

### 3. Railway - 10 minutos (CLICKS)
- [ ] Ve a https://railway.app/new
- [ ] Click "Provision PostgreSQL"
- [ ] Click "Provision Redis"
- [ ] Ve a "Deployments" → "New"
- [ ] Selecciona repo: novasolutiontax
- [ ] Root: `apps/api`
- [ ] Click "Deploy"
- [ ] Copia DATABASE_URL y REDIS_URL
- [ ] Pega en .env.production.local
- [ ] Ejecuta: `npx prisma migrate deploy`

### 4. Cloudflare - 15 minutos (CLICKS)
- [ ] Ve a https://cloudflare.com/dashboard
- [ ] Click "Add a site"
- [ ] Ingresa: `novasolition.tax`
- [ ] Click "Continue"
- [ ] Copia nameservers Cloudflare
- [ ] Ve a registrador (GoDaddy, etc.)
- [ ] Pega nameservers en "Nameservers"
- [ ] Guarda cambios

### 5. DNS Records en Cloudflare
Crea estos 2 records:

**Frontend:**
- Type: CNAME
- Name: app
- Content: cname.vercel-dns.com
- Proxy: Proxied (orange cloud)

**API:**
- Type: CNAME
- Name: api
- Content: [tu-railway-domain].up.railway.app
- Proxy: Proxied

### 6. Conectar Dominios Custom
**Vercel:**
- Project Settings → Domains
- Add: `app.novasolition.tax`

**Railway:**
- Project Settings → Domains
- Add: `api.novasolition.tax`

### 7. Esperar & Verificar
```bash
# Espera 10-15 minutos para propagación DNS

# Verifica Frontend
curl -I https://app.novasolition.tax
# Debe mostrar: HTTP/2 200

# Verifica API
curl -I https://api.novasolition.tax
# Debe mostrar: HTTP/2 200 o 404 (es ok)
```

## 🎉 ¡Listo!

Cuando ambos URLs respondan con HTTPS 🔒, ¡tu plataforma está en vivo!

**Dashboard de monitoreo:**
- Vercel: https://vercel.com/dashboard
- Railway: https://railway.app/dashboard
- Cloudflare: https://dash.cloudflare.com
EOF

echo -e "${GREEN}✅ Checklist generado: DEPLOYMENT_READY.md${NC}"
echo ""

# ============================================================================
# Resumen Final
# ============================================================================
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SETUP COMPLETADO - LISTO PARA DESPLEGAR${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 Checklist de deployment:"
echo ""
echo "✅ 1. Secrets generados → .env.production.local"
echo "✅ 2. Archivos de config → vercel.json, railway.json"
echo "✅ 3. GitHub Actions → .github/workflows/"
echo "✅ 4. Documentación → DEPLOYMENT_READY.md"
echo ""
echo "📝 Siguientes pasos:"
echo ""
echo "1. Abre: DEPLOYMENT_READY.md"
echo "2. Sigue los clicks visuales (sin terminal)"
echo "3. Cada sección toma 5-15 minutos"
echo "4. Total: ~60 minutos"
echo ""
echo "⏱️  Tiempo total de despliegue: ~90 minutos (incluida espera DNS)"
echo ""
echo "🚀 ¡Estás 95% automatizado!"
echo ""
