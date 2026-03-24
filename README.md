# Generador de Recibos — con Supabase

## Requisitos previos
- Node.js 18 o superior
- Una cuenta gratis en [supabase.com](https://supabase.com)

---

## Paso 1: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo (tarda ~2 minutos).

2. Una vez creado, ve a **SQL Editor** en el panel lateral y pega todo el contenido del archivo `schema.sql`. Haz clic en **Run**. Esto crea las tablas `clientes` y `recibos` con las políticas de seguridad.

3. Ve a **Settings → API** y copia:
   - **Project URL** (algo como `https://abcdef.supabase.co`)
   - **anon/public key** (la clave larga que empieza con `eyJ...`)

4. Abre el archivo `src/lib/supabase.js` y reemplaza:
   ```js
   const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co'
   const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI'
   ```

5. En Supabase ve a **Authentication → Providers** y asegúrate de que **Email** esté activado. Si no quieres que los usuarios confirmen su correo durante pruebas, ve a **Authentication → Settings** y desactiva "Confirm email".

---

## Paso 2: Instalar y correr la app

```bash
# Instala las dependencias
npm install

# Corre en modo desarrollo
npm run dev
```

Abre `http://localhost:5173`

---

## Estructura del proyecto

```
src/
├── lib/
│   └── supabase.js          ← Credenciales de Supabase
├── hooks/
│   └── useAuth.js           ← Login, registro, sesión
├── pages/
│   ├── AuthPage.jsx         ← Login y registro
│   ├── NuevoReciboPage.jsx  ← Formulario con búsqueda de cliente
│   ├── ClientesPage.jsx     ← CRUD de clientes
│   └── HistorialPage.jsx    ← Historial de recibos
├── components/
│   └── VistaRecibo.jsx      ← Recibo imprimible
├── App.jsx                  ← Navegación y toasts
└── index.css                ← Estilos
```

---

## ¿Cómo funciona?

- Cada cobrador se registra con su correo y contraseña.
- Cada uno solo ve sus propios clientes y recibos (Row Level Security en Supabase).
- El flujo es: Clientes → Nuevo recibo (busca el cliente) → se guarda en DB → se imprime.
- El historial muestra todos los recibos anteriores con opción de reimprimir.

---

## Build para producción

```bash
npm run build
```

La carpeta `dist/` se puede subir a Netlify, Vercel, o cualquier hosting estático.
