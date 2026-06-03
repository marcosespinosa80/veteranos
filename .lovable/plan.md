# Login por DNI/Email + Recuperación de Contraseña

## 1. Base de datos (migration)

Agregar a `profiles`:
- `username text unique` — DNI limpio sin puntos (ya existe; agregar UNIQUE si falta)
- `recovery_email text unique` — email real
- `must_change_password boolean default false`

Asegurar `profiles.email` se sincroniza con el email Auth real.

## 2. Edge Functions

### a) `create-user` (modificar existente)
Nuevo payload: `{ username (DNI), recovery_email, password, nombre, apellido, role, activo, equipo_id, jugador_id_delegado?, delegado_posicion?, modules }`.
- Limpia DNI (sin puntos) → `username`.
- Valida `recovery_email` formato.
- Crea Auth user con `email = recovery_email` (no más `@lvfc.local`).
- Profile: `email = recovery_email`, `recovery_email`, `username = dni_limpio`.
- Mantiene lógica de roles/módulos/delegado existente.

### b) `resolve-login-identifier` (nueva, pública, verify_jwt=false)
Input: `{ identifier }`. Si contiene `@` → devuelve mismo. Si no → busca por `username = dniDigits(identifier)` y devuelve `email` asociado. En error siempre `{ email: null }` (no revelar existencia). Usa service role.

### c) `reset-user-password` (nueva, admin-only)
Input: `{ user_id, new_password }`. Verifica JWT del caller y que tenga rol `admin_general`. Llama `auth.admin.updateUserById` + setea `must_change_password=true`.

### d) `admin-send-recovery` (nueva, admin-only)
Input: `{ user_id }`. Verifica admin. Obtiene `recovery_email`, llama `auth.admin.generateLink` tipo `recovery` con `redirectTo=/cambiar-password` y envía vía sistema de email Lovable, **o** simplemente expone el `recovery_email` y el frontend llama `resetPasswordForEmail`. → Usaremos la opción simple: la edge function devuelve el `recovery_email` (solo admin) y el frontend hace `resetPasswordForEmail`.

### e) `admin-update-user-email` (nueva, admin-only)
Para usuarios viejos: actualiza `auth.users.email` + `profiles.email` + `profiles.recovery_email`.

## 3. Frontend

### Login (`src/pages/Login.tsx`)
- Label "DNI / Email", placeholder "Ingresá tu DNI o email".
- Si contiene `@` → signIn directo. Si no → llama `resolve-login-identifier` → signIn con email devuelto. Error genérico siempre.
- Tras login, si `profile.must_change_password` → redirigir a `/cambiar-password`.
- Link "Recuperar acceso" → abre modal/página `/recuperar`.

### Nueva página `/recuperar` (`RecuperarPassword.tsx`)
Form con email de recuperación → `resetPasswordForEmail(email, { redirectTo: origin+'/cambiar-password' })`. Mensaje genérico.

### Nueva página `/cambiar-password` (`CambiarPassword.tsx`)
Detecta evento `PASSWORD_RECOVERY` o sesión activa. Form nueva/repetir password (min 8). `auth.updateUser({ password })` + update profile `must_change_password=false` → redirect `/dashboard`.

### Wizard Nuevo Usuario (`NuevoUsuarioWizard.tsx`)
Reemplazar campo "email_or_username" por dos:
- DNI (con `DniInput`)
- Email de recuperación (obligatorio, validado)
- Contraseña inicial
Payload nuevo a `create-user`.

### Editar Usuario (`EditarUsuarioDialog.tsx`)
- Permitir editar DNI, recovery_email, email real (admin general).
- Botón "Enviar link de recuperación" → llama `admin-send-recovery` luego `resetPasswordForEmail`.
- Botón "Asignar contraseña temporal" → modal con password → `reset-user-password`.
- Si cambia email real → `admin-update-user-email`.

### App routes (`App.tsx`)
Agregar `/recuperar` y `/cambiar-password` (públicas).

## 4. AuthContext
Exponer `profile.must_change_password`. En ProtectedRoute, si está true y la ruta no es `/cambiar-password`, redirigir.

## Notas técnicas
- DNI normalizado con `dniDigits()` existente.
- Migrations: añadir columnas con `IF NOT EXISTS`; GRANTs ya existen para profiles.
- No tocar Supabase auth templates por ahora (usa defaults). Recovery email funciona con el sistema default de Supabase.
- Mensajes genéricos en login y recuperación para no filtrar existencia.
