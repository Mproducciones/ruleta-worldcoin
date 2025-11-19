import fetch from "node-fetch";

// Exportamos la función para que Vercel la reconozca como una función sin servidor.
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: "Método no permitido. Solo se acepta POST." });
    }

    try {
        const { proof, nullifier_hash, merkle_root, signal } = req.body;

        // Llamada a la API de Worldcoin usando la versión v2
        const response = await fetch("https://developer.worldcoin.org/api/v2/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                app_id: "app_d1ea58fce8cb903e9be8b8dbf34da3a2", // ID de tu app de Worldcoin
                action: "login",
                signal: signal || "default-signal",
                proof,
                nullifier_hash,
                merkle_root
            }),
        });

        const data = await response.json();
        console.log("🔎 Respuesta de Worldcoin:", data);

        if (data.success) {
            res.status(200).json({ ok: true, data });
        } else {
            res.status(400).json({ ok: false, error: data });
        }
    } catch (err) {
        console.error("❌ Error en el servidor:", err);
        res.status(500).json({ ok: false, message: "Error interno del servidor" });
    }
}