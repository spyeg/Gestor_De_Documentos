(function () {
    //Conexión api gemini
    const GEMINI_KEY = "";//Introducir api key gemini
    const URL_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY;    //Conexión Supabase para RAG
    const SUPABASE_URL = "";//Introducir url supabase
    const SUPABASE_ANON_KEY = "";//Introducir clave anon supabase
    //Instrucción a gemini
    const SISTEMA = `Eres el asistente experto de la consultora energética Couce Consulting. 

Tus reglas de funcionamiento:
1. IDENTIDAD: Responde siempre como parte del equipo profesional de Couce Consulting.
2. CONTEXTO: Utiliza exclusivamente la información proporcionada para responder. Si el dato no está en el contexto, indica amablemente que como asistente de la consultora no dispones de esa información específica.
3. TONO Y ESTILO: 
   - Responde en español de forma profesional, directa y concisa.
   - No incluyas datos de contacto (teléfonos o emails) ni despedidas largas.
4. CIERRE: Finaliza siempre cada respuesta invitando al usuario a preguntar si necesita algo más o si tiene alguna otra duda (puedes variar la frase para que sea natural).`;

    //Límite de historial para no gastar tokens innecesarios
    const MAX_HISTORIAL = 10;
    //Límite máximo de caracteres por mensaje
    const MAX_CHARS = 500;

    let historial = [];

    const obtenerHora = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    //Renderizar básico (negrita, cursiva, listas, código)
    const renderMarkdown = (texto) => {
        return texto
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^[-•] (.+)/gm, '<li>$1</li>')
            .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
            .replace(/\n/g, '<br>');
    };

    //Sanitizar texto del usuario antes de mostrarlo (evitar XSS)
    const sanitizar = (texto) => {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    };

    //Generar embedding de la pregunta del usuario con Gemini (3072 dimensiones)
    const generarEmbedding = async (texto) => {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/gemini-embedding-001',
                    content: { parts: [{ text: texto }] }
                })
            }
        );
        const data = await res.json();
        if (!data.embedding) throw new Error('Error generando embedding');
        return data.embedding.values;
    };

    //Buscar documentos relevantes en Supabase según la pregunta
    const buscarContexto = async (embedding) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/buscar_documentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                query_embedding: `[${embedding.join(',')}]`,
                limite: 3
            })
        });
        if (!res.ok) throw new Error('Error buscando contexto en Supabase');
        const datos = await res.json();
        return datos.map(d => d.contenido).join('\n\n');
    };

    const initChat = () => {
        const launcher = document.getElementById('chat-launcher');
        const windowChat = document.getElementById('chat-window');
        const btnCerrar = document.getElementById('btn-cerrar');
        const btnEnviar = document.getElementById('btn-enviar');
        const inputEl = document.getElementById('chat-input');
        const mensajesEl = document.getElementById('chat-mensajes');
        const hBienvenida = document.getElementById('hora-bienvenida');
        //Elemento contador de caracteres
        const contadorEl = document.getElementById('char-contador');

        if (hBienvenida) hBienvenida.textContent = obtenerHora();
        if (!launcher || !windowChat) return;

        // Abrir / cerrar
        launcher.onclick = (e) => {
            e.preventDefault();
            const abierto = windowChat.classList.toggle('hidden');
            launcher.classList.toggle('chat-abierto', !abierto);
            if (!abierto) inputEl.focus();
        };
        //Btn-cerrar con área de click más grande (aplicado en CSS)
        btnCerrar.onclick = (e) => {
            e.preventDefault();
            windowChat.classList.add('hidden');
            launcher.classList.remove('chat-abierto');
        };

        //Auto-resize del textarea al escribir
        inputEl.addEventListener('input', () => {
            inputEl.style.height = 'auto';
            inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
            //Actualizar contador de caracteres
            const len = inputEl.value.length;
            if (contadorEl) {
                contadorEl.textContent = `${len}/${MAX_CHARS}`;
                contadorEl.classList.toggle('limite-cerca', len >= MAX_CHARS * 0.85);
                contadorEl.classList.toggle('limite-maximo', len >= MAX_CHARS);
            }
            btnEnviar.disabled = len > MAX_CHARS;
        });

        // Typing indicator
        const mostrarTyping = () => {
            const div = document.createElement('div');
            div.className = 'burbuja bot';
            div.id = 'typing-indicator';
            div.innerHTML = `<div><div class="burbuja-texto">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div></div>`;
            mensajesEl.appendChild(div);
            mensajesEl.scrollTop = mensajesEl.scrollHeight;
        };
        const ocultarTyping = () => {
            const el = document.getElementById('typing-indicator');
            if (el) el.remove();
        };

        // Burbuja bot con botón copiar y renderizado
        const agregarRespuestaBot = (texto) => {
            const div = document.createElement('div');
            div.className = 'burbuja bot';
            //Renderizar respuestas del bot
            div.innerHTML = `<div>
                <div class="burbuja-texto md-content">${renderMarkdown(texto)}</div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="burbuja-hora">${obtenerHora()}</div>
                    <button class="btn-copiar">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copiar
                    </button>
                </div>
            </div>`;
            div.querySelector('.btn-copiar').onclick = function () {
                navigator.clipboard.writeText(texto).then(() => {
                    this.textContent = '✓ Copiado';
                    setTimeout(() => {
                        this.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar`;
                    }, 2000);
                });
            };
            mensajesEl.appendChild(div);
            mensajesEl.scrollTop = mensajesEl.scrollHeight;
        };

        // Enviar mensaje con flujo RAG
        const enviar = async () => {
            const txt = inputEl.value.trim();
            if (!txt || txt.length > MAX_CHARS) return;

            const msgDiv = document.createElement('div');
            msgDiv.className = 'burbuja usuario';
            //Sanitizar input del usuario antes de mostrarlo
            msgDiv.innerHTML = `<div><div class="burbuja-texto">${sanitizar(txt)}</div><div class="burbuja-hora">${obtenerHora()}</div></div>`;
            mensajesEl.appendChild(msgDiv);

            //Resetear altura del textarea tras enviar
            inputEl.value = '';
            inputEl.style.height = 'auto';
            if (contadorEl) {
                contadorEl.textContent = `0/${MAX_CHARS}`;
                contadorEl.classList.remove('limite-cerca', 'limite-maximo');
            }
            mensajesEl.scrollTop = mensajesEl.scrollHeight;

            mostrarTyping();
            //Estado de carga en el botón enviar, bloquear input también
            btnEnviar.disabled = true;
            btnEnviar.classList.add('enviando');
            inputEl.disabled = true;
            inputEl.style.opacity = '0.5';

            try {
                //convertir pregunta en embedding
                const embedding = await generarEmbedding(txt);

                //buscar documentos relevantes en Supabase
                const contexto = await buscarContexto(embedding);

                //añadir al historial con contexto
                historial.push({
                    role: "user",
                    parts: [{ text: `Contexto relevante:\n${contexto}\n\nPregunta del usuario: ${txt}` }]
                });

                //Recortar historial para mantener solo los últimos mensajes
                if (historial.length > MAX_HISTORIAL) {
                    historial = historial.slice(historial.length - MAX_HISTORIAL);
                }

                //enviar a Gemini con el contexto
                const response = await fetch(URL_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: SISTEMA }] },
                        contents: historial
                    })
                });

                const data = await response.json();
                ocultarTyping();

                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    const respuesta = data.candidates[0].content.parts[0].text;
                    historial.push({ role: "model", parts: [{ text: respuesta }] });
                    agregarRespuestaBot(respuesta);
                } else {
                    const errorMsg = data.error?.message || "No se pudo obtener respuesta.";
                    agregarRespuestaBot(`⚠️ ${errorMsg}`);
                }
            } catch (error) {
                ocultarTyping();
                console.error("Error:", error);
                agregarRespuestaBot("❌ No se ha podido conectar con la IA.");
            } finally {
                //Restaurar botón enviar e input tras respuesta
                btnEnviar.disabled = false;
                btnEnviar.classList.remove('enviando');
                inputEl.disabled = false;
                inputEl.style.opacity = '1';
                inputEl.focus();
            }
        };

        if (btnEnviar) btnEnviar.onclick = enviar;
        if (inputEl) {
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                }
            };
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();