# Supervisión de tareas y creación de marcas

Los permisos individuales se combinan con el rol base de `team_members`. Lorena conserva su rol `community_manager`; la migración `20260930020001_lorena_tareas_marcas.sql` habilita `tareas.ver_equipo`, `tareas.puede_asignar` y `marcas.puede_crear`, y excluye el ID de Pedro mediante `tareas.excluir_miembros`. No concede acceso a administración, finanzas ni configuración.

`lib/tareas/access.ts` define lectura, asignación y edición por separado. Las tareas pertenecen al responsable (`team_member_id`), no a quien las creó: una tarea que Pedro asignó a otro miembro sí pertenece al equipo; una tarea asignada a Pedro se excluye. Las tareas sin responsable tampoco se muestran a supervisores. Los miembros sin delegación conservan la vista personal. La supervisión no habilita completar, eliminar ni modificar tareas de terceros; Lorena puede modificar las propias y las que ella asignó a miembros permitidos.

El alcance se aplica antes de serializar y limitar resultados en tablero, archivo, Gantt/calendario, dashboard y API de tareas. Los selectores de asignación excluyen los responsables restringidos. Las acciones vuelven a verificar acceso por ID, incluidas fechas y cronómetro.

La tabla `tareas` tiene RLS de lectura para la sesión autenticada; `puede_leer_tarea` aplica el mismo alcance a consultas directas y Realtime. Las escrituras pasan por las acciones/API del servidor. Sin una identidad activa del equipo se rechaza el acceso. La creación de marcas se comprueba en servidor, además de mostrar el botón en el sidebar/dashboard.

Validación: `lib/tareas/access.test.ts` cubre exclusiones, identidad inválida, lectura frente a edición, asignación y permisos de marcas independientes. La migración se probó en una transacción con rollback bajo roles `authenticated` y `anon`, usando las identidades de Lorena, Pedro y un miembro ordinario; después se aplicó y se repitieron las comprobaciones sin modificar tareas. El renderizado de los componentes reales se verificó con datos ficticios y acciones de escritura sustituidas.
