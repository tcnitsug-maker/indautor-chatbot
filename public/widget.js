// =============================================
// WIDGET DEL CHATBOT - UTNEZA/INDARELÍN
// =============================================

(function() {
  'use strict';

  // Configuración
  const API_URL = window.CHATBOT_API_URL || 'https://indautor-chatbot-1.onrender.com';
  
  // Crear contenedor del widget
  const widgetHTML = `
    <div id="chatbot-widget" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 600px;
      max-height: 90vh;
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      transition: all 0.3s ease;
    ">
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 20px 20px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-weight: bold; font-size: 18px;">🎓 UTNEZA</div>
          <div style="font-size: 12px; opacity: 0.9;">Asistente Virtual</div>
        </div>
        <button id="chatbot-close" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">✕</button>
      </div>

      <!-- Mensajes -->
      <div id="chatbot-messages" style="
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f8f9fa;
      ">
        <div class="message bot" style="
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        ">
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 18px 18px 18px 4px;
            max-width: 80%;
          ">
            ¡Hola! 👋 Soy tu asistente virtual de UTNEZA. ¿En qué puedo ayudarte hoy?
          </div>
        </div>
      </div>

      <!-- Input -->
      <div style="
        padding: 15px;
        background: white;
        border-top: 1px solid #e9ecef;
        border-radius: 0 0 20px 20px;
      ">
        <div style="display: flex; gap: 10px;">
          <input 
            id="chatbot-input" 
            type="text" 
            placeholder="Escribe tu mensaje..."
            style="
              flex: 1;
              padding: 12px 16px;
              border: 2px solid #e9ecef;
              border-radius: 25px;
              font-size: 14px;
              outline: none;
            "
          />
          <button id="chatbot-send" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">➤</button>
        </div>
      </div>
    </div>

    <!-- Botón flotante -->
    <button id="chatbot-toggle" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 28px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    ">💬</button>
  `;

  // Insertar widget en el DOM
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.createElement('div');
    container.innerHTML = widgetHTML;
    document.body.appendChild(container);

    const widget = document.getElementById('chatbot-widget');
    const toggle = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    const messagesContainer = document.getElementById('chatbot-messages');

    // Estado inicial: oculto
    widget.style.display = 'none';

    // Toggle widget
    toggle.addEventListener('click', function() {
      const isVisible = widget.style.display !== 'none';
      widget.style.display = isVisible ? 'none' : 'flex';
      toggle.style.display = isVisible ? 'flex' : 'none';
      if (!isVisible) {
        input.focus();
      }
    });

    closeBtn.addEventListener('click', function() {
      widget.style.display = 'none';
      toggle.style.display = 'flex';
    });

    // Agregar mensaje al chat
    function addMessage(text, isBot = false, type = 'text', videoUrl = null) {
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        justify-content: ${isBot ? 'flex-start' : 'flex-end'};
      `;

      const bubble = document.createElement('div');
      bubble.style.cssText = `
        background: ${isBot ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'};
        color: ${isBot ? 'white' : '#212529'};
        padding: 12px 16px;
        border-radius: ${isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px'};
        max-width: 80%;
      `;

      // 🎥 MANEJO DE VIDEOS
      if (type === 'video' && videoUrl) {
        const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
        
        if (isYouTube) {
          // Extraer ID de YouTube
          let videoId = '';
          if (videoUrl.includes('embed/')) {
            videoId = videoUrl.split('embed/')[1].split('?')[0];
          } else if (videoUrl.includes('watch?v=')) {
            videoId = videoUrl.split('watch?v=')[1].split('&')[0];
          } else if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
          }

          bubble.innerHTML = `
            <div style="margin-bottom: 8px;">${text}</div>
            <iframe 
              width="100%" 
              height="200" 
              src="https://www.youtube.com/embed/${videoId}"
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              style="border-radius: 10px;"
            ></iframe>
          `;
        } else {
          // Video directo (MP4, etc)
          bubble.innerHTML = `
            <div style="margin-bottom: 8px;">${text}</div>
            <video 
              controls 
              style="width: 100%; border-radius: 10px;"
            >
              <source src="${videoUrl}" type="video/mp4">
              Tu navegador no soporta videos.
            </video>
          `;
        }
      } else {
        // Mensaje de texto normal
        bubble.textContent = text;
      }

      messageDiv.appendChild(bubble);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Enviar mensaje
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;

      // Agregar mensaje del usuario
      addMessage(message, false);
      input.value = '';

      // Mostrar indicador de escritura
      const typingDiv = document.createElement('div');
      typingDiv.id = 'typing-indicator';
      typingDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px;';
      typingDiv.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 16px;
          border-radius: 18px 18px 18px 4px;
        ">
          <span style="animation: blink 1.4s infinite;">●</span>
          <span style="animation: blink 1.4s infinite 0.2s;">●</span>
          <span style="animation: blink 1.4s infinite 0.4s;">●</span>
        </div>
      `;
      messagesContainer.appendChild(typingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        // Llamar al backend
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remover indicador
        typingDiv.remove();

        // Agregar respuesta del bot
        if (data.type === 'video' && data.video_url) {
          addMessage(data.reply || 'Aquí está el video', true, 'video', data.video_url);
        } else {
          addMessage(data.reply || 'Lo siento, no pude procesar tu mensaje.', true);
        }

      } catch (error) {
        console.error('Error:', error);
        typingDiv.remove();
        addMessage('Error de conexión. Por favor intenta de nuevo.', true);
      }
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });

    // Animación de parpadeo para el indicador
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  });

  console.log('✅ Widget del chatbot cargado correctamente');
})();

