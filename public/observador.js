document.addEventListener("DOMContentLoaded", () => {
  // Crear conexión WebSocket
  const socket = new WebSocket("wss://shrouded-star-apple.glitch.me");

  // Obtener parámetros desde la URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("roomId");
  const senderId = urlParams.get("senderId") || `observer_${Math.floor(Math.random() * 1000)}`;

  // Validar si se proporcionó roomId
  if (!roomId) {
    alert("❌ No se especificó ningún ID de sala.");
    return;
  }

  // Cuando se abre la conexión
  socket.addEventListener("open", () => {
    console.log("👁️ Conectado al servidor WebSocket");

    const joinMsg = {
      type: "joinRoom",
      roomId: roomId,
      senderId: senderId,
    };

    socket.send(JSON.stringify(joinMsg));
    console.log("✅ Solicitud enviada para unirse a la sala:", joinMsg);
  });

  // Manejo de mensajes entrantes
  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📩 Mensaje recibido:", data);

      // Mostrar el ID de la sala
      const roomIdText = document.getElementById("roomIdText");
      if (roomIdText) {
        roomIdText.textContent = roomId;
      }

      // Mostrar el nombre del monitor si se recibe
      const monitorText = document.getElementById("monitorName");
      if (monitorText && data.senderId) {
        monitorText.textContent = data.senderId;
      }

      // Mostrar la captura de pantalla si existe
      if (data.screenshot) {
        const screenshotImg = document.getElementById("monitorScreenshot");
        if (screenshotImg) {
          screenshotImg.src = data.screenshot;
        }
      }

    } catch (err) {
      console.error("❌ Error al procesar mensaje:", err);
    }
  });

  // Cierre de conexión
  socket.addEventListener("close", () => {
    console.log("🔌 Conexión cerrada");
  });

  socket.addEventListener("error", (err) => {
    console.error("⚠️ Error de WebSocket:", err);
  });
});
