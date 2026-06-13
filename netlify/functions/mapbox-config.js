// netlify/functions/mapbox-config.js
// GET /api/mapbox-config — expone el token público de Mapbox
// El token es público por diseño (restringido por URL en el dashboard de Mapbox)

export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      token: process.env.MAPBOX_TOKEN || null,
    }),
  };
};
