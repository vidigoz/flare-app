// netlify/functions/seed-nocturnos.mjs
// Publica flares nocturnos de Tecate a las 6pm con duración de 6 horas (360 min)
// Para probar en local: curl -X POST http://localhost:8888/.netlify/functions/seed-nocturnos

import { neon } from "@neondatabase/serverless";

// 6pm Tecate (PDT UTC-7) = 01:00 UTC del día siguiente
// "0 1 * * *" = 1:00 AM UTC = 6pm PDT
export const config = {
  schedule: "0 1 * * *"  // 6pm hora Tecate (PDT UTC-7 = 01:00 UTC)
};

const CATS = {
  food: { lbl: "Comida y Bebida", color: "#ff9500", icon: "🍽️" },
  sale: { lbl: "Ventas",          color: "#00c2ff", icon: "🏷️" },
};

const SEEDS_NOCTURNOS = [
  { lat:32.5730882, lng:-116.6272551, biz_name:"Bar Diana", title:"Bar Diana — el bar más histórico de Tecate", cat:"food", emoji:"🍺", description:"¡Pásate ahorita al bar más histórico de Tecate con cerveza helada desde $30 y ambiente íntimo para platicar! 🍺 📞 +52 665 654 0515", dur_min:360 },
  { lat:32.5737562, lng:-116.6269623, biz_name:"El Punto Tecate", title:"El Punto Tecate — cerveza fría y karaoke los sábados", cat:"food", emoji:"🍺", description:"¡Cerveza en tap bien fría ahorita mismo en el corazón de Tecate con karaoke prendido y buena vibra! 🍺", dur_min:360 },
  { lat:32.5729989, lng:-116.6272178, biz_name:"Bar La Hechicera", title:"Bar La Hechicera — coctelería y karaoke miérc a sáb", cat:"food", emoji:"🎤", description:"¡El karaoke ya está encendido y los drinks están listos ahorita para ti esta noche! 🎤 📞 +52 665 201 7394", dur_min:360 },
  { lat:32.572145, lng:-116.629385, biz_name:"TLALOC", title:"TLALOC — bar con buena comida y ambiente acogedor", cat:"food", emoji:"🍸", description:"¡Abrimos ahorita con alitas de mango habanero y drinks fríos para toda la noche! 🍸", dur_min:360 },
  { lat:32.5753625, lng:-116.6260713, biz_name:"Celostina Garden & Drinks", title:"Celostina Garden & Drinks — drinks bajo las estrellas", cat:"food", emoji:"🌟", description:"¡El jardín está prendido AHORITA con los mejores drinks de Tecate bajo las estrellas esta noche! 🌟", dur_min:360 },
  { lat:32.5601615, lng:-116.6406784, biz_name:"Barra 187", title:"Barra 187 — coctelería y reggaetón de miérc a dom", cat:"food", emoji:"🍹", description:"¡Los cócteles de Ivan están listos para ti ahorita mismo con reggaetón prendido y buena onda! 🍹", dur_min:360 },
  { lat:32.564535, lng:-116.6248343, biz_name:"La Troje Restaurant-Bar", title:"La Troje Restaurant-Bar — terraza y ambiente de noche", cat:"food", emoji:"🍻", description:"¡Terraza abierta ahorita con comida increíble y bebidas frías para esta noche! 🍻 📞 +52 665 107 6408", dur_min:360 },
  { lat:32.5685011, lng:-116.6243468, biz_name:"Kiu Bar", title:"Kiu Bar — música variada y smoking allowed hasta las 2am", cat:"food", emoji:"🎵", description:"¡Ven a relajarte ahorita con música variada y precios accesibles en un lugar donde puedes fumar adentro! 🎵", dur_min:360 },
  { lat:32.5657663, lng:-116.6474371, biz_name:"Los Elementos Bar", title:"Los Elementos Bar — karaoke jueves a domingo hasta las 2am", cat:"food", emoji:"🎤", description:"¡El karaoke está HOT ahorita mismo y el staff te recibe con todo para que cantes esta noche! 🎤 📞 +52 665 655 8490", dur_min:360 },
  { lat:32.5625203, lng:-116.6523025, biz_name:"Bar 8", title:"Bar 8 — música en vivo y vista exclusiva", cat:"food", emoji:"🎸", description:"¡Hay música en vivo ahorita y las vistas están increíbles así que ven antes de que no haya lugar! 🎸 📞 +52 665 121 1998", dur_min:360 },
  { lat:32.564497, lng:-116.6513552, biz_name:"Quinques", title:"Quinques — karaoke y el mejor lugar para cantar en Tecate", cat:"food", emoji:"🎙️", description:"¡El mejor karaoke de Tecate está sonando ahorita mismo así que pasa y agarra el micrófono! 🎙️", dur_min:360 },
  { lat:32.5650419, lng:-116.6505569, biz_name:"Rhyno Sport Bar", title:"Rhyno Sport Bar — deportes cerveza y buenas porciones", cat:"food", emoji:"🏈", description:"¡El partido está en pantalla grande y la cerveza bien fría AHORITA con alitas de porciones enormes! 🏈 📞 +52 665 107 5148", dur_min:360 },
  { lat:32.5680914, lng:-116.6460939, biz_name:"Vancouver Wings tecate", title:"Vancouver Wings Tecate — wings y deportes hasta medianoche", cat:"food", emoji:"🏒", description:"¡Wings crujientes y cerveza helada saliendo ahorita mismo a 5 minutos de la frontera con el partido en pantalla! 🍗 📞 +52 665 521 2913", dur_min:360 },
  { lat:32.5749224, lng:-116.6267922, biz_name:"Cosmos Brewing Co.", title:"Cosmos Brewing Co. — IPA artesanal hasta medianoche", cat:"food", emoji:"🍺", description:"¡La IPA Montaña Sagrada está servida y fría AHORITA en la mejor cervecería artesanal de Tecate! 🍺 📞 +52 665 111 7590", dur_min:360 },
  { lat:32.5685483, lng:-116.6454942, biz_name:"Lupita Perez Brewing Co.", title:"Lupita Perez Brewing Co. — cerveza artesanal hasta medianoche", cat:"food", emoji:"🍺", description:"¡Cerveza artesanal de calidad lista para ti ahorita así que ven antes de que se llene! 🍺 📞 +52 665 654 1222", dur_min:360 },
  { lat:32.5749224, lng:-116.6267922, biz_name:"Cosmos Brewing Co.", title:"Cosmos Brewing — ambiente íntimo cerca de la frontera", cat:"food", emoji:"🍺", description:"¡La IPA Montaña Sagrada está servida y fría AHORITA en la mejor cervecería artesanal de Tecate! 🍺 📞 +52 665 111 7590", dur_min:360 },
  { lat:32.5639995, lng:-116.6507392, biz_name:"La Bohemia Café Bar", title:"La Bohemia Café Bar — speakeasy coctelería y música en vivo", cat:"food", emoji:"🍸", description:"¡El mezcal espresso martini más rico de Tecate te está esperando AHORITA en el bar speakeasy del callejón! 🍸 📞 +52 665 656 4311", dur_min:360 },
  { lat:32.575015, lng:-116.6152464, biz_name:"Metal & Mezcal", title:"Metal & Mezcal — las mejores mezcalitas de Tecate", cat:"food", emoji:"🥃", description:"¡La mezcalita de jamaica más buena que vas a probar en tu vida está lista AHORITA para esta noche! 🥃", dur_min:360 },
  { lat:32.5748996, lng:-116.6156249, biz_name:"Metalurgica California", title:"Metalúrgica California — café de día bar de noche hasta medianoche", cat:"food", emoji:"🎭", description:"¡La coctelería de autor está prendida ahorita mismo con mixología increíble en ambiente industrial chic! 🎭", dur_min:360 },
  { lat:32.5732962, lng:-116.6284037, biz_name:"Vinoteca", title:"Vinoteca — vinos mariscos y música en vivo miérc a sáb", cat:"food", emoji:"🍷", description:"¡Copa de vino fría y mariscos frescos listos ahorita en la terraza con música en vivo esta noche! 🍷 📞 +52 665 521 3715", dur_min:360 },
  { lat:32.5717598, lng:-116.6507927, biz_name:"Ensamble 43", title:"Ensamble 43 — cena de autor hasta las 10pm viernes y sáb", cat:"food", emoji:"🌿", description:"¡La cocina de autor está lista ahorita y quedan pocas mesas así que reserva ya! 🌿 📞 +52 665 521 0655", dur_min:360 },
  { lat:32.5727, lng:-116.6398, biz_name:"TECATE Pairing Meats & Wine", title:"Tecate Pairing — carnes y vinos con música en vivo viernes y sáb", cat:"food", emoji:"🥩", description:"¡El tomahawk está al fuego y los vinos abiertos AHORITA con música en vivo y valet parking disponible! 🥩 📞 +52 665 201 2350", dur_min:360 },
  { lat:32.5695, lng:-116.6453, biz_name:"El Lugar de Nos Restaurante", title:"El Lugar de Nos — cena especial hasta las 9pm miérc a dom", cat:"food", emoji:"✨", description:"¡La cocina de autor está lista ahorita para tu cena especial con los mejores ingredientes frescos de la región! ✨ 📞 +52 665 521 3340", dur_min:360 },
  { lat:32.573, lng:-116.632, biz_name:"La Tencha", title:"La Tencha — mariachi lotería y ambiente animado hasta las 3am", cat:"food", emoji:"🎺", description:"¡El mariachi está SONANDO ahorita mismo con lotería y tequila bien servido así que ven ya! 🎺 📞 +52 665 110 4357", dur_min:360 },
  { lat:32.5721, lng:-116.6307, biz_name:"Restaurant Casa Valentina", title:"Casa Valentina — cena y brunch en ambiente cálido familiar", cat:"food", emoji:"🕯️", description:"¡La cocina está abierta ahorita con los mejores omelettes y cenas de Tecate en ambiente cálido! 🕯️ 📞 +52 665 655 9336", dur_min:360 },
  { lat:32.573, lng:-116.6457, biz_name:"Hells Grill", title:"Hell's Grill — tomahawk al carbón jueves a domingo desde las 2pm", cat:"food", emoji:"🔥", description:"¡El tomahawk al carbón está en las brasas AHORITA MISMO y la salsa macha está hecha hoy! 🔥 📞 +52 665 110 6475", dur_min:360 },
  { lat:32.5754, lng:-116.6259, biz_name:"Mesón TKT", title:"Mesón TKT — nachos y cerveza fría las 24 horas", cat:"food", emoji:"🌙", description:"¡Nachos de carne asada saliendo AHORITA a cualquier hora con cerveza bien fría las 24 horas! 🌙 📞 +52 665 654 5383", dur_min:360 },
  { lat:32.5744, lng:-116.6478, biz_name:"Monchi Monchi Tkt", title:"Monchi Monchi — burgers en brioche hasta las 11:30pm", cat:"food", emoji:"🍔", description:"¡Burgers en pan brioche saliendo del horno AHORITA para el antojo de la noche! 🍔", dur_min:360 },
  { lat:32.5757, lng:-116.6336, biz_name:"No Te Va A Gustar Tecate", title:"No Te Va a Gustar — hamburguesa al carbón los fines de semana", cat:"food", emoji:"🍔", description:"¡Las hamburguesas al carbón están en las brasas AHORITA con un sabor único que no encuentras en otro lado! 🍔 📞 +52 665 845 7462", dur_min:360 },
  { lat:32.573, lng:-116.6314, biz_name:"ROCKER hamburguesas", title:"ROCKER Hamburguesas — burgers artesanales y cerveza hasta las 9pm", cat:"food", emoji:"🎸", description:"¡Burgers artesanales saliendo ahorita con cerveza artesanal bien fría y música rockera prendida! 🎸 📞 +52 665 521 3141", dur_min:360 },
  { lat:32.5692, lng:-116.6313, biz_name:"OISHI SUSHI", title:"OISHI SUSHI — sushi fresco y té ilimitado hasta las 10pm", cat:"food", emoji:"🍱", description:"¡Sushi fresco haciéndose ahorita mismo con té de guayaba ilimitado y porciones enormes para esta noche! 🍱 📞 +52 665 100 3963", dur_min:360 },
  { lat:32.5727, lng:-116.633, biz_name:"Zen-Sushi", title:"Zen-Sushi — rolls enormes y teriyaki hasta las 9:30pm", cat:"food", emoji:"🍣", description:"¡Los rolls más grandes de Tecate están listos AHORITA con té ilimitado para una cena tranquila! 🍣 📞 +52 665 118 1869", dur_min:360 },
  { lat:32.5729, lng:-116.6313, biz_name:"Rennai Ramen", title:"Rennai Ramen — el mejor ramen de Baja California hasta las 10pm", cat:"food", emoji:"🍜", description:"¡El ramen más rico de Baja California está hirviendo AHORITA en solo 8 lugares así que ven ya! 🍜 📞 +52 665 141 3388", dur_min:360 },
  { lat:32.5742, lng:-116.6405, biz_name:"Dumpling House TECATE", title:"Dumpling House — cocina asiática hasta las 9pm todos los días", cat:"food", emoji:"🥟", description:"¡Los dumplings están saliendo de la vaporera AHORITA MISMO así que ven esta noche antes de las 9pm! 🥟 📞 +52 665 261 0984", dur_min:360 },
  { lat:32.5734, lng:-116.6281, biz_name:"Sopa Pho 2", title:"Sopa Pho 2 — la mejor pho de Tecate hasta las 10pm", cat:"food", emoji:"🍜", description:"¡La pho más auténtica de Tecate está burbujeando AHORITA a mitad de precio que en el lado americano! 🍜 📞 +52 665 100 2527", dur_min:360 },
  { lat:32.5659, lng:-116.6456, biz_name:"Restaurante Ispirazione", title:"Restaurante Ispirazione — pasta italiana de autor hasta las 9pm", cat:"food", emoji:"🍝", description:"¡La pasta de autor está haciéndose AHORITA en la mejor joya escondida de Tecate hasta las 9pm! 🍝 📞 +52 665 119 4374", dur_min:360 },
  { lat:32.5627485, lng:-116.6257966, biz_name:"BIRRIERIA NEGRO DURAZO TECATE", title:"Birrería Negro Durazo — birria pizza y nachos hasta las 8pm", cat:"food", emoji:"🍕", description:"¡La birria tatemada está lista AHORITA y la pizza de birria acaba de salir del horno! 🍕 📞 +52 665 142 2941", dur_min:360 },
  { lat:32.5718, lng:-116.6347, biz_name:"Mi Cocina Económica", title:"Mi Cocina Económica — cena económica y servicio hasta las 10pm", cat:"food", emoji:"🌙", description:"¡Cena caliente y sabrosa lista AHORITA a precio de fonda con guisos del día disponibles! 🌙", dur_min:360 },
  //{ lat:32.5706, lng:-116.641, biz_name:"El Sazón de los Abuelos", title:"El Sazón de los Abuelos — cena especial viernes y sábado con música", cat:"food", emoji:"🎵", description:"¡Hay música en vivo AHORITA y las tortillas están saliendo a mano para tu cena de esta noche! 🎵 📞 +52 665 122 6420", dur_min:360 },
  { lat:32.5695, lng:-116.6453, biz_name:"El Lugar de Nos Restaurante", title:"El Lugar de Nos — la mejor cita romántica de Tecate en la noche", cat:"food", emoji:"🌹", description:"¡La cocina de autor está lista ahorita para tu cena especial con los mejores ingredientes frescos de la región! ✨ 📞 +52 665 521 3340", dur_min:360 },
  { lat:32.5733, lng:-116.6284, biz_name:"Vinoteca", title:"Vinoteca — happy hour de vinos miércoles y jueves", cat:"food", emoji:"🍷", description:"¡Copa de vino fría y mariscos frescos listos ahorita en la terraza con música en vivo esta noche! 🍷 📞 +52 665 521 3715", dur_min:360 },
  { lat:32.564, lng:-116.6507, biz_name:"La Bohemia Café Bar", title:"La Bohemia — open mic y música en vivo algunos miércoles", cat:"food", emoji:"🎤", description:"¡El mezcal espresso martini más rico de Tecate te está esperando AHORITA en el bar speakeasy del callejón! 🍸 📞 +52 665 656 4311", dur_min:360 },
  { lat:32.5747, lng:-116.6304, biz_name:"Bocashi CoffeeHouse", title:"Bocashi CoffeeHouse — café de tarde hasta las 10pm", cat:"food", emoji:"☕", description:"¡El jardín está iluminado y el café de especialidad listo AHORITA para tu after dinner en ambiente tranquilo! ☕ 📞 +52 665 122 1698", dur_min:360 },
  { lat:32.5725, lng:-116.6261, biz_name:"Liebre Coffee Bar", title:"Liebre Coffee Bar — café nocturno y kombuchas hasta las 10pm", cat:"food", emoji:"🌙", description:"¡Café artesanal listo AHORITA en el ambiente más íntimo de Tecate sin el ruido de los bares! 🌙", dur_min:360 },
  { lat:32.5748996, lng:-116.6156249, biz_name:"Metalurgica California", title:"Metalúrgica California — los jueves de mixología hasta medianoche", cat:"food", emoji:"🔮", description:"¡La coctelería de autor está prendida ahorita mismo con mixología increíble en ambiente industrial chic! 🎭", dur_min:360 },
  { lat:32.575015, lng:-116.6152464, biz_name:"Metal & Mezcal", title:"Metal & Mezcal — mezcalitas de jamaica los fines de semana", cat:"food", emoji:"🥃", description:"¡La mezcalita de jamaica más buena que vas a probar en tu vida está lista AHORITA para esta noche! 🥃", dur_min:360 },
  { lat:32.5725, lng:-116.6244, biz_name:"La Cevichería Tecate", title:"La Cevichería Tecate — la noche de mariscos hasta las 10pm", cat:"food", emoji:"🦐", description:"¡El aguachile más rico de Tecate está listo AHORITA bien picoso con mariscos frescos de hoy! 🦐 📞 +52 665 122 6833", dur_min:360 },
  { lat:32.5668, lng:-116.6341, biz_name:"Hamburguesas Garage", title:"Hamburguesas Garage — la burger de medianoche de Tecate", cat:"food", emoji:"🌙", description:"¡La burger con papas naturales está saliendo AHORITA con carne natural recién hecha y solo efectivo! 🌙 📞 +52 665 654 7720", dur_min:360 },
  //{ lat:32.5726, lng:-116.6288, biz_name:"Xolo burgers", title:"Xolo Burgers — burgers y xolopapas hasta las 9pm", cat:"food", emoji:"🍟", description:"¡Las Xolopapas están saliendo AHORITA y las burgers también así que ven antes de las 9pm! 🍟 📞 +52 665 142 3576", dur_min:360 },
  { lat:32.5745321, lng:-116.6090681, biz_name:"TABOO MENS CLUB", title:"TABOO Mens Club — bar y billar abierto 24 horas", cat:"food", emoji:"🎱", description:"¡Abiertos las 24 horas con mesas de billar y barra completa AHORITA en la Zona Industrial de Tecate! 🎱 📞 +52 665 113 5002", dur_min:360 },
];

export default async () => {
  const start = Date.now();

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;

    for (const f of SEEDS_NOCTURNOS) {
      try {
        // Solo insertar si ese negocio NO tiene un flare activo en este momento
        const existing = await sql`
          SELECT id FROM flares
          WHERE biz_name  = ${f.biz_name}
            AND expires_at > NOW()
            AND hidden     = FALSE
          LIMIT 1
        `;

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        const id = "noc" + Date.now() + Math.random().toString(36).slice(2, 5);
        const expiresAt = new Date(Date.now() + f.dur_min * 60000).toISOString();
        const cat = CATS[f.cat] || CATS.food;

        await sql`
          INSERT INTO flares (
            id, lat, lng,
            title, emoji,
            cat, cat_lbl, cat_color, cat_icon,
            type, body_text, biz_name,
            expires_at, username, tier, flare_type
          ) VALUES (
            ${id},
            ${parseFloat(f.lat)},
            ${parseFloat(f.lng)},
            ${String(f.title).slice(0, 100)},
            ${f.emoji || cat.icon},
            ${f.cat},
            ${cat.lbl},
            ${cat.color},
            ${cat.icon},
            'text',
            ${f.description || null},
            ${f.biz_name || null},
            ${expiresAt}, 'flare_admin', 2, 'flama'
          )
        `;

        inserted++;

        // Pausa cada 10 inserts para no saturar Neon
        if (inserted % 10 === 0) {
          await new Promise(r => setTimeout(r, 50));
        }

      } catch (rowErr) {
        errors++;
        console.error(`Error en flare "${f.biz_name}":`, rowErr.message);
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = `Seed Nocturnos OK — ${inserted} insertados, ${skipped} ya activos, ${errors} errores — ${elapsed}s`;
    console.log(msg);

    return new Response(msg, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (err) {
    console.error("Seed Nocturnos fatal error:", err.message);
    return new Response("Seed Nocturnos error: " + err.message, { status: 500 });
  }
};
