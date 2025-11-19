const express = require('express');
const cors = require('cors');
const { verify } = require('@worldcoin/idkit-core');

const app = express();
const port = 3001; // Elige un puerto diferente al de tu frontend (5173)

// Middlewares
app.use(cors({ origin: 'http://localhost:5173' })); // Permite la comunicación con tu frontend
app.use(express.json());

// **IMPORTANTE**: Reemplaza estos valores con los de tu Worldcoin Developer Portal.
// Puedes encontrarlos en la sección "Claves API" de tu aplicación en el portal.
const APP_ID = 'app_staging_...'; // Tu app_id
const ACTION_ID = 'verificacion_juego'; // La misma acción que usas en el frontend

// Este es el endpoint que tu frontend llamará para verificar.
app.post('/api/verify', async (req, res) => {
  try {
    const proof = req.body;
    console.log("Verificando la prueba:", proof);

    // Usa la función 'verify' de la librería de Worldcoin.
    const result = await verify(proof, APP_ID, ACTION_ID);

    if (result.success) {
      console.log("La prueba fue verificada con éxito.");
      res.status(200).json({ success: true, message: "Verificación exitosa" });
    } else {
      console.log("Fallo en la verificación:", result.error);
      res.status(400).json({ success: false, message: "Fallo en la verificación", error: result.error });
    }
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor de verificación corriendo en http://localhost:${port}`);
});