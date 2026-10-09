# Arquitectura de correo institucional — Iglesia Lirio de los Valles

> **Estado del documento: DISEÑO. No hay nada que implementar a partir de él todavía.**
>
> Describe lo que **ya existe y está verificado** en el Sistema de Eventos, y plantea
> —sin construirlas— las opciones para que otros proyectos de la Iglesia puedan enviar
> correo algún día. Cada afirmación está marcada con su naturaleza:
>
> | Marca | Significado |
> |---|---|
> | ✅ **VERIFICADO** | Medido en ejecución. Hay evidencia. |
> | 🧭 **PROPUESTA** | Opción de diseño. Nadie la ha aprobado. |
> | 🔐 **REQUIERE AUTORIZACIÓN** | Toca credenciales, permisos o identidad institucional. |
> | 🚫 **NO IMPLEMENTAR AHORA** | Explícitamente fuera de alcance en esta etapa. |

**Fecha:** 2026-10-09 · **Alcance:** dominios `liriodelosvallescr.org` y `liriodelosvalles.org`.

---

## 1. Por qué existe este documento

El Sistema de Eventos necesitó enviar un correo —el enlace de recuperación de
contraseña— y se le construyó una capacidad mínima para hacerlo. Funciona.

El riesgo no es técnico, es organizativo: **el siguiente proyecto que necesite enviar
correo copiará lo que encuentre.** Si lo que encuentra es «hay una cuenta de servicio
con una clave que ya funciona», acabaremos con una credencial compartida entre
proyectos que nadie decidió compartir, usada para cosas que nadie evaluó, y con un
radio de impacto que crece en silencio.

Este documento existe para que esa decisión se tome **a propósito** y una sola vez.

---

## 2. Lo que existe hoy ✅ VERIFICADO

Una única capacidad, de un único proyecto, con un único propósito.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PC de la Iglesia · Hyper-V · VM eventos-prod · Docker               │
│                                                                      │
│   Sistema de Eventos (Node.js)                                       │
│        │                                                             │
│        │  services/email.service.js                                  │
│        │  · decodifica GOOGLE_SA_KEY_B64 (solo en memoria)           │
│        │  · construye el MIME a mano                                 │
│        ▼                                                             │
│   google-auth-library · JWT con `subject`  ──── delegación de dominio │
└────────┬─────────────────────────────────────────────────────────────┘
         │ HTTPS  (scope único: gmail.send)
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Google Workspace de la Iglesia   (tenant: liriodelosvallescr.org)   │
│                                                                      │
│   suplanta ──► soporte@liriodelosvallescr.org     (usuario REAL)     │
│                     └── alias ──► notificaciones@…  (el From visible) │
│                                                                      │
│   POST /gmail/v1/users/me/messages/send                              │
└────────┬─────────────────────────────────────────────────────────────┘
         ▼
     Destinatario   ·   From: notificaciones@   ·   Reply-To: soporte@
```

### 2.1 Decisiones ya tomadas, y su motivo

| Decisión | Motivo |
|---|---|
| **Cuenta de servicio**, no SMTP con usuario y contraseña | No ata el sistema a la contraseña ni a la 2FA de una persona. Nadie tiene que recordar nada |
| **Delegación de dominio** con **un solo scope** (`gmail.send`) | Permite enviar. **No** leer, no listar, no borrar. Es el privilegio mínimo real, no uno aproximado |
| **Cero roles IAM** en la cuenta de servicio | La delegación de dominio no los necesita. Pedir uno habría ampliado el permiso sin razón |
| Suplantar `soporte@` y enviar como `notificaciones@` | La Gmail API **no puede suplantar un alias**: `subject` debe ser un usuario con buzón |
| **Cero dependencias npm nuevas** | `google-auth-library` ya estaba; Node 20 trae `fetch`; el MIME se arma a mano |
| Clave en **base64 de una línea** | El escritor de configuración rechaza valores con saltos de línea, y la clave PEM los tiene |

> ⚠️ **Trampa documentada.** Si `notificaciones@` dejara de ser alias de `soporte@`,
> el envío falla con `400 Invalid From header` y el mensaje **no dice** que la causa
> sea el alias. Es el fallo más probable y el menos evidente.

### 2.2 Separación de identidades

Tres papeles distintos que conviene no confundir:

| Papel | Quién | Por qué separado |
|---|---|---|
| **Identidad técnica** | la cuenta de servicio | No es una persona. No tiene buzón. No recibe nada |
| **Identidad suplantada** (`subject`) | `soporte@` | Tiene que ser un usuario real; es el requisito de la API |
| **Identidad visible** (`From`) | `notificaciones@` | Un remitente del que nadie espera respuesta, separado del buzón que sí atiende personas |
| **Identidad de respuesta** (`Reply-To`) | `soporte@` | Si alguien responde al correo, llega a un humano |

**El servidor fija SIEMPRE `From` y `Reply-To` desde variables de entorno.** El cuerpo
de la petición solo aporta el destinatario. No existe camino por el que un cliente
pueda influir en quién aparece como remitente.

### 2.3 Gestión de secretos

- La clave vive como **secret del repositorio privado** del Sistema de Eventos, y se
  escribe en el archivo de configuración persistente de la VM (modo `600`).
- **Nunca se escribe a disco** desde la aplicación: se decodifica en memoria por envío.
- El nombre de la variable (`…KEY…`) está elegido para que el enmascarador de secretos
  del pipeline la reconozca. Un nombre que no encajara se habría impreso en el log
  público. Esto es deliberado, no casual.
- ✅ **VERIFICADO**: el registro de configuración muestra `PRESENTE` / `AUSENTE`,
  nunca el valor.

### 2.4 Auditoría y observabilidad

| Evento | Significa |
|---|---|
| `password_reset_requested` | Alguien pidió un enlace |
| `password_reset_email_sent` | El envío por Gmail API **retornó con éxito** |
| `password_reset_email_failed` | El envío falló |
| `password_reset_completed` | El enlace se canjeó |

**El diagnóstico útil está en el par.** Un `requested` **sin** su `email_sent` es
exactamente la firma de «la infraestructura de correo está rota». ✅ **VERIFICADO**:
una dirección inexistente produce `requested` sin `email_sent`, mientras la respuesta
HTTP es byte-idéntica a la de una cuenta real — el registro interno distingue, la
respuesta pública no.

> 🔒 **El token en claro nunca llega a un registro.** Lo que se guarda es su huella
> (`sha256` recortado), suficiente para correlacionar y no para reconstruir.

### 2.5 Límites conocidos ✅ VERIFICADO

| Límite | Valor |
|---|---|
| Destinatarios | Correo transaccional uno-a-uno. **Sin listas, sin masivo** |
| Cuota de la Gmail API | La de un usuario Workspace. Holgada para este uso; **sería el primer techo** si varios proyectos compartieran la identidad |
| Caducidad de la clave | **No caduca** |
| Crear claves nuevas | **Bloqueado** por política de organización; exige excepción temporal 🔐 |
| Dominio emisor | **Solo** `liriodelosvallescr.org` (ver §3) |

---

## 3. Los dos dominios NO son intercambiables ✅ VERIFICADO

Comprobado en la consola de administración y en DNS público el 2026-10-09. **No se
cambió ningún registro.**

| | `liriodelosvallescr.org` | `liriodelosvalles.org` |
|---|---|---|
| En el Workspace | **Dominio principal** | **Dominio secundario** |
| Estado del correo (consola) | Todo está bien | ⚠️ **Acción necesaria** |
| MX | Google Workspace | **Cloudflare Email Routing** |
| SPF | incluye `_spf.google.com` | **solo** `_spf.mx.cloudflare.net` |
| DMARC | `p=none` con `rua` | **ausente** |

**Secundario no es alias, y la diferencia es la que importa aquí.** Un *alias de
dominio* habría duplicado automáticamente cada buzón. Un *dominio secundario* es un
espacio de nombres aparte: `soporte@liriodelosvalles.org` **no existe** porque exista
`soporte@liriodelosvallescr.org`.

**Consecuencia práctica:** la delegación de dominio alcanza al tenant entero, así que
*técnicamente* podría suplantar a un usuario de `liriodelosvalles.org` — pero **hoy no
hay ninguno**, su SPF no autoriza a Google y no tiene DMARC. Enviar desde ahí fallaría
SPF y acabaría casi con seguridad en spam.

**Y, sobre todo, ese no es su papel.** Su diseño aprobado
([`superpowers/specs/2026-09-16-dominio-liriodelosvalles-org-design.md`](superpowers/specs/2026-09-16-dominio-liriodelosvalles-org-design.md))
lo define como **mirror web** del sitio público: mismo Next.js, mismo Directus,
canonical self-referencing. Ese documento **no menciona el correo en ninguna parte**
—ni MX, ni SPF, ni Workspace—, lo cual encaja con lo medido: su MX apunta a Cloudflare
Email Routing, no a Google.

⇒ Su alta como dominio secundario en el Workspace es un hecho **no registrado en
ningún diseño**. Puede ser deliberado (reservar el nombre) o un residuo. Esto se
documenta aquí por primera vez; **no se toca**.

⇒ 🚫 **NO IMPLEMENTAR AHORA.** Habilitar ese dominio para envío es un proyecto propio
con cambios de DNS, y los cambios de DNS son de la plataforma institucional.

---

## 4. Opciones para proyectos futuros 🧭 PROPUESTA

Cuando un segundo proyecto necesite enviar correo, hay tres caminos. **Ninguno está
elegido.**

### Opción A — Reutilizar la cuenta de servicio del Sistema de Eventos

Dar la misma clave al proyecto nuevo.

| A favor | En contra |
|---|---|
| Cero trabajo | **Una filtración compromete a todos los proyectos a la vez** |
| Nada que aprobar | La auditoría de Workspace no distingue quién envió qué: todo aparece como `soporte@` |
| | Revocar por un incidente de un proyecto **apaga el correo de los demás** |
| | Las cuotas se comparten sin aislamiento |

🚫 **Desaconsejada.** Es el camino por defecto si nadie decide, y es justo lo que este
documento intenta evitar. El ahorro es de minutos; el coste aparece el día del
incidente.

### Opción B — Una cuenta de servicio por proyecto, mismo tenant

Cada proyecto con su propia cuenta de servicio, su propia clave y su propia entrada de
delegación de dominio, todas con el mismo scope `gmail.send`.

| A favor | En contra |
|---|---|
| **Aislamiento real de credenciales**: revocar una no afecta a las demás | Más entradas de delegación que mantener |
| Cada proyecto puede tener su `From` propio | Cada clave nueva choca con la política de organización 🔐 |
| La auditoría puede atribuir por Client ID | Sigue dependiendo de que exista el usuario suplantado |

🧭 **Es la opción recomendada por este documento** si el número de proyectos se mantiene
pequeño. Es la que menos cambia respecto de lo que ya funciona y la que más reduce el
radio de impacto.

### Opción C — Un servicio de correo institucional compartido

Un pequeño servicio propio al que los demás proyectos le piden «envía esto», con la
credencial de Google encerrada en él.

| A favor | En contra |
|---|---|
| La clave vive en **un solo sitio** | **Hay que construirlo, desplegarlo y mantenerlo** |
| Política común: reintentos, límites, plantillas, registro | Nuevo punto único de fallo: si cae, ningún proyecto envía |
| Atribución por proyecto de fábrica | Necesita su propia autenticación entre servicios, o se convierte en un relé abierto |
| Un solo lugar donde rotar | Hay que decidir dónde corre, y ninguna de las máquinas actuales es obvia |

🧭 Justificable **solo** a partir de tres o cuatro proyectos emisores, o si aparece una
necesidad común real (plantillas, reintentos, panel de envíos). Hoy no la hay.

### Controles de aislamiento mínimos, elija la opción que se elija

1. **Una identidad `From` por proyecto.** Que el destinatario pueda saber qué sistema le
   escribe sin leer las cabeceras.
2. **Scope `gmail.send` y nada más.** Nunca `gmail.compose`, `gmail.modify` ni
   `https://mail.google.com/`.
3. **Cero roles IAM** en las cuentas de servicio.
4. **Una clave por proyecto**, en el almacén de secretos de *ese* repositorio.
5. **Par `requested` / `sent` en la auditoría de cada proyecto** — es lo que convierte un
   fallo silencioso en uno diagnosticable.
6. **Ningún proyecto obtiene acceso de lectura a buzones.** Nunca.

---

## 5. Pruebas y recuperación ante incidentes

### 5.1 Cómo probar sin molestar a nadie 🧭 PROPUESTA

Lo que hoy falta y conviene resolver antes que nada: **una cuenta de prueba con buzón
controlado**. Sin ella, verificar la entrega de extremo a extremo obliga a usar un buzón
real de una persona, que es exactamente lo que no debe hacerse de forma rutinaria.

Escalera recomendada:

| Nivel | Qué prueba | Coste |
|---|---|---|
| Transporte de registro | La lógica, sin enviar nada | Ninguno |
| Transporte a archivo | El MIME completo, en un archivo local | Ninguno |
| Transporte en memoria | Tests automatizados | Ninguno |
| Envío real a **cuenta de prueba** | Delegación, alias, SPF/DKIM, entrega | Requiere la cuenta 🔐 |

> ⚠️ **Lección del 2026-10-07, aprendida por las malas.** Un enlace de recuperación
> **real** abierto con una herramienta que imprime la URL deja el token escrito en el
> registro de la sesión. Si ocurre: **canjearlo de inmediato** —eso lo invalida a él y a
> todos los enlaces vivos de esa cuenta— y registrar la contraseña nueva donde
> corresponda. Para verificar entrega **basta con comprobar que la página de destino
> muestra el formulario**; no hace falta completar el cambio.

### 5.2 Si el correo deja de salir

Síntoma: el usuario pide el enlace, recibe la respuesta genérica de siempre y no llega
nada. En la auditoría: `requested` **sin** `email_sent`.

Orden de comprobación, de lo más probable a lo menos:

1. ¿`notificaciones@` sigue listado como «Enviar mensaje como» de `soporte@`?
2. ¿`soporte@` sigue activo y con buzón?
3. ¿La delegación de dominio conserva el Client ID y el scope `gmail.send`?
4. ¿La clave sigue existiendo en Google Cloud y presente en la configuración?
5. ¿La URL base del enlace está definida? Sin ella el servicio **no envía** a propósito:
   un enlace roto es peor que un correo que no sale.

**El sistema no queda inoperable por esto.** El login normal y el de Google siguen
funcionando; un administrador puede cambiar contraseñas a mano mientras tanto.

---

## 6. Qué hace falta antes de implementar nada 🔐

| # | Requisito | Por qué |
|---|---|---|
| 1 | **Decidir la opción** (A, B o C) con fecha y responsable | Sin decisión explícita, gana la A por inercia |
| 2 | **Nombrar un responsable institucional** del Workspace | Hoy **no está documentado**. Sin él, nadie sabe a quién consultar |
| 3 | **Cuenta y buzón de prueba** | Ver §5.1 |
| 4 | **Procedimiento de rotación de claves** | Hoy no existe; la clave no caduca y crear otra exige excepción |
| 5 | **Decidir el futuro de `liriodelosvalles.org`** | Si va a emitir correo, necesita usuarios, SPF, DMARC y una decisión sobre MX |
| 6 | **Política de retención de los registros de envío** | Qué se guarda, cuánto y quién lo consulta |

---

## 7. Fuera de alcance 🚫

No se hace, y este documento no autoriza a hacerlo:

- Crear cuentas de servicio, claves, scopes, delegaciones o secretos para otros proyectos.
- Ampliar el alcance de la cuenta de servicio del Sistema de Eventos.
- Compartir su clave con cualquier otro proyecto.
- Cambiar DNS, MX, SPF, DKIM o DMARC de cualquiera de los dos dominios.
- Crear usuarios, alias o licencias en el Workspace.
- Construir el servicio compartido de la Opción C.
- Enviar correo a listas de personas reales.

---

## 8. Referencias

- Registro de la dependencia y Regla #0: [`CLAUDE.md`](../CLAUDE.md) → *Dependencia de
  Google Workspace del tenant Sistema de Eventos — 2026-10-09*.
- Manual operativo de la implementación actual: repositorio privado del Sistema de
  Eventos, `docs/FASE-26-RECUPERACION-PASSWORD.md`.

> Este documento se actualiza cuando cambie la realidad, no cuando cambie la intención.
> Si una sección deja de ser cierta, se corrige con la fecha de la comprobación.
