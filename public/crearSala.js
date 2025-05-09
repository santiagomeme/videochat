

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

