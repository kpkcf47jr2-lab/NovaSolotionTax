# 🚀 NovaSolutionTax - Plan de Despliegue PASO A PASO

**Proyecto**: NovaSolutionTax
**Dominio**: novasolition.tax
**Fecha**: 5 de enero de 2026
**Tiempo Estimado Total**: 90-120 minutos

---

## 📋 CHECKLIST PRE-DESPLIEGUE

### Cuentas y Servicios Necesarios ✅
- [ ] **Vercel**: Cuenta gratuita (https://vercel.com)
- [ ] **Railway**: Cuenta gratuita (https://railway.app)
- [ ] **GitHub**: Repo push-ready
- [ ] **Cloudflare**: Cuenta gratuita (https://cloudflare.com)
- [ ] **Stripe**: Cuenta live keys (https://stripe.com)
- [ ] **OpenAI**: API key (https://platform.openai.com)
- [ ] **Dominio novasolition.tax**: Ya comprado ✓

### Información Crítica
```
DOMINIO PRINCIPAL: novasolition.tax
FRONTEND URL: app.novasolition.tax
API URL: api.novasolition.tax
EMAIL ADMIN: (tu email aquí)
```

---

## 🔧 FASE 1: PREPARACIÓN LOCAL (10 minutos)

### Paso 1.1: Verificar Estructura
```bash
cd /Users/marioisaacrodriguezdelrey/Desktop/novasolutiontax

# Verificar que tienes:
ls -la READY_TO_COPY_*          # ← Debe mostrar 40+ archivos
ls -la GUÍA_PHASE_*             # ← Debe mostrar 9 guías
ls -la 🚀_DEPLOYMENT_*          # ← Deployment guide
```

### Paso 1.2: Generar Secrets
```bash
# En terminal, copia esto 3 veces para generar 3 secrets:
openssl rand -hex 32

# Resultado:
JWT_SECRET=<secret_1>
NEXT_AUTH_SECRET=<secret_2>
API_KEY_INTERNAL=<secret_3>

# GUARDA ESTOS EN UN ARCHIVO SEGURO AHORA MISMO
```

### Paso 1.3: Crear Archivo .env.production.local
Crea archivo en `/Desktop/novasolutiontax/.env.production.local`:

```env
# NovaSolutionTax Production Secrets
# ⚠️ NUNCA commits esto a Git

# JWT & Auth
JWT_SECRET=<pega_secret_1_aqui>
NEXT_AUTH_SECRET=<pega_secret_2_aqui>

# API Keys (obtendrás estos en Railway)
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/novasolutiontax_prod
REDIS_URL=redis://localhost:6379

# URLs
NODE_ENV=production
API_URL=https://api.novasolition.tax
FRONTEND_URL=https://app.novasolition.tax
NEXT_PUBLIC_API_URL=https://api.novasolition.tax
NEXT_AUTH_URL=https://app.novasolition.tax
CORS_ORIGIN=https://app.novasolition.tax

# External APIs (copia tus keys reales aquí después)
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
CHECKR_API_KEY=...
```

---

## 🔑 FASE 2: RAILWAY (Backend) - 25 minutos

### Paso 2.1: Crear Proyecto en Railway
1. Ve a https://railway.app
2. Click **"New Project"**
3. Click **"Provision PostgreSQL"**
4. Click **"Provision Redis"** (agregar Redis también)

### Paso 2.2: Obtener Connection Strings
1. Abre proyecto en Railway
2. **PostgreSQL**:
   - Click en PostgreSQL
   - Tab "Connect"
   - Copia la URL completa (comienza con `postgresql://`)
   - Guárdala: `DATABASE_URL=postgresql://...`

3. **Redis**:
   - Click en Redis
   - Tab "Connect"
   - Copia la URL completa (comienza con `redis://`)
   - Guárdala: `REDIS_URL=redis://...`

### Paso 2.3: Crear Variables en Railway
En el proyecto Railway, ve a **"Variables"** y agrega:

```
# Database
DATABASE_URL=postgresql://postgres:...@containers-us-west-...

# Cache
REDIS_URL=redis://...

# JWT & Auth
JWT_SECRET=<pega_secret_1>
NEXT_AUTH_SECRET=<pega_secret_2>

# URLs
NODE_ENV=production
API_URL=https://api.novasolition.tax
FRONTEND_URL=https://app.novasolition.tax
CORS_ORIGIN=https://app.novasolition.tax

# External APIs
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
CHECKR_API_KEY=...
```

### Paso 2.4: Conectar GitHub
1. En Railway, click **"New Service"** → **"GitHub Repo"**
2. Autoriza Railway en GitHub
3. Selecciona repo `/Desktop/novasolutiontax`
4. Click **"Deploy"**

### Paso 2.5: Configurar Dominio
1. En Railway, click proyecto
2. Ir a "Settings" → "Domains"
3. Click **"Generate Domain"**
4. Copiar dominio generado (ej: `project.up.railway.app`)
5. Notarlo para DNS después

### Paso 2.6: Ejecutar Migraciones
En Railway, en el servicio API:
1. Click "Deployments" → última versión
2. Click "Logs"
3. Ejecutar comando:
```bash
npx prisma migrate deploy
```

**Status esperado**: ✅ Migrations completed successfully

---

## 🌐 FASE 3: VERCEL (Frontend) - 20 minutos

### Paso 3.1: Crear Proyecto
1. Ve a https://vercel.com
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Selecciona repo novasolutiontax
5. Click **"Import"**

### Paso 3.2: Configurar Variables de Entorno
En Vercel, en Settings → Environment Variables, agrega:

```
NEXT_PUBLIC_API_URL=https://api.novasolition.tax
NEXT_PUBLIC_APP_NAME=NovaSolutionTax
NEXT_AUTH_URL=https://app.novasolition.tax
NEXT_AUTH_SECRET=<pega_secret_2>
NODE_ENV=production
```

### Paso 3.3: Configurar Root Directory
En Project Settings → Root Directory:
- Selecciona: `apps/web`

### Paso 3.4: Desplegar
1. Click **"Deploy"**
2. Espera a que termine (3-5 min)
3. Copia URL: `https://novasolutiontax.vercel.app` (temporal)

---

## 🌍 FASE 4: DNS y DOMINIOS - 20 minutos

### Paso 4.1: Cloudflare Setup
1. Ve a https://cloudflare.com
2. Click **"Add Site"**
3. Ingresa: `novasolition.tax`
4. Selecciona plan: **Free**
5. Click **"Continue"**

### Paso 4.2: Actualizar Nameservers
Cloudflare te dará 2 nameservers. Ve a donde compraste el dominio (GoDaddy, Namecheap, etc.):

1. Login en registrador
2. Encuentra **"Nameservers"** o **"DNS"**
3. Reemplaza con nameservers de Cloudflare:
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`
4. Guarda cambios
5. **ESPERA 24-48 horas** (propagación DNS)

### Paso 4.3: Crear DNS Records en Cloudflare
En Cloudflare, sección DNS:

**Para Frontend (app.novasolition.tax → Vercel):**
```
Type: CNAME
Name: app
Content: cname.vercel-dns.com
Proxy: Proxied (orange cloud)
TTL: Auto
```

**Para API (api.novasolition.tax → Railway):**
```
Type: CNAME
Name: api
Content: <dominio_railway_aqui>.up.railway.app
Proxy: Proxied (orange cloud)
TTL: Auto
```

**Para Certificado SSL (dejar por defecto):**
```
Type: A
Name: @
Content: <IP_Cloudflare>
Proxy: Proxied (orange cloud)
```

### Paso 4.4: Habilitar SSL en Cloudflare
1. En Cloudflare, ir a **"SSL/TLS"**
2. Seleccionar **"Flexible"** (Vercel/Railway manejan su SSL)
3. Esperar 5-10 minutos

---

## 🔗 FASE 5: CONECTAR DOMINIOS - 15 minutos

### Paso 5.1: Vercel + Dominio Custom
En Vercel:
1. Ir a Project Settings → Domains
2. Click **"Add"**
3. Ingresa: `app.novasolition.tax`
4. Click **"Add"**
5. Vercel verificará DNS automáticamente

### Paso 5.2: Railway + Dominio Custom
En Railway:
1. Ir a proyecto → Settings → Domains
2. Click **"Custom Domain"**
3. Ingresa: `api.novasolition.tax`
4. Click **"Add"**
5. Verificar que DNS apunta correctamente

### Paso 5.3: Verificar Certificados SSL
Espera 10-15 minutos, luego verifica:

```bash
# Frontend
curl -I https://app.novasolition.tax
# Debe mostrar: HTTP/2 200 ✅

# API
curl -I https://api.novasolition.tax
# Debe mostrar: HTTP/2 200 ✅ 
# O HTTP/1.1 200 ✅
```

---

## 🧪 FASE 6: TESTING - 15 minutos

### Paso 6.1: Verificar Frontend
```bash
# Abrir en navegador
https://app.novasolition.tax

# Debe ver:
✅ Página carga sin errores
✅ Logo/branding: NovaSolutionTax
✅ No hay "mixed content" warnings
✅ Consola sin errores rojo
```

### Paso 6.2: Verificar API
```bash
# Test básico
curl -X GET https://api.novasolition.tax/health

# Debe responder:
{"status": "ok"} ✅

# O si el endpoint no existe:
404 ✅ (significa que el server responde)
```

### Paso 6.3: Verificar Conexión Frontend-API
En navegador, abrir DevTools (F12):

1. Ir a https://app.novasolition.tax
2. Abre "Network" tab
3. Intenta login o cualquier acción
4. Debe ver requests a `https://api.novasolition.tax`
5. ✅ Status debe ser 2xx o 3xx, NO 5xx

### Paso 6.4: Verificar Base de Datos
```bash
# En Railway, en PostgreSQL → Connect:
psql postgresql://user:pass@host:5432/novasolutiontax_prod

# Comandos test:
\dt                    # Lista tablas (debe mostrar 41+ tablas)
SELECT COUNT(*) FROM users;  # Debe retornar 0 o más
\q                     # Salir
```

### Paso 6.5: Verificar Redis
```bash
# En Railway, en Redis → Connect
redis-cli
ping
# Debe responder: PONG ✅
quit
```

---

## 📊 FASE 7: MONITOREO Y ALERTAS - 10 minutos

### Paso 7.1: Configurar Alertas en Vercel
1. En Vercel → Project Settings → Monitoring
2. Enable: **"Automatic Alerts"**
3. Recibirás email si hay crashes

### Paso 7.2: Configurar Alertas en Railway
1. En Railway → Project Settings
2. Enable: **"Notifications"**
3. Configura email para alertas

### Paso 7.3: Habilitar Logging
En Railway, en servicio API:
1. Click "Logs"
2. Ver que hay logs en tiempo real
3. Filtrar por level: error, warn

---

## 🎉 FASE 8: VERIFICACIÓN FINAL - 10 minutos

### Checklist Final ✅

- [ ] Frontend carga en https://app.novasolition.tax
- [ ] API responde en https://api.novasolition.tax
- [ ] SSL/HTTPS funciona (candado verde)
- [ ] Base de datos tiene 41+ tablas
- [ ] Redis conecta correctamente
- [ ] DNS propagó (nameservers actualizados)
- [ ] Logs en Vercel sin errores rojos
- [ ] Logs en Railway sin errores rojos
- [ ] Email de confirmación funciona
- [ ] Login funciona
- [ ] Dashboard carga datos
- [ ] Stripe webhook configurado
- [ ] OpenAI API funciona

### Testing Final
```bash
# 1. Verificar dominio
dig novasolition.tax

# 2. Verificar SSL
openssl s_client -connect app.novasolition.tax:443

# 3. Verificar API
curl -v https://api.novasolition.tax/health

# 4. Verificar velocidad
curl -w "Tiempo: %{time_total}s\n" -o /dev/null https://app.novasolition.tax
```

---

## ⚠️ TROUBLESHOOTING COMÚN

### Problema: DNS no propaga
**Solución**: Espera 24-48 horas, verifica que nameservers estén correctos

### Problema: SSL error (mixed content)
**Solución**: Asegúrate que NEXT_PUBLIC_API_URL=https:// (con https)

### Problema: API timeout
**Solución**: Verifica Database URL y conexión en Railway

### Problema: "Cannot GET /health"
**Solución**: Normal si endpoint no existe. Prueba con curl y mira status code

### Problema: 502 Bad Gateway
**Solución**: API crash. Revisa logs en Railway para error específico

---

## 📞 NEXT STEPS

### Si TODO funciona ✅
1. ✅ Despliegue completado
2. 🔄 Monitoreo 24/7 habilitado
3. 📱 Fase 12: Mobile App (próxima)
4. 🔄 Backups automáticos configurados

### Si HAY PROBLEMAS ❌
1. Revisar logs en Vercel: https://vercel.com/dashboard
2. Revisar logs en Railway: https://railway.app/dashboard
3. Revisar DNS: https://cloudflare.com
4. Contactar soporte: support@platform.novasolition.tax

---

## 📋 INFORMACIÓN DE CONTACTO

**Soporte Técnico:**
- Vercel: https://vercel.com/support
- Railway: https://railway.app/support
- Cloudflare: https://support.cloudflare.com

**Mi Dashboard:**
- Vercel: https://vercel.com/dashboard
- Railway: https://railway.app/dashboard
- Cloudflare: https://dash.cloudflare.com

---

**Despliegue Planeado**: 5 de enero de 2026
**Estado**: 🟡 EN PREPARACIÓN
**Próximo Paso**: Ejecutar Fase 1 (Preparación Local)

¿ESTÁS LISTO? 🚀
