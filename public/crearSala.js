document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("createRoom").addEventListener("click", async () => {
    const monitor = document.getElementById("monitorName").value.trim();

    if (!monitor) {
      alert("Por favor ingresa tu nombre.");
      return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
      alert("Debes iniciar sesión para crear una sala.");
      return;
    }

    // ID aleatorio para la sala
    const roomId = Math.random().toString(36).substring(2, 10);

    // Datos de la sala
    const salaData = {
      monitor: monitor,
      uid: user.uid, // guardar quién la creó
      estado: "activo",
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("salas").doc(roomId).set(salaData);
      console.log("✅ Sala creada correctamente");

      // Mostrar info de la sala
      document.getElementById("roomIdText").textContent = roomId;
      const shareLink = `https://myvideofree.web.app/observadores.html?roomId=${roomId}&senderId=observador123`;
      document.getElementById("shareLink").value = shareLink;
      document.getElementById("salaInfo").style.display = "block";

      // Botón para ir a la transmisión
      const btnIr = document.createElement("button");
      btnIr.textContent = "Ir a transmisión";
      btnIr.className = "btn-dorado";
      btnIr.style.marginTop = "20px";
      btnIr.onclick = () => {
        window.location.href = `monitores.html?roomId=${roomId}&monitor=${encodeURIComponent(monitor)}`;
      };
      document.getElementById("salaInfo").appendChild(btnIr);
    } catch (error) {
      console.error("❌ Error al crear la sala:", error);
      alert("Ocurrió un error al crear la sala.");
    }
  });
});
