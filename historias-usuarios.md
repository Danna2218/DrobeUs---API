# Historias de usuario

| N.º | Historia de usuario | Endpoint y método | Resultado esperado |
|---|---|---|---|
| 1 | Como estudiante nuevo, quiero registrarme con nombre, correo y contraseña, para tener mi espacio personal. | POST /api/auth/registro | 201, usuario creado |
| 2 | Como estudiante, quiero iniciar sesión con mi correo, para ver lo que guardé. | POST /api/auth/login | 200, saludo con mi nombre |
| 3 | Como estudiante, quiero agregar una materia con profesor, aula y horario, para organizar mi semestre. | POST /api/materias | 201, materia creada |
| 4 | Como estudiante, quiero ver mis clases de hoy en orden, para saber a qué hora y en qué salón debo ir. | GET /api/materias/hoy | 200, clases ordenadas por hora |
| 5 | Como estudiante, quiero guardar un apunte en una materia, para tener mi material de estudio junto. | POST /api/apuntes | 201, apunte guardado |
| 6 | Como estudiante, quiero registrar una tarea o parcial con fecha de entrega, para no olvidar lo pendiente. | POST /api/tareas | 201, tarea registrada |
| 7 | Como estudiante, quiero ver mis entregas pendientes con los días que faltan, para priorizar. | GET /api/tareas/pendientes | 200, lista con días restantes |
| 8 | Como estudiante, quiero ver mi agenda de la semana, para saber qué semana viene pesada. | GET /api/agenda/semana | 200, 7 días con actividades |
| 9 | Como estudiante, quiero registrar una nota en una materia, para llevar mis calificaciones al día. | POST /api/notas | 201, nota registrada |
| 10 | Como estudiante, quiero ver mi promedio por materia y del periodo, para saber cómo voy. | GET /api/notas/promedio | 200, promedios calculados |