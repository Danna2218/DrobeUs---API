const mammoth = require('mammoth');

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const IMAGENES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// La IA está obligada a responder con esta estructura
const HERRAMIENTA = {
  name: 'registrar_horario',
  description: 'Registra las materias y su horario semanal encontrados en el documento',
  input_schema: {
    type: 'object',
    properties: {
      materias: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            profesor: { type: 'string' },
            aula: { type: 'string' },
            horario: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dia: { type: 'string', enum: DIAS },
                  horaInicio: { type: 'string', description: 'HH:MM en formato de 24 horas' },
                  horaFin: { type: 'string', description: 'HH:MM en formato de 24 horas' }
                },
                required: ['dia', 'horaInicio', 'horaFin']
              }
            }
          },
          required: ['nombre', 'horario']
        }
      }
    },
    required: ['materias']
  }
};

const INSTRUCCIONES = `Extrae el horario semanal de clases del documento y regístralo con la herramienta registrar_horario.
Reglas:
- Una entrada por materia. Si la materia tiene clase varios días, agrega un elemento en horario por cada día.
- Los días van en minúscula y sin tilde (miercoles, sabado).
- Las horas van en formato de 24 horas HH:MM (por ejemplo 07:00 o 14:30).
- Incluye profesor y aula solo si aparecen en el documento.
- No inventes datos. Si el documento no contiene un horario de clases, devuelve la lista vacía.`;

const normalizarHora = (texto) => {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(texto || '').trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};

// Valida y limpia lo que devuelve la IA antes de enviarlo a la app
const limpiar = (materias) =>
  (Array.isArray(materias) ? materias : [])
    .map((m) => {
      const horario = (Array.isArray(m.horario) ? m.horario : [])
        .map((h) => {
          const dia = String(h.dia || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const horaInicio = normalizarHora(h.horaInicio);
          const horaFin = normalizarHora(h.horaFin);
          return DIAS.includes(dia) && horaInicio && horaFin ? { dia, horaInicio, horaFin } : null;
        })
        .filter(Boolean);

      return {
        nombre: String(m.nombre || '').trim(),
        profesor: m.profesor ? String(m.profesor).trim() : undefined,
        aula: m.aula ? String(m.aula).trim() : undefined,
        horario
      };
    })
    .filter((m) => m.nombre);

// Convierte el archivo recibido en lo que entiende la IA
const bloquesDe = async (archivo) => {
  const mime = archivo.mimetype;
  const nombre = (archivo.originalname || '').toLowerCase();

  if (IMAGENES.includes(mime)) {
    return [{ type: 'image', source: { type: 'base64', media_type: mime, data: archivo.buffer.toString('base64') } }];
  }
  if (mime === 'application/pdf') {
    return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: archivo.buffer.toString('base64') } }];
  }
  if (mime === DOCX || nombre.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer: archivo.buffer });
    return [{ type: 'text', text: `Contenido del documento Word:\n\n${value}` }];
  }
  if (mime.startsWith('text/') || nombre.endsWith('.txt') || nombre.endsWith('.csv')) {
    return [{ type: 'text', text: `Contenido del documento:\n\n${archivo.buffer.toString('utf8')}` }];
  }
  return null;
};

// Analizar un documento de horario (imagen, PDF, Word o texto)
exports.analizarHorario = async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        ok: false,
        mensaje: 'La carga automática de horario no está configurada en el servidor'
      });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'Adjunta el archivo del horario' });
    }
    if (IMAGENES.includes(req.file.mimetype) && req.file.size > 5 * 1024 * 1024) {
      return res.status(413).json({ ok: false, mensaje: 'La imagen supera los 5 MB' });
    }

    const bloques = await bloquesDe(req.file);
    if (!bloques) {
      return res.status(415).json({
        ok: false,
        mensaje: 'Formato no compatible. Usa una imagen, PDF, Word (.docx) o texto'
      });
    }

    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 4000,
        tools: [HERRAMIENTA],
        tool_choice: { type: 'tool', name: 'registrar_horario' },
        messages: [{ role: 'user', content: [...bloques, { type: 'text', text: INSTRUCCIONES }] }]
      })
    });

    if (!respuesta.ok) {
      console.error('Error de la API de IA:', respuesta.status, await respuesta.text());
      return res.status(502).json({
        ok: false,
        mensaje: 'No se pudo analizar el documento. Prueba con otra imagen o agrega las materias manualmente'
      });
    }

    const datos = await respuesta.json();
    const uso = (datos.content || []).find((b) => b.type === 'tool_use');
    const materias = limpiar(uso && uso.input && uso.input.materias);

    res.status(200).json({ ok: true, total: materias.length, materias });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};
