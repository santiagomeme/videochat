document.addEventListener("DOMContentLoaded", () => {
  const socket = new WebSocket("wss://shrouded-star-apple.glitch.me");

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("roomId");
  const senderId = urlParams.get("senderId") || "observer_" + Math.floor(Math.random() * 1000);

  if (!roomId) {
    alert("❌ No se especificó ningún ID de sala.");
    return;
  }

  socket.addEventListener("open", () => {
    console.log("👁️ Observador conectado a WebSocket");

    const joinMsg = {
      type: "joinRoom",
      roomId: roomId,
      senderId: senderId,
    };

    socket.send(JSON.stringify(joinMsg));
    console.log("✅ Solicitud enviada para unirse a la sala:", joinMsg);
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("📩 Mensaje recibido:", data);

    if (data.type === "roomData") {
      // Actualiza el texto con el ID de la sala
      document.getElementById("roomIdText").textContent = roomId;

      // Mostrar imagen del monitor si está disponible
      if (data.screenshot) {
        const img = document.getElementById("monitorScreenshot");
        if (img) {
          img.src = data.screenshot;
        }
      }

      // Mostrar el nombre del monitor si se recibe
      if (data.monitor) {
        document.getElementById("monitorName").textContent = data.monitor;
      }
    }
  });

  socket.addEventListener("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });

  socket.addEventListener("close", () => {
    console.warn("🔌 Conexión cerrada");
  });
});
