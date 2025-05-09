document.addEventListener("DOMContentLoaded", () => {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado.");
  }

  const auth = firebase.auth();
  const firestore = firebase.firestore();

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const registerButton = document.getElementById("registerButton");
  const loginButton = document.getElementById("loginButton");
  const roleInputs = document.getElementsByName("role");

  const getSelectedRole = () => {
    for (let input of roleInputs) {
      if (input.checked) return input.value;
    }
    return null;
  };

  // REGISTRO
  registerButton.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const selectedRole = getSelectedRole();

    if (!email || !password || !selectedRole) {
      alert("Completa todos los campos.");
      return;
    }

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const userId = userCredential.user.uid;

      await firestore
        .collection("usuarios")
        .doc(userId)
        .set({ rol: selectedRole });

      redirigirSegunRol(selectedRole);
    } catch (error) {
      console.error("❌ Error al registrar:", error);
      alert("Error al registrar: " + error.message);
    }
  });

  // INICIO DE SESIÓN
  loginButton.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      alert("Completa todos los campos.");
      return;
    }

    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
      const userId = userCredential.user.uid;

      const userDoc = await firestore.collection("usuarios").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const rol = userData.rol;
        redirigirSegunRol(rol);
      } else {
        alert("Usuario sin rol asignado.");
      }
    } catch (error) {
      console.error("❌ Error al iniciar sesión:", error);
      alert("Error al iniciar sesión: " + error.message);
    }
  });

  // Redirección según rol
  function redirigirSegunRol(rol) {
    if (rol === "monitor") {
      window.location.href = "crearSala.html";
    } else if (rol === "observer") {
      window.location.href = "ingreso-observador.html";
    } else {
      alert("Rol no reconocido.");
    }
  }
});
