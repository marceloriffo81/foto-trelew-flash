# Panel de precios · Foto Trelew Flash v4.3

Interfaz simple para **ver y modificar precios** con **usuarios** (queda registrado quién cambió qué).
Mismo estilo amarillo que el asistente de pedidos v4.3. Funciona en celular y computadora.

## Archivos

| Archivo | Qué es |
|---|---|
| `precios-admin.html` | La interfaz. Login con usuario y contraseña → lista de precios editables → Guardar. |
| `apps-script-pedidos-v2.gs` | Backend (mismo de siempre) **ampliado**: login, guardado de precios y auditoría. |

## Puesta en marcha (una sola vez)

1. **Actualizar el backend.** Abrí la hoja *pedidos trelewflash* → Extensiones → Apps Script. Reemplazá todo el código por el nuevo `apps-script-pedidos-v2.gs`.
2. **Ejecutá la función `setupAdmin`** (menú de funciones → `setupAdmin` → Ejecutar). Crea dos pestañas:
   - **Usuarios**: `usuario | contraseña | nombre | rol | activo`. Trae un usuario inicial `marcelo / cambiar123` — **cambiale la contraseña** y agregá los que quieras (una fila por persona, `activo` = `SI`).
   - **AuditoriaPrecios**: registro automático de cada cambio (fecha, quién, qué, valor anterior y nuevo).
3. **Re-desplegá:** Implementar → Administrar implementaciones → ✏️ editar → Versión: **Nueva** → Implementar. ⚠️ NO crear una implementación nueva: así se mantiene la misma URL que ya usa la app.
4. **Abrí `precios-admin.html`** (subilo al hosting junto al resto, o abrilo directo desde tu compu). Entrá con tu usuario.

## Cómo se usa

- Buscás el producto (hay un buscador arriba), cambiás el precio y tocás **Guardar cambios**.
- Los precios editados quedan resaltados hasta que guardás.
- Al guardar, se escriben en la pestaña `Catalogo` (variantes) o `Modificadores` (retoque, texto, armado de collage) y **la app los toma sola** al abrir, sin republicar nada.
- Cada guardado deja una fila en `AuditoriaPrecios` con tu nombre, la fecha y los valores anterior/nuevo.

## Para tener en cuenta

- **Agregar/quitar usuarios:** editás la pestaña `Usuarios` a mano. `activo` en `NO` desactiva a alguien sin borrarlo.
- **Contraseñas:** se guardan en texto plano en la hoja (solo vos, dueño del Drive, la ves). Alcanza para uso interno; no reutilices contraseñas importantes.
- La interfaz revalida usuario y contraseña **en cada guardado**, así que no hay sesión que caduque ni riesgo si dejás la pestaña abierta.
- Si cambiás precios seguido, cada tanto conviene regenerar el HTML de la app con el catálogo actualizado embebido (para que el respaldo offline no quede viejo). Ver `README-despliegue-v4_3.md`.
