(function () {
    // Conexion api gemini
    const API_KEY = "";//falta meter api key
    const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const obtenerHora = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const initChat = () => {
        const launcher = document.getElementById('chat-launcher');
        const windowChat = document.getElementById('chat-window');
        const btnCerrar = document.getElementById('btn-cerrar');
        const btnEnviar = document.getElementById('btn-enviar');
        const inputEl = document.getElementById('chat-input');
        const mensajesEl = document.getElementById('chat-mensajes');
        const hBienvenida = document.getElementById('hora-bienvenida');

        if (hBienvenida) hBienvenida.textContent = obtenerHora();
        if (!launcher || !windowChat) return;

        launcher.onclick = (e) => {
            e.preventDefault();
            windowChat.classList.toggle('hidden');
        };

        btnCerrar.onclick = (e) => {
            e.preventDefault();
            windowChat.classList.add('hidden');
        };

        // Función para que el bot agregue su "bocadillo"
        const agregarRespuestaBot = (texto) => {
            let msg = document.createElement('div');
            msg.className = 'burbuja bot';
            msg.innerHTML = `<div><div class="burbuja-texto">${texto}</div><div class="burbuja-hora">${obtenerHora()}</div></div>`;
            mensajesEl.appendChild(msg);
            mensajesEl.scrollTop = mensajesEl.scrollHeight;
        };

        const enviar = async () => {
            let txt = inputEl.value.trim();
            if (!txt) return;

            let msg = document.createElement('div');
            msg.className = 'burbuja usuario';
            msg.innerHTML = `<div><div class="burbuja-texto">${txt}</div><div class="burbuja-hora">${obtenerHora()}</div></div>`;
            mensajesEl.appendChild(msg);

            inputEl.value = '';
            mensajesEl.scrollTop = mensajesEl.scrollHeight;

            // Llamada de la api de gemini a cliente
            try {
                const response = await fetch(URL_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: txt }] }]
                    })
                });

                const data = await response.json();
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    const respuestaIA = data.candidates[0].content.parts[0].text;
                    agregarRespuestaBot(respuestaIA);
                }
            } catch (error) {
                console.error("Error:", error);
                agregarRespuestaBot("No se ha podido conectar con la IA");
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