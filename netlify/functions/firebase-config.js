// netlify/functions/firebase-config.js
// GET /api/firebase-config — devuelve la config pública de Firebase
// El apiKey de Firebase es público por diseño (identifica el proyecto, no autentica)
// pero lo mantenemos fuera del repo para pasar el scanner de Netlify.

export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      apiKey:            process.env.FIREBASE_API_KEY,
      authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
      projectId:         process.env.FIREBASE_PROJECT_ID,
      appId:             process.env.FIREBASE_APP_ID,
    }),
  };
};
