// observador.js
document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("roomId");
    let senderId = urlParams.get("senderId") || null;
    let nombre = urlParams.get("nombre") ? decodeURIComponent(urlParams.get("nombre")) : "";

    // Persistencia local para reconexión
    const savedId = localStorage.getItem("senderId");
    if (!senderId && savedId) senderId = savedId;
    if (!senderId) {
      senderId = `obs_${Math.random().toString(36).substring(2, 8)}`;
    }
    localStorage.setItem("senderId", senderId);

    const savedName = localStorage.getItem("observerName");
    if (!nombre && savedName) nombre = savedName;
    if (nombre) localStorage.setItem("observerName", nombre);
   // =====================================
    // FUNCIÓN: MOSTRAR MODAL DE ERROR
    // =====================================
    // Helpers
    function mostrarModal(mensaje) {
      const modal = document.getElementById("modalError");
      const mensajeTexto = document.getElementById("modalMensaje");
      const btnCerrar = document.getElementById("cerrarModal");

      if (!modal || !mensajeTexto || !btnCerrar) {
        alert(mensaje);
        window.location.href = "ingreso-observador.html";
        return;
      }

      mensajeTexto.textContent = mensaje;
      modal.style.display = "block";

      btnCerrar.onclick = () => {
        modal.style.display = "none";
        window.location.href = "ingreso-observador.html";
      };
    }
  
    // =====================================
    // VALIDAR ROOMID
    // =====================================
    if (!roomId) {
      mostrarModal("❌ No se especificó ningún ID de sala.");
      return;
    }

    const nombreSpan = document.getElementById("observerName");
    if (nombreSpan) nombreSpan.textContent = nombre || "Observador";

    const roomIdTextEl = document.getElementById("roomIdText");
    if (roomIdTextEl) roomIdTextEl.textContent = roomId;
    // =====================================
    // VERIFICAR SALA EN FIRESTORE
    // =====================================
    if (window.firebase && firebase.firestore) {
      try {
        const db = firebase.firestore();
        const doc = await db.collection("salas").doc(roomId).get();

        if (!doc.exists) {
          mostrarModal("Esta sala no existe.");
          return;
        }

        const data = doc.data();
        const estado = (data && data.estado) || "";
        if (!(estado.toLowerCase() === "activa" || estado.toLowerCase() === "activo")) {
          mostrarModal("⚠️ Esta sala ya no está activa.");
          return;
        }

        // Mostrar nombre del monitor
        const monitorText = document.getElementById("monitorName");
        if (monitorText) monitorText.textContent = data.monitor || "Desconocido";

        // Mostrar screenshot
        const screenshotImg = document.getElementById("monitorScreenshot");
        if (screenshotImg && data.screenshot) screenshotImg.src = data.screenshot;

      } catch (err) {
        console.error("❌ Error verificando la sala en Firestore:", err);
        mostrarModal("No se pudo verificar el estado de la sala.");
        return;
      }
    }// <-- cierre verificación Firestore
 // =====================================
    // ESTADO DE AUTENTICACIÓN
    // =====================================
    // Estado de autenticación
    if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged(user => {
        const estadoSesion = document.getElementById("estadoSesion");
        if (!estadoSesion) return;
        if (user) {
          const display = user.displayName || nombre || "Observador";
          estadoSesion.textContent = `✅ Autenticado como: ${display} (UID: ${user.uid})`;
          estadoSesion.style.color = "green";
          if (!nombre && display) {
            nombre = display;
            localStorage.setItem("observerName", nombre);
            if (nombreSpan) nombreSpan.textContent = nombre;
          }
        } else {
          estadoSesion.textContent = "❌ No autenticado. Es necesario iniciar sesión.";
          estadoSesion.style.color = "red";
        }
      });
    } // <-- cierre auth

    console.log("🔎 Observador listo:", { roomId, senderId, nombre });

    // =====================================
    // DEFINICIÓN DEL SOCKET (Faltaba esto)
    // =====================================
  socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

    socket.addEventListener("open", () => {
      console.log("✅ Conectado al servidor WebSocket");
      // Unirse automáticamente a la sala
      socket.send(JSON.stringify({
        type: "joinRoom",
        role: "observador",
        roomId,
        senderId,
        nombre
      }));
    });

    socket.addEventListener("close", () => {
      console.log("❌ Conexión cerrada con el servidor WebSocket");
    });

    socket.addEventListener("error", (err) => {
      console.error("⚠️ Error en WebSocket:", err);
    });

    
  // =====================
  // FUNCIONES CHAT
  // =====================//Variables del HTML 
  const chatForm = document.getElementById("chatForm"); 
  const chatInput = document.getElementById("chatInput");
   const chatList = document.getElementById("chatList"); // 👉 este es tu contenedor real 
   // Escuchar envío de mensajes 
   chatForm.addEventListener("submit", (e) => {
     e.preventDefault(); const mensaje = chatInput.value.trim();
      if (!mensaje) return; 
      
      if (socket.readyState !== WebSocket.OPEN)
         { alert("⚠️ No hay conexión con el servidor");
           return; } // Enviar mensaje al servidor vía WebSocket
          socket.send(JSON.stringify({
             type: "chat", 
             roomId,
             senderId, 
             nombre,
             mensaje }));
              // 👉 Mostrar el mensaje propio en el chat inmediatamente 
          addMessage(nombre, mensaje, true);
           chatInput.value = ""; // limpiar input
            }); 
           // Escuchar mensajes entrantes  
          socket.addEventListener("message", (event) => {
             const data = JSON.parse(event.data); 
            if (data.type === "chat") { // 👉 Mostrar mensajes de otros 
            if (data.senderId !== senderId) 
              { addMessage(data.nombre, data.mensaje, false);

               }
             }
           });
             // ===================================== 
             // // FUNCIÓN PARA RENDERIZAR BURBUJAS 
             // ===================================== 
             
             function addMessage(nombre, mensaje, esPropio = false){
               const li = document.createElement("li"); 
              li.classList.add("chat-msg"); 
              // 👉 Diferenciar con clases 
              if (esPropio){ 
                li.classList.add("propio"); //burbuja mía
               } else {
                 li.classList.add("ajeno"); // burbuja de otros 
               } 
               // Autor + texto 

              li.innerHTML = `
               <div class="autor">${nombre}</div>
               <div class="texto">${mensaje}</div>`;
               chatList.appendChild(li); 
               chatList.scrollTop = chatList.scrollHeight; 
               // scroll automático
                }

              
    })();
});
