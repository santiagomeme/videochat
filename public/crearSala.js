

  document.getElementById("createRoom").addEventListener("click", () => {
    const monitor = document.getElementById("monitorName").value.trim();

    if (!monitor) {
      alert("Por favor ingresa tu nombre.");
      return;
    }

    // Generar ID aleatorio
    const roomId = Math.random().toString(36).substring(2, 10);

    // Crear sala en Firestore
    db.collection("salas").doc(roomId).set({
      monitor: monitor,
      estado: "activo",
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log("Sala creada correctamente en Firestore");

      // Mostrar la información
      document.getElementById("roomIdText").textContent = roomId;
      const shareLink = `https://myvideofree.web.app/observadores.html?roomId=${roomId}&senderId=observador123`;
      document.getElementById("shareLink").value = shareLink;

      document.getElementById("salaInfo").style.display = "block";

      // BOTÓN para ir a monitores con los datos en la URL
     const btnIr = document.createElement("button");
btnIr.textContent = "Ir a transmisión";
btnIr.className = "btn-dorado"; // ✅ Aplica estilo
btnIr.style.marginTop = "20px";
btnIr.onclick = () => {
  window.location.href = `monitores.html?roomId=${roomId}&monitor=${encodeURIComponent(monitor)}`;
};
document.getElementById("salaInfo").appendChild(btnIr);

    })
    .catch((error) => {
      console.error("Error al crear la sala:", error);
      alert("Ocurrió un error al crear la sala. Intenta nuevamente.");
    });
  });

//permitir guardar el ui del monitor en firestore para reconexiones en la misma sala
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    const sala = {
      monitor: nombreMonitor,
      estado: "activo",
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      uid: user.uid // ← Agrega el UID del monitor
    };

    db.collection("salas").doc(idGenerado).set(sala)
      .then(() => {
        console.log("✅ Sala creada con UID del monitor");
        window.location.href = `monitores.html?roomId=${idGenerado}&monitor=${nombreMonitor}`;
      });
  } else {
    alert("Debes iniciar sesión para crear una sala.");
  }
});
