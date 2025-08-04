let peerConnection;
const roomId = new URLSearchParams(window.location.search).get("roomId");
const senderId = new URLSearchParams(window.location.search).get("senderId");
const socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");



document.addEventListener("DOMContentLoaded", () => {
  const remoteVideo = document.getElementById("remoteVideo");

  socket.onopen = () => {
    console.log("👁️ Conectado como Observador");
    socket.send(JSON.stringify({
      type: "watcher",
      roomId,
      senderId
    }));
  };

  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("📩 Mensaje recibido:", message);

    switch (message.type) {
      case "offer":
        await handleOffer(message.offer, message.monitorId);
        break;

      case "candidate":
        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            console.log("➕ ICE candidate agregado");
          } catch (err) {
            console.warn("⚠️ Error al agregar ICE candidate:", err);
          }
        }
        break;
    }
  };

  async function handleOffer(offer, monitorId) {
    console.log("📩 Oferta recibida del monitor:", offer);

    if (peerConnection) {
      console.log("🔄 Cerrando conexión anterior");
      peerConnection.close();
    }
    const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};


    peerConnection = new RTCPeerConnection(servers);

    peerConnection.ontrack = event => {
      console.log("🎥 Recibiendo stream del monitor");
      document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
          roomId,
          senderId,
          targetId: monitorId
        }));
      }
    };

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.send(JSON.stringify({
        type: "answer",
        answer,
        roomId,
        senderId,
        targetId: monitorId
      }));
      console.log("✅ Enviada answer al monitor");
    } catch (err) {
      console.error("❌ Error al manejar offer:", err);
    }
    console.log("📩 Oferta recibida del monitor:", offer);

  }
});



// Al conectarse muestra cuantos hay
db.collection("salas").doc(roomId).update({
  observadores: firebase.firestore.FieldValue.increment(1)
});

// Al desconectarse (por si acaso)
window.addEventListener("beforeunload", () => {
  db.collection("salas").doc(roomId).update({
    observadores: firebase.firestore.FieldValue.increment(-1)
  });
});
