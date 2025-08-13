// observador.js (versión corregida)
// ================
// Encapsulado para evitar variables globales que choquen con observadorRTC.js u otros scripts.

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    // --- Parámetros de URL y state local ---
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("roomId");
    let senderId = urlParams.get("senderId") || null;
    let nombre = urlParams.get("nombre") ? decodeURIComponent(urlParams.get("nombre")) : "";

    // Recuperar senderId / nombre desde localStorage si existe (para reconexiones)
    const savedId = localStorage.getItem("senderId");
    if (!senderId && savedId) senderId = savedId;

    if (!senderId) {
      senderId = `obs_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("senderId", senderId);
    } else {
      localStorage.setItem("senderId", senderId);
    }

    const savedName = localStorage.getItem("observerName");
    if (!nombre && savedName) nombre = savedName;
    if (nombre) localStorage.setItem("observerName", nombre);

    // --- Helpers de UI / modal ---
    function fallbackAlertAndRedirect(msg) {
      alert(msg);
      window.location.href = "ingreso-observador.html";
    }

    function mostrarModal(mensaje) {
      const modal = document.getElementById("modalError");
      const mensajeTexto = document.getElementById("modalMensaje");
      const btnCerrar = document.getElementById("cerrarModal");

      if (!modal || !mensajeTexto || !btnCerrar) {
        // Si no existe modal en el HTML, fallback a alert + redirect
        fallbackAlertAndRedirect(mensaje);
        return;
      }

      mensajeTexto.textContent = mensaje;
      modal.style.display = "block";

      btnCerrar.onclick = () => {
        modal.style.display = "none";
        window.location.href = "ingreso-observador.html";
      };
    }

    // --- Validaciones iniciales ---
    if (!roomId) {
      mostrarModal("❌ No se especificó ningún ID de sala.");
      return;
    }

    // Mostrar nombre del observador en UI (si existe elemento)
    const nombreSpan = document.getElementById("observerName");
    if (nombreSpan) nombreSpan.textContent = nombre || "Observador";

    // Mostrar roomId en UI si hay elemento
    const roomIdTextEl = document.getElementById("roomIdText");
    if (roomIdTextEl) roomIdTextEl.textContent = roomId;

    // --- Verificar sala en Firestore ---
    if (window.firebase && firebase.firestore) {
      try {
        const db = firebase.firestore();
        const doc = await db.collection("salas").doc(roomId).get();

        if (!doc.exists) {
          mostrarModal("Esta sala no existe. Por favor verifica el ID.");
          return;
        }

        const data = doc.data();
        // Acepta tanto "activa" como "activo" por compatibilidad (tu código lo usa a veces distinto)
        const estado = (data && data.estado) || "";
        if (!(estado.toLowerCase() === "activa" || estado.toLowerCase() === "activo")) {
          mostrarModal("⚠️ Esta sala ya no está activa.");
          return;
        }

        // Poner datos del monitor en UI
        const monitorText = document.getElementById("monitorName");
        if (monitorText) monitorText.textContent = data.monitor || "Desconocido";

        // Poner screenshot si existe
        const screenshotImg = document.getElementById("monitorScreenshot");
        if (screenshotImg && data.screenshot) screenshotImg.src = data.screenshot;

      } catch (err) {
        console.error("❌ Error verificando la sala en Firestore:", err);
        mostrarModal("❌ No se pudo verificar el estado de la sala (error interno).");
        return;
      }
    } else {
      console.warn("⚠️ Firebase/Firestore no disponible en esta página.");
      // opcionalmente permitir continuar sin Firestore
    }

    // --- No abrimos WebSocket aquí (observadorRTC.js debe manejarlo).
    // Observador.js solo gestiona UI, validación y almacenamiento local para reconexión.

    // Mostrar estado de autenticación en la UI si existe #estadoSesion
    if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged(user => {
        const estadoSesion = document.getElementById("estadoSesion");
        if (!estadoSesion) return;
        if (user) {
          const display = user.displayName || nombre || "Observador";
          estadoSesion.textContent = `✅ Autenticado como: ${display} (UID: ${user.uid})`;
          estadoSesion.style.color = "green";
          // si aún no hay nombre, puedes preferir usar displayName:
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
    }

    // --- Log para debugging ---
    console.log("🔎 Observador listo:", { roomId, senderId, nombre });

    // FIN del flujo principal
  })();
});
