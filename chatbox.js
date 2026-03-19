document.getElementById('hora-bienvenida').textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

function horaActual() {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function agregarMensaje(texto, tipo) {
    var mensajesEl = document.getElementById('chat-mensajes');
    var wrap = document.createElement('div');
    wrap.className = 'burbuja ' + tipo;
    wrap.innerHTML = '<div><div class="burbuja-texto">' + texto + '</div><div class="burbuja-hora">' + horaActual() + '</div></div>';
    mensajesEl.appendChild(wrap);
    mensajesEl.scrollTop = mensajesEl.scrollHeight;
}

function enviarMensaje() {
    var inputEl = document.getElementById('chat-input');
    var texto = inputEl.value.trim();
    if (!texto) return;
    agregarMensaje(texto, 'usuario');
    inputEl.value = '';
    inputEl.style.height = 'auto';
    // Aquí se conectará la IA próximamente
}

document.getElementById('chat-launcher').onclick = function () {
    document.getElementById('chat-window').classList.toggle('hidden');
};

document.getElementById('btn-cerrar').onclick = function (e) {
    e.stopPropagation();
    document.getElementById('chat-window').classList.add('hidden');
    return false;
};

document.getElementById('btn-enviar').onclick = enviarMensaje;

document.getElementById('chat-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensaje();
    }
});

document.getElementById('chat-input').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
});