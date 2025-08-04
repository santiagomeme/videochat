document.addEventListener("DOMContentLoaded", () => {
  const socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

  // Obtener elementos del DOM
  const btnCrear = document.getElementById("createRoom");
  const salaInfo = document.getElementById("salaInfo");
  const roomIdText = document.getElementById("roomIdText");
  const shareLink = document.getElementById("shareLink");
  const monitorNameInput = document.getElementById("monitorName");

  // Verificación de elementos
  if (!btnCrear || !salaInfo || !roomIdText || !shareLink || !monitorNameInput) {
    console.warn(
      "⚠️ Elementos no encontrados en el DOM. Asegúrate de tener los IDs: createRoom, salaInfo, roomIdText, shareLink, monitorName."
    );
    return;
  }

  // WebSocket conectado
  socket.addEventListener("open", () => {
    console.log("✅ WebSocket conectado.");
    btnCrear.disabled = false;
  });

  // WebSocket cerrado
  socket.addEventListener("close", () => {
    console.warn("⚠️ WebSocket se ha cerrado.");
  });

  // WebSocket error
  socket.addEventListener("error", (err) => {
    console.error("❌ Error en WebSocket:", err);
  });

  // Mensajes del servidor
  socket.addEventListener("message", (event) => {
    console.log("📩 Mensaje del servidor:", event.data);

    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "roomCreated" && msg.roomId) {
        console.log("✅ Sala creada en salas.js con ID:", msg.roomId);

        // Mostrar info de la sala
        salaInfo.style.display = "block";
        roomIdText.textContent = msg.roomId;

        // Crear URL para observador
        const observerURL = `${window.location.origin}/observadores.html?roomId=${msg.roomId}&senderId=observador123`;
        shareLink.value = observerURL;

        // 🔥 Guardar en Firestore
        if (firebase && firebase.firestore) {
          const db = firebase.firestore();

          db.collection("salas").doc(msg.roomId).set({
            monitor: monitorNameInput.value || "Desconocido",
            estado: "activo",
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
          })
          .then(() => {
            console.log("📦 Sala registrada en Firestore correctamente.");
          })
          .catch((error) => {
            console.error("❌ Error al guardar en Firestore:", error);
          });

        } else {
          console.warn("⚠️ Firebase no está disponible. No se guardó la sala.");
        }
      }

    } catch (e) {
      console.error("❌ Error al parsear mensaje del servidor:", e);
    }
  });

  // Evento para crear la sala
  btnCrear.addEventListener("click", () => {
    const monitor = monitorNameInput.value.trim();

    if (!monitor) {
      alert("Por favor, ingresa tu nombre como monitor.");
      return;
    }

    const payload = {
      type: "createRoom",
      monitor
    };

    socket.send(JSON.stringify(payload));
    btnCrear.disabled = true;
  });
});

