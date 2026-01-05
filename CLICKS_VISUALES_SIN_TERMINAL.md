# 🎯 DEPLOYMENT - Solo CLICKS Visuales (SIN Terminal)

**Tiempo Total**: ~90 minutos
**Dificultad**: ⭐ Muy Fácil
**Errores Posibles**: Casi 0 (todo automatizado)

---

## PASO 1️⃣: GitHub - Push del Código (5 minutos)

### En Terminal (solo copy/paste):
```bash
cd /Users/marioisaacrodriguezdelrey/Desktop/novasolutiontax
git add .
git commit -m "Setup: Deployment automation and configuration"
git push origin main
```

✅ **Listo**. El código está en GitHub.

---

## PASO 2️⃣: Vercel - Desplegar Frontend (5-10 minutos)

### CLICK 1: Abre Vercel
Abre en navegador: **https://vercel.com**

### CLICK 2: Login
- Si tienes cuenta: Click **Login**
- Si no: Click **Sign Up** (usa GitHub)

### CLICK 3: Nuevo Proyecto
Click botón grande: **"Add New..."** → **"Project"**

### CLICK 4: Importar GitHub
- Click **"Import Git Repository"**
- En el campo de búsqueda, escribe: **`novasolutiontax`**
- Selecciona tu repo
- Click **"Import"**

### CLICK 5: Configurar
Aparecerá una pantalla. Llena así:

```
Project Name: novasolutiontax
Framework Preset: Next.js ← (auto-detecta)
Root Directory: ← BUSCA EL DROPDOWN
                  Haz click y selecciona: apps/web
```

### CLICK 6: Variables de Entorno
- Click botón **"Environment Variables"**
- Agrega estas 5 variables:

```
NEXT_PUBLIC_API_URL = https://api.novasolition.tax
NEXT_PUBLIC_APP_NAME = NovaSolutionTax
NEXT_AUTH_URL = https://app.novasolition.tax
NEXT_AUTH_SECRET = [abre .env.production.local y copia el valor de NEXT_AUTH_SECRET]
NODE_ENV = production
```

### CLICK 7: Deploy
Click botón grande: **"Deploy"**

⏳ **ESPERA 3-5 minutos** (verás progreso en pantalla)

### CLICK 8: Copiar URL
Cuando termina, verás URL como:
```
https://novasolutiontax.vercel.app
```

📝 **GUARDA ESTA URL** (la necesitarás después)

✅ **Frontend deployado en Vercel**

---

## PASO 3️⃣: Railway - Desplegar Backend (10-15 minutos)

### CLICK 1: Abre Railway
Abre en navegador: **https://railway.app**

### CLICK 2: Login
- Si tienes cuenta: Click **Login**
- Si no: Click **Sign Up** (usa GitHub)

### CLICK 3: Nuevo Proyecto
Click: **"New Project"** (botón arriba a la derecha)

### CLICK 4: Agregar Servicios
Una pantalla con opciones. Haz esto:

**4a. Base de Datos:**
- Click **"Provision PostgreSQL"**
- ⏳ Espera 30 segundos (se crea la BD)

**4b. Cache:**
- Click **"New Service"** o icono **+**
- Busca: **"Redis"**
- Click **"Provision Redis"**
- ⏳ Espera 30 segundos (se crea Redis)

### CLICK 5: Conectar GitHub
- Click **"New Service"** o icono **+**
- Click **"GitHub Repo"**
- Autoriza Railway (verás popup de GitHub)
- Selecciona repo: **novasolutiontax**
- Click **"Deploy"**

⏳ **ESPERA 2-3 minutos** (first deploy toma más)

### CLICK 6: Obtener DATABASE_URL

En la pantalla Railway:
- Click en **PostgreSQL** (el servicio)
- Click en tab **"Connect"**
- Busca la URL: comienza con `postgresql://`
- 📋 **COPIA COMPLETA** (incluyendo contraseña)

Abre en texto: `.env.production.local`
Busca: `DATABASE_URL=postgresql://...`
Reemplaza con la URL que copiaste

### CLICK 7: Obtener REDIS_URL

En la pantalla Railway:
- Click en **Redis** (el servicio)
- Click en tab **"Connect"**
- Busca la URL: comienza con `redis://`
- 📋 **COPIA COMPLETA**

Abre en texto: `.env.production.local`
Busca: `REDIS_URL=redis://...`
Reemplaza con la URL que copiaste

### CLICK 8: Guardar y hacer Push

```bash
# En Terminal:
cd /Users/marioisaacrodriguezdelrey/Desktop/novasolutiontax

# Edita .env con las URLs que copiaste
# Luego:
git add .env.production.local
git commit -m "Add production database and redis URLs"
git push origin main
```

Railway se redeploya automáticamente ⏳ (2-3 min)

### CLICK 9: Ejecutar Migraciones

En Railway:
- Click en el servicio **API** (el GitHub que deployaste)
- Click tab **"Logs"**
- Busca comandos recientes

Ejecuta en terminal:
```bash
cd /Users/marioisaacrodriguezdelrey/Desktop/novasolutiontax
npx prisma migrate deploy
```

✅ Debe mostrar: `Migrations completed successfully`

### CLICK 10: Obtener Dominio Temporal

En Railway:
- Click API service
- Click tab **"Settings"** o **"Domains"**
- Verás algo como: `api-production-xxxx.up.railway.app`
- 📝 **GUARDA ESTE DOMINIO**

✅ **Backend deployado en Railway**

---

## PASO 4️⃣: Cloudflare - Configurar DNS (10-15 minutos)

### CLICK 1: Abre Cloudflare
Abre en navegador: **https://cloudflare.com**

### CLICK 2: Login
Click **"Log In"** (usa email o GitHub)

### CLICK 3: Añadir Sitio
- Click botón: **"Add a site"** o **"Add site"**
- En el campo, escribe: **`novasolition.tax`**
- Click **"Add site"**
- Selecciona plan: **Free** (está bien para inicio)
- Click **"Continue"**

### CLICK 4: IMPORTANTE - Cambiar Nameservers

Cloudflare te mostrará 2 nameservers:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**Necesitas cambiarlos en tu registrador (donde compraste el dominio)**

**Si compraste en GoDaddy:**
- Abre: https://godaddy.com (login)
- My Products → Domains
- Click dominio: novasolition.tax
- DNS section
- Busca "Nameservers"
- Click "Change Nameservers"
- Reemplaza con los de Cloudflare
- Guarda

**Si compraste en Namecheap:**
- Abre: https://namecheap.com (login)
- Dashboard → Domains
- Click Management
- Nameservers section
- Selecciona "Custom DNS"
- Pega los de Cloudflare
- Guarda

⏳ **ESPERA 5-30 minutos** (a veces 24 horas)

### CLICK 5: Crear DNS Records en Cloudflare

Mientras espera la propagación:

En Cloudflare dashboard:
- Click tu sitio: **novasolition.tax**
- Click **"DNS"** (lado izquierdo)
- Click **"Add record"**

**AGREGAR RECORD 1 (Frontend):**
```
Type: CNAME
Name: app
Content: cname.vercel-dns.com
Proxy: Proxied (el toggle naranja debe estar ACTIVO)
TTL: Auto
```
Click **"Save"**

**AGREGAR RECORD 2 (API):**
```
Type: CNAME
Name: api
Content: [el dominio de Railway que guardaste: api-production-xxxx.up.railway.app]
Proxy: Proxied (el toggle naranja debe estar ACTIVO)
TTL: Auto
```
Click **"Save"**

✅ **DNS Records creados**

---

## PASO 5️⃣: Conectar Dominios Custom (10 minutos)

### EN VERCEL:

- Abre: https://vercel.com/dashboard
- Click tu proyecto: **novasolutiontax**
- Click **"Settings"** (arriba)
- Click **"Domains"** (lado izquierdo)
- En campo "Assign Domain", escribe: **`app.novasolition.tax`**
- Click **"Add"**

✅ Vercel verifica DNS automáticamente

### EN RAILWAY:

- Abre: https://railway.app
- Click tu proyecto
- Click en servicio **API**
- Click **"Settings"** o **"Domains"**
- Click **"Add Custom Domain"** o **"New Domain"**
- Escribe: **`api.novasolition.tax`**
- Click **"Add"**

✅ Railway verifica DNS automáticamente

---

## PASO 6️⃣: Verificación Final (5 minutos)

### ESPERA 10-15 minutos

⏰ **Espera a que DNS propague** (verás candados 🔒 en navegador)

### TEST 1: Frontend
Abre en navegador:
```
https://app.novasolition.tax
```

✅ **Debe verse:**
- Página carga sin errores
- Candado 🔒 verde en URL bar
- NO dice "Connection not secure"
- NO error 502 o 404

### TEST 2: API
Abre en navegador:
```
https://api.novasolition.tax/health
```

✅ **Debe verse algo como:**
```json
{"status": "ok"}
```

**O si endpoint no existe:**
```
Cannot GET /health
```
(Esto es OK - significa el server responde)

### TEST 3: HTTPS Check
Click en candado 🔒 en URL:

✅ **Debe mostrar:**
```
Connection is secure
Certificate: valid
```

---

## 🎉 ¡LISTO!

Si TODO pasó los tests ✅:

**Tu plataforma está VIVA en:**
- 🌐 **Frontend**: https://app.novasolition.tax
- 🔌 **API**: https://api.novasolition.tax
- 📊 **Dominio**: novasolition.tax

---

## ⚠️ TROUBLESHOOTING

### "Connection refused" o "Cannot connect"
**→ Espera más tiempo** (DNS propaga 5-30 min, a veces 24 hrs)

### "502 Bad Gateway"
**→ API crash.** Chequea Railway logs (click service → Logs)

### "This connection is not private" (SSL error)
**→** Verifica que nameservers están en Cloudflare
**→** Espera 5-10 minutos más

### "App carga pero dice error"
**→** Verifica que NEXT_PUBLIC_API_URL = https://api.novasolition.tax en Vercel variables

### DNS no propaga
**→** Verifica nameservers con: https://mxtoolbox.com/nslookup
**→** Deben mostrar: ns1.cloudflare.com, ns2.cloudflare.com

---

## 📞 Soporte Rápido

Si algo falla:
1. Verifica **Railway Logs** (click service → Logs)
2. Verifica **Vercel Logs** (click deployment → Logs)
3. Verifica **Cloudflare DNS** (DNS tab, deben estar 2 CNAME records)
4. Verifica **URLs en .env** (DATABASE_URL, REDIS_URL, API URLs)

---

## 🎯 Resumen de Tiempo

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | GitHub Push | 2 min |
| 2 | Vercel Deploy | 10 min |
| 3 | Railway Deploy | 15 min |
| 4 | Cloudflare DNS | 15 min |
| 5 | Conectar Dominios | 5 min |
| 6 | Esperar + Test | 20 min |
| **TOTAL** | | **~60 minutos** |

---

**Hoy: 5 de enero de 2026**
**Status**: 🟢 READY FOR DEPLOYMENT
**Next**: Sigue los pasos 1-6 arriba

¿EMPEZAMOS? 🚀
