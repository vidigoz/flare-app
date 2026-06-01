// netlify/functions/seed-scheduled.mjs
// Carga automáticamente los flares semilla de Tecate cada 4 horas
// Para probar en local: curl -X POST http://localhost:8888/.netlify/functions/seed-scheduled

import { neon } from "@neondatabase/serverless";

// Horario: cada 4 horas (formato cron UTC)
// 0 */4 * * * = a las 0:00, 4:00, 8:00, 12:00, 16:00, 20:00 UTC
// Que equivale a: 8pm, 12am, 4am, 8am, 12pm, 4pm hora Tecate (PDT UTC-7)
export const config = {
  //schedule: "0 */4 * * *"
  schedule: "0 15,22 * * *"

};

const CATS = {
  food: { lbl: "Comida y Bebida", color: "#ff9500", icon: "🍽️" },
  sale: { lbl: "Ventas",          color: "#00c2ff", icon: "🏷️" },
};

const SEEDS = [
  { lat:32.5717, lng:-116.6347, biz_name:"La Taquería Tacos n Beer", title:"Tacos al pastor y adobada — abiertos desde las 8am", cat:"food", emoji:"🌮", description:"Ricos tacos de adobada y pastor y cabeza desde las 8am; visítanos o llama al +52 665 521 5166.", dur_min:360},
  { lat:32.5713, lng:-116.6425, biz_name:"Tacos El Güero", title:"Tacos El Güero — birria y adobada desde las 2pm", cat:"food", emoji:"🌮", description:"Ricos tacos de adobada y asada y burritos gigantes hechos a mano; visítanos desde las 2pm.", dur_min:360},
  { lat:32.5726, lng:-116.6366, biz_name:"Taquería La Güerita", title:"Tortillas hechas a mano y tacos toda la noche", cat:"food", emoji:"🌮", description:"Tacos de adobada y asada y birria con tortillas de maíz y harina; visítanos o llama al +52 665 654 1777.", dur_min:360},
  { lat:32.5749, lng:-116.6269, biz_name:"Taquería Los Panchos", title:"Tacos del trompo a cuadra y media de la frontera", cat:"food", emoji:"🌮", description:"Tacos del trompo con tortillas artesanales hechas al momento; visítanos cerca de la frontera o llama al +52 665 799 5332.", dur_min:360},
  { lat:32.5724, lng:-116.6257, biz_name:"Taquería Los Amigos", title:"Burritos de carne asada y tortillas de harina frescas", cat:"food", emoji:"🌮", description:"Burritos de carne asada con frijoles y aguacate en tortilla de harina fresca; visítanos o llama al +52 665 521 3851.", dur_min:360},
  { lat:32.5675, lng:-116.6258, biz_name:"Taquería Los Amigos 2", title:"Birria disponible viernes a domingo de 10am a 3pm", cat:"food", emoji:"🌮", description:"Birria y carne asada y tripa y cabeza de viernes a domingo; visítanos o llama al +52 665 521 3098.", dur_min:3600},
  { lat:32.5752, lng:-116.6113, biz_name:"Tacos Mis Tíos", title:"Carne asada y tortillas artesanales hasta las 11:30pm", cat:"food", emoji:"🌮", description:"Carne asada con tortillas artesanales y sabor casero; visítanos en Morelos o llama al +52 665 521 1044.", dur_min:360},
  { lat:32.5647, lng:-116.6258, biz_name:"Tacos El Paisa", title:"Tacos del trompo a $26 pesos con tortilla hecha a mano", cat:"food", emoji:"🌮", description:"Tacos del trompo con tortilla hecha a mano y burritos y tortas; visítanos o llama al +52 665 391 7561.", dur_min:360},
  { lat:32.5738, lng:-116.6366, biz_name:"Taquería El Pueblita", title:"Quesa birria con consomé y tortillas recién hechas", cat:"food", emoji:"🌮", description:"Quesabirria con consomé y tortillas recién hechas; visítanos temprano antes de que se acabe.", dur_min:360},
  { lat:32.5659, lng:-116.6311, biz_name:"Tacos el Amigo", title:"Abiertos los 7 días hasta medianoche para tu antojo", cat:"food", emoji:"🌮", description:"Tacos de adobada y asada y antojitos todos los días hasta medianoche; visítanos con la familia.", dur_min:360},
  { lat:32.574, lng:-116.624, biz_name:"Birria de Res El Pelón", title:"Birria de res desde las 7:30am — llega temprano", cat:"food", emoji:"🍲", description:"Birria de res y tacos y caldo y consomé desde las 7:30am; llega temprano y prueba el sabor de Tecate.", dur_min:360},
  { lat:32.5677, lng:-116.6483, biz_name:"Birrería El Compita", title:"La birria más generosa de Tecate — porciones que llenan", cat:"food", emoji:"🍲", description:"Quesabirria y tacos y caldo de birria bien servido desde las 7:30am; visítanos o llama al +52 665 122 6042.", dur_min:360},
  { lat:32.5725, lng:-116.6244, biz_name:"La Cevichería Tecate", title:"Aguachile ceviche y tacos de mariscos en el centro", cat:"food", emoji:"🦐", description:"Aguachile y ceviche de camarón y tacos de mariscos frescos en el centro; visítanos o llama al +52 665 122 6833.", dur_min:360},
  { lat:32.574, lng:-116.6417, biz_name:"Mariscos La Tostadota", title:"Campechanas estilo Ensenada y mariscos frescos", cat:"food", emoji:"🦑", description:"Campechanas estilo Ensenada y tostadas de atún y mariscos frescos; visítanos o llama al +52 665 122 6746.", dur_min:360},
  { lat:32.5752, lng:-116.6263, biz_name:"Mariscos Sonora Querida", title:"Filete relleno de camarón y ceviche fresco todos los días", cat:"food", emoji:"🐟", description:"Filete relleno de camarón y tacos de pescado y ceviche fresco todos los días; visítanos o llama al +52 665 100 2972.", dur_min:360},
  { lat:32.5647, lng:-116.6268, biz_name:"Mariscos El Pulpito", title:"Tacos de salmón pulpo picante y camarón fresco", cat:"food", emoji:"🦑", description:"Tacos de salmón y pulpo picante y camarón y ostiones frescos; visítanos de miércoles a domingo o llama al +52 665 122 2836.", dur_min:360},
  { lat:32.5635, lng:-116.6413, biz_name:"Mariscos Sonora Querida Encinos", title:"Los mariscos más económicos de Tecate desde las 9am", cat:"food", emoji:"🐟", description:"Tostadas de atún azul y ceviche y tacos de pescado frescos desde las 9am; visítanos o llama al +52 665 113 5955.", dur_min:360},
  { lat:32.5707, lng:-116.6117, biz_name:"Mariscos El Bolo", title:"Enchiladas de camarón a $85 pesos — las mejores de Tecate", cat:"food", emoji:"🦐", description:"Enchiladas de camarón y mariscos frescos en ambiente familiar; visítanos y come rico en Tecate.", dur_min:360},
  { lat:32.5706, lng:-116.641, biz_name:"El Sazón de los Abuelos", title:"Barbacoa y tortillas hechas a mano a la vista", cat:"food", emoji:"🍳", description:"Barbacoa y costillas en chile verde y tortillas hechas a mano desde las 8:30am; visítanos o llama al +52 665 122 6420.", dur_min:360},
  { lat:32.5695, lng:-116.6453, biz_name:"El Lugar de Nos Restaurante", title:"Cocina de autor con ingredientes frescos — miérc a dom", cat:"food", emoji:"🍽️", description:"Cocina de autor con mariscos y carnes y opciones vegetarianas; reserva tu mesa o llama al +52 665 521 3340.", dur_min:360},
  { lat:32.5715, lng:-116.642, biz_name:"El Don de Comer", title:"Desayunos abundantes y buen café desde las 8:30am", cat:"food", emoji:"🍳", description:"Desayunos abundantes y omelettes y buen café desde las 8:30am; visítanos o llama al +52 665 654 5005.", dur_min:360},
  { lat:32.5718, lng:-116.6347, biz_name:"Mi Cocina Económica", title:"Buffet de cocina mexicana a precio accesible", cat:"food", emoji:"🍽️", description:"Buffet de comida mexicana con chilaquiles y chicharrón y arroz y frijoles; visítanos o llama al +52 663 196 9366.", dur_min:360},
  { lat:32.5754, lng:-116.6259, biz_name:"Mesón TKT", title:"Nachos de carne asada 24 horas junto a la frontera", cat:"food", emoji:"🍽️", description:"Nachos de carne asada y steak ranchero y comida 24 horas junto a la frontera; visítanos o llama al +52 665 654 5383.", dur_min:360},
  { lat:32.566, lng:-116.6412, biz_name:"La Fonda de Simón", title:"Cocina mexicana tradicional con buenas porciones", cat:"food", emoji:"🍽️", description:"Cocina mexicana tradicional con sabor casero y buenas porciones; visítanos o llama al +52 665 521 3075.", dur_min:360},
  { lat:32.573, lng:-116.632, biz_name:"La Tencha", title:"Molcajete mariachi y lotería — abrimos a las 2pm", cat:"food", emoji:"🍻", description:"Molcajete y nachos y drinks con tequila en ambiente de mariachi y lotería; visítanos o llama al +52 665 110 4357.", dur_min:360},
  { lat:32.5669, lng:-116.5852, biz_name:"La Fonda", title:"Comida casera a $50 el taco — zona oriente", cat:"food", emoji:"🍽️", description:"Cocina casera bien sazonada con tacos y comida mexicana de lunes a viernes; visítanos en zona oriente.", dur_min:360},
  { lat:32.5719, lng:-116.6291, biz_name:"Jardín Cerveza Tecate", title:"Cerveza de cortesía en el jardín de la fábrica Tecate", cat:"food", emoji:"🍺", description:"Cerveza Tecate y Original Light y Heineken en terraza al aire libre; visítanos en el jardín de la fábrica.", dur_min:360},
  { lat:32.5749, lng:-116.6268, biz_name:"Cosmos Brewing Co.", title:"Cerveza artesanal local — IPA Montaña Sagrada", cat:"food", emoji:"🍺", description:"Cerveza artesanal local con IPA Montaña Sagrada y buena atención; visítanos o llama al +52 665 111 7590.", dur_min:360},
  { lat:32.564, lng:-116.6507, biz_name:"La Bohemia Café Bar", title:"Bar speakeasy con coctelería y música en vivo", cat:"food", emoji:"🍸", description:"Coctelería y mezcal y espresso martini y cerveza artesanal en ambiente speakeasy; visítanos o llama al +52 665 656 4311.", dur_min:360},
  { lat:32.5733, lng:-116.6284, biz_name:"Vinoteca", title:"Carta de vinos y mariscos en terraza — miérc a dom", cat:"food", emoji:"🍷", description:"Vinos y mariscos frescos y terraza tranquila de miércoles a domingo; visítanos o llama al +52 665 521 3715.", dur_min:360},
  { lat:32.5747, lng:-116.6304, biz_name:"Bocashi CoffeeHouse", title:"Café de especialidad en jardín tranquilo — desde 9am", cat:"food", emoji:"☕", description:"Café de especialidad y lattes y smoothies en jardín tranquilo; visítanos desde las 9am o llama al +52 665 122 1698.", dur_min:360},
  { lat:32.5725, lng:-116.6261, biz_name:"Liebre Coffee Bar", title:"Café artesanal kombuchas y buena vibra pet friendly", cat:"food", emoji:"☕", description:"Café artesanal y kombuchas y bebidas de autor en ambiente pet friendly; visítanos de martes a domingo.", dur_min:360},
  { lat:32.5728, lng:-116.6269, biz_name:"Casa París", title:"Croissants frescos y café estilo francés junto a la plaza", cat:"food", emoji:"☕", description:"Croissants y macarrones y café estilo francés junto a la plaza; visítanos o llama al +52 665 654 3833.", dur_min:360},
  { lat:32.5722, lng:-116.6273, biz_name:"Acento Tecate Coffee Roasters", title:"Café de origen mexicano con terraza sombreada", cat:"food", emoji:"☕", description:"Café mexicano de Oaxaca y Veracruz y Chiapas y Guerrero con pan y galletas; visítanos o llama al +52 665 521 4462.", dur_min:360},
  { lat:32.5727, lng:-116.6302, biz_name:"Corteza", title:"Chilaquiles café de especialidad y pan fresco desde 7am", cat:"food", emoji:"☕", description:"Chilaquiles y omelettes y café de especialidad y pan recién horneado desde las 7am; visítanos o llama al +52 665 654 1515.", dur_min:360},
  { lat:32.574, lng:-116.6239, biz_name:"El Mejor Pan de Tecate", title:"El Mejor Pan de Tecate — abierto 24 horas los 7 días", cat:"food", emoji:"🥐", description:"Pan dulce fresco y café las 24 horas en la panadería más famosa de Tecate; visítanos o llama al +52 665 654 0040.", dur_min:360},
  { lat:32.5684, lng:-116.6231, biz_name:"Panadería Reina Victoria", title:"Pan recién horneado con DJ en vivo desde las 6am", cat:"food", emoji:"🥐", description:"Pan recién horneado y pasteles y variedad de panes desde las 6am; visítanos o llama al +52 665 150 3671.", dur_min:360},
  { lat:32.5719, lng:-116.6413, biz_name:"Panadería El Buen Pan", title:"Pan dulce fresco en vitrinas sanitarias desde las 6am", cat:"food", emoji:"🥐", description:"Pan dulce fresco y cafetería interior y desayuno desde las 6am; visítanos o llama al +52 665 654 0582.", dur_min:360},
  { lat:32.5578, lng:-116.6327, biz_name:"Panadería El Buen Pan de Tecate", title:"Pan artesanal con café de cortesía con tu compra", cat:"food", emoji:"🥐", description:"Pan artesanal y baguettes y ciabattas y pan dulce con café de cortesía; visítanos o llama al +52 665 521 2218.", dur_min:360},
  { lat:32.5522, lng:-116.6447, biz_name:"Panadería Lucy's", title:"Pan artesanal fresquísimo desde las 5am — joya del sur", cat:"food", emoji:"🥐", description:"Pan artesanal fresco y tamales en hoja de plátano y panes únicos desde las 5am; visítanos o llama al +52 665 134 8933.", dur_min:360},
  { lat:32.5568, lng:-116.6205, biz_name:"El Mejor Pan de Tecate Morelos", title:"Sucursal El Mejor Pan de Tecate — menos cola que la principal", cat:"food", emoji:"🥐", description:"Pan fresco y variado de El Mejor Pan de Tecate en Morelos; visítanos desde las 7am.", dur_min:360},
  { lat:32.5702, lng:-116.656, biz_name:"Cielo de Ti Taller de Repostería", title:"Repostería artesanal — pasteles panes y postres", cat:"food", emoji:"🎂", description:"Pasteles y panes y postres artesanales por pedido o venta directa; visítanos o llama al +52 665 131 1550.", dur_min:360},
  { lat:32.5676, lng:-116.6097, biz_name:"The Best Bread of Tecate", title:"Pan dulce tradicional mexicano — zona oriente", cat:"food", emoji:"🥐", description:"Pan dulce tradicional mexicano en la zona oriente; visítanos desde las 7am o llama al +52 665 521 1311.", dur_min:360},
  { lat:32.5725, lng:-116.6257, biz_name:"Taquería Los Amigos", title:"Burrito de frijoles con panela — el clásico de la casa", cat:"food", emoji:"🌯", description:"Burritos de frijoles con panela y carne asada en tortillas frescas; visítanos o llama al +52 665 521 3851.", dur_min:360},
  { lat:32.5737, lng:-116.6366, biz_name:"Taquería El Pueblita", title:"Torta El Patrón de birria a $115 — señora tortillando", cat:"food", emoji:"🥙", description:"Torta de birria El Patrón con consomé y tortillas hechas al momento; visítanos temprano.", dur_min:360},
  { lat:32.5706, lng:-116.641, biz_name:"El Sazón de los Abuelos", title:"Tortillas de maíz y harina hechas a la vista hoy", cat:"food", emoji:"🫓", description:"Tortillas de maíz y harina hechas al momento para acompañar tu comida; visítanos o llama al +52 665 122 6420.", dur_min:360},
  { lat:32.5695, lng:-116.6453, biz_name:"El Lugar de Nos Restaurante", title:"Cena especial de autor — miércoles a domingo", cat:"food", emoji:"🌿", description:"Platillos creativos con mariscos y carnes de temporada y café de olla; reserva o llama al +52 665 521 3340.", dur_min:360},
  { lat:32.5729, lng:-116.6282, biz_name:"Casa Viva", title:"Pizza artesanal y cocina italiana desde el mediodía", cat:"food", emoji:"🍕", description:"Pizza artesanal y cocina italiana con ingredientes frescos; visítanos desde el mediodía o llama al +52 665 103 0493.", dur_min:360},
  { lat:32.5731, lng:-116.6286, biz_name:"Pizza Loca", title:"Pizza Loca — la mejor pizza artesanal de Tecate", cat:"food", emoji:"🍕", description:"Pizza artesanal con masa hecha a mano y mucho queso y toppings generosos; pide la mexicana o llama al +52 665 654 0201.", dur_min:360},
  { lat:32.5729, lng:-116.6379, biz_name:"MamaMia Pizza Suc. Tecate", title:"MamaMia Pizza — entrega a domicilio todos los días", cat:"food", emoji:"🍕", description:"Pizza con mucho queso y stuffed crust y entrega a domicilio todos los días; pide al +52 665 521 5101.", dur_min:360},
  { lat:32.5743, lng:-116.6346, biz_name:"Picante Wings House", title:"Alitas y boneless con salsas artesanales — martes a dom", cat:"food", emoji:"🍗", description:"Alitas y boneless con salsas caseras y juegos de mesa; visítanos de martes a domingo o llama al +52 665 121 0654.", dur_min:360},
  { lat:32.5678, lng:-116.6215, biz_name:"UFC Wings", title:"UFC Wings — alitas estilo americano martes a domingo", cat:"food", emoji:"🍗", description:"Alitas estilo americano con salsas deliciosas; llama con anticipación al +52 665 655 9120.", dur_min:360},
  { lat:32.5641, lng:-116.6506, biz_name:"El Ciclo", title:"El Ciclo — desayunos y tacos en ambiente acogedor", cat:"food", emoji:"🍳", description:"Chilaquiles con chipotle y cinnamon pancakes y jugos naturales para desayunar; visítanos o llama al +52 665 150 3047.", dur_min:360},
  { lat:32.5692, lng:-116.6313, biz_name:"OISHI SUSHI", title:"Sushi fresco estilo Sinaloa — abierto de miérc a lunes", cat:"food", emoji:"🍱", description:"Sushi fresco estilo Sinaloa con té de guayaba y porciones generosas; visítanos o llama al +52 665 100 3963.", dur_min:360},
  { lat:32.5727, lng:-116.633, biz_name:"Zen-Sushi", title:"Zen Sushi — rolls sabrosos y porciones enormes", cat:"food", emoji:"🍱", description:"Sushi con rolls grandes y teriyaki y té ilimitado; visítanos de miércoles a domingo o llama al +52 665 118 1869.", dur_min:360},
  { lat:32.5656, lng:-116.6296, biz_name:"Hideki Sushi", title:"Hideki Sushi — rolls desde las 10am todos los días", cat:"food", emoji:"🍱", description:"Sushi fresco y roll Manolo y aguachile roll todos los días desde las 10am; visítanos o llama al +52 665 100 0510.", dur_min:360},
  { lat:32.5716, lng:-116.6329, biz_name:"ISushi Tecate", title:"ISushi — fusión japonesa-mexicana con el Volcán especial", cat:"food", emoji:"🍱", description:"Sushi fusión japonesa-mexicana con roll Volcán y porciones grandes; visítanos o llama al +52 665 107 9975.", dur_min:360},
  { lat:32.5686, lng:-116.6455, biz_name:"Misoho Sushi", title:"Misoho Sushi — rolls grandes con jardín y cerveza", cat:"food", emoji:"🍱", description:"Sushi con rolls grandes y pescado fresco y jardín y cerveza artesanal; visítanos o llama al +52 665 654 0222.", dur_min:360},
  { lat:32.5729, lng:-116.6313, biz_name:"Rennai Ramen", title:"Rennai Ramen — el mejor ramen de Baja California", cat:"food", emoji:"🍜", description:"Ramen estilo japonés con tonkotsu y cocina a la vista en un ambiente íntimo; visítanos o llama al +52 665 141 3388.", dur_min:360},
  { lat:32.5659, lng:-116.6456, biz_name:"Restaurante Ispirazione", title:"Restaurante Ispirazione — pasta italiana de autor", cat:"food", emoji:"🍝", description:"Pasta italiana de autor y raviolis y ensaladas y vinos en una experiencia especial; reserva al +52 665 119 4374.", dur_min:360},
  { lat:32.5721, lng:-116.6307, biz_name:"Restaurant Casa Valentina", title:"Casa Valentina — desayunos brunch y ambiente familiar", cat:"food", emoji:"🍳", description:"Desayunos y brunch y comida familiar con omelette de chile poblano; visítanos o llama al +52 665 655 9336.", dur_min:360},
  { lat:32.5718, lng:-116.6508, biz_name:"Ensamble 43", title:"Ensamble 43 — cocina de autor y experiencia única", cat:"food", emoji:"🍽️", description:"Cocina de autor con ceviche y arrachera y carbonara con camarón en jardín; reserva al +52 665 521 0655.", dur_min:360},
  { lat:32.5737, lng:-116.6278, biz_name:"CENADURIA ANITA", title:"Cenadería Anita — chilaquiles y barbacoa sinaloense", cat:"food", emoji:"🍽️", description:"Chilaquiles verdes y barbacoa sinaloense y machaca y tortillas deliciosas; visítanos o llama al +52 665 100 3517.", dur_min:360},
  { lat:32.5599, lng:-116.6314, biz_name:"Fantástica Nevería", title:"Fantástica Nievería — helados nieves y más desde 9:30am", cat:"food", emoji:"🍦", description:"Nieves y helados y coctel de elote y aguas frescas y malteadas; visítanos o llama al +52 665 654 7746.", dur_min:360},
  { lat:32.5753, lng:-116.6253, biz_name:"Helados La Reina", title:"Helados La Reina — la nievería más famosa junto a la frontera", cat:"food", emoji:"🍦", description:"Helados y paletas y malteadas y smoothies y aguas frescas junto a la frontera; visítanos todos los días.", dur_min:360},
  { lat:32.5736, lng:-116.6429, biz_name:"Helados La Reina Sucursal", title:"Helados La Reina Sucursal — paletas artesanales en Plaza Sol", cat:"food", emoji:"🍦", description:"Paletas artesanales y helados de varios sabores en Plaza Sol; visítanos todos los días desde las 9am.", dur_min:360},
  { lat:32.5661, lng:-116.6298, biz_name:"Dairy Queen Tecate", title:"Dairy Queen — Blizzards y helados todos los días", cat:"food", emoji:"🍦", description:"Blizzards y helados DQ y postres para toda la familia; visítanos o llama al +52 665 521 2170.", dur_min:360},
  { lat:32.5713, lng:-116.6352, biz_name:"Carnitas y Tortas Carnicería Lopez", title:"Carnitas y tortas Carnicería López desde las 8am", cat:"food", emoji:"🥩", description:"Carnitas frescas y tortas y cortes al momento desde las 8am; visítanos o llama al +52 665 654 3035.", dur_min:360},
  { lat:32.5668, lng:-116.5844, biz_name:"Carnitas Los Aguilar", title:"Carnitas Los Aguilar — tortillas de casa y menudo", cat:"food", emoji:"🥩", description:"Carnitas con tortillas hechas en casa y caldo de res y menudo; visítanos de miércoles a domingo.", dur_min:360},
  { lat:32.5663, lng:-116.6307, biz_name:"Super Tortas Y Carnitas Noe", title:"Super Tortas y Carnitas Noé — tacos gigantes desde las 9am", cat:"food", emoji:"🥙", description:"Carnitas y tortas enormes y tacos que sí llenan desde las 9am; visítanos o llama al +52 665 101 7915.", dur_min:360},
  { lat:32.5667, lng:-116.6485, biz_name:"Menuderia Coqui", title:"Menudería Coqui — menudo y pozole desde las 8am", cat:"food", emoji:"🍲", description:"Menudo y pozole con porciones honestas de lunes a domingo; visítanos o llama al +52 665 654 5058.", dur_min:360},
  { lat:32.5572, lng:-116.6293, biz_name:"Carnitas La Enrramada", title:"Carnitas La Enramada — tacos grandes con salsa bomb", cat:"food", emoji:"🥩", description:"Carnitas en taco grande con salsa picante y porciones llenadoras; visítanos o llama al +52 665 393 0018.", dur_min:360},
  { lat:32.5707, lng:-116.6439, biz_name:"Tortas Ahogadas las Originales", title:"Tortas Ahogadas originales estilo Jalisco — desde las 10am", cat:"food", emoji:"🥙", description:"Tortas ahogadas estilo Jalisco y pozole y flautas y cantaritos; visítanos o llama al +52 665 134 7359.", dur_min:360},
  { lat:32.569, lng:-116.6344, biz_name:"Jugos Y Tortas Fredy", title:"Jugos y tortas Fredy — jugos frescos desde las 6am", cat:"food", emoji:"🥤", description:"Jugos naturales y tortas de lomo desde las 6am; visítanos o llama al +52 665 111 3590.", dur_min:360},
  { lat:32.5725, lng:-116.6387, biz_name:"La Deseada Tortas a la lumbre", title:"La Deseada — tortas a la lumbre recién hechas", cat:"food", emoji:"🥙", description:"Tortas de chorizo y lomo a la lumbre con papas naturales; visítanos o llama al +52 665 521 3717.", dur_min:360},
  { lat:32.5719, lng:-116.6289, biz_name:"Juicebox Tecate", title:"Juicebox — jugos y smoothies frescos hasta las 2pm", cat:"food", emoji:"🥤", description:"Jugos y smoothies naturales hechos al momento en el centro de Tecate; llama antes de venir al +52 665 121 5149.", dur_min:360},
  { lat:32.5724, lng:-116.6261, biz_name:"Nutri Jugos", title:"Nutri Jugos — jugos naturales y comida saludable", cat:"food", emoji:"🥤", description:"Jugos naturales de frutas y verduras con comida saludable; visítanos o llama al +52 665 122 2688.", dur_min:360},
  { lat:32.5666, lng:-116.5847, biz_name:"Jugos y algo mas", title:"Jugos y Algo Más — jugo del día y comida casera", cat:"food", emoji:"🥤", description:"Jugos de frutas frescas y comida casera y catering para eventos; visítanos o llama al +52 665 799 5284.", dur_min:360},
  { lat:32.5683, lng:-116.6099, biz_name:"Pollos El Dorado a la Leña", title:"Pollos El Dorado a la leña — desde las 11am", cat:"food", emoji:"🍗", description:"Pollo y costillas de puerco asados a la leña con sabor ahumado; visítanos o llama al +52 665 122 1899.", dur_min:360},
  { lat:32.5732, lng:-116.6295, biz_name:"Comida China TAYZAN", title:"Comida china Tayzan — pollo agridulce y té incluido", cat:"food", emoji:"🥡", description:"Comida china fresca con porciones generosas y té de cortesía y Tayzan Chicken; visítanos o llama al +52 665 521 0945.", dur_min:360},
  { lat:32.5713, lng:-116.6392, biz_name:"Restaurant TAYZAN 2", title:"Restaurant TAYZAN 2 — sucursal con menú fresco", cat:"food", emoji:"🥡", description:"Comida china recién preparada con porciones generosas y servicio atento; visítanos o llama al +52 665 100 4533.", dur_min:360},
  { lat:32.5702, lng:-116.6279, biz_name:"China Star Restaurant Bar", title:"China Star — buffet chino grande abierto todos los días", cat:"food", emoji:"🥡", description:"Buffet chino con mucha variedad y porciones grandes y precios accesibles; visítanos o llama al +52 665 521 2006.", dur_min:360},
  { lat:32.5722, lng:-116.6383, biz_name:"Restaurante Ocean City", title:"Ocean City — buffet chino y servicio atento", cat:"food", emoji:"🥡", description:"Buffet chino con camarón y variedad de platillos y servicio atento; visítanos o llama al +52 665 521 2578.", dur_min:360},
  { lat:32.5742, lng:-116.6405, biz_name:"Dumpling House TECATE", title:"Dumpling House — los mejores dumplings de Tecate", cat:"food", emoji:"🥟", description:"Dumplings y cocina asiática auténtica con menú personalizable; visítanos o llama al +52 665 261 0984.", dur_min:360},
  { lat:32.5734, lng:-116.6281, biz_name:"Sopa Pho 2", title:"Sopa Pho 2 — la mejor sopa vietnamita de Tecate", cat:"food", emoji:"🍜", description:"Sopa pho vietnamita con caldo sabroso y porciones enormes; visítanos o llama al +52 665 100 2527.", dur_min:360},
  { lat:32.573, lng:-116.6314, biz_name:"ROCKER hamburguesas", title:"ROCKER Hamburguesas — las mejores burgers de Tecate", cat:"food", emoji:"🍔", description:"Hamburguesas artesanales con ingredientes frescos y cerveza artesanal; visítanos o llama al +52 665 521 3141.", dur_min:360},
  { lat:32.5586, lng:-116.6396, biz_name:"LA HUESUDA BURGER", title:"La Huesuda Burger — hamburguesa de res 100% artesanal", cat:"food", emoji:"🍔", description:"Hamburguesa clásica con carne 100% natural y papas crujientes y ambiente familiar; visítanos o llama al +52 665 122 6038.", dur_min:360},
  { lat:32.5726, lng:-116.6288, biz_name:"Xolo burgers", title:"Xolo Burgers — xolopapas y burgers artesanales", cat:"food", emoji:"🍔", description:"Burgers artesanales y Xolopapas y ambiente familiar con música; visítanos o llama al +52 665 142 3576.", dur_min:360},
  { lat:32.5668, lng:-116.6341, biz_name:"Hamburguesas Garage", title:"Hamburguesas Garage — la mejor burger de la zona", cat:"food", emoji:"🍔", description:"Hamburguesas con carne natural y papas naturales bien fritas; visítanos o llama al +52 665 654 7720.", dur_min:360},
  { lat:32.5757, lng:-116.6336, biz_name:"No Te Va A Gustar Tecate", title:"No Te Va a Gustar — burger de carbón los fines de semana", cat:"food", emoji:"🍔", description:"Hamburguesas asadas al carbón con sabor único de jueves a domingo; visítanos o llama al +52 665 845 7462.", dur_min:360},
  { lat:32.5744, lng:-116.6478, biz_name:"Monchi Monchi Tkt", title:"Monchi Monchi — burgers en brioche hasta las 11:30pm", cat:"food", emoji:"🍔", description:"Burgers en pan brioche con sabor casero y antojo nocturno hasta las 11:30pm; visítanos.", dur_min:360},
  { lat:32.573, lng:-116.6457, biz_name:"Hells Grill", title:"Hell's Grill — carnes finas y tomahawk al carbón", cat:"food", emoji:"🥩", description:"Cortes premium y tomahawk al carbón y salsa macha de la casa; reserva o llama al +52 665 110 6475.", dur_min:360},
  { lat:32.5634, lng:-116.6512, biz_name:"El Antojo", title:"El Antojo — desayunos y donas famosas en Tecate", cat:"food", emoji:"🍩", description:"Desayunos y donas famosas y tortillas hechas a mano de lunes a sábado; visítanos o llama al +52 665 655 8923.", dur_min:360},
  { lat:32.5733, lng:-116.6258, biz_name:"Restaurant Los Gallos", title:"Restaurant Los Gallos — caldo de res y chilaquiles clásicos", cat:"food", emoji:"🍲", description:"Caldo de res con tuétano y chilaquiles con chipotle y café de olla desde las 7am; visítanos o llama al +52 665 122 3664.", dur_min:360},
];

export default async () => {
  const start = Date.now();

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;

    for (const f of SEEDS) {
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

        // Generar ID único con prefijo "seed" para identificarlos fácilmente
        const id = "seed" + Date.now() + Math.random().toString(36).slice(2, 5);

        // Duración aleatoria entre 45 y 60 minutos para que no todos expiren igual
        const durMin    = f.dur_min || 60;
        const expiresAt = new Date(Date.now() + durMin * 60000).toISOString();

        const cat = CATS[f.cat] || CATS.food;

        await sql`
          INSERT INTO flares (
            id, lat, lng,
            title, emoji,
            cat, cat_lbl, cat_color, cat_icon,
            type, body_text, biz_name,
            expires_at
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
            ${expiresAt}
          )
        `;

        inserted++;

        // Pequeña pausa cada 10 inserts para no saturar Neon
        if (inserted % 10 === 0) {
          await new Promise(r => setTimeout(r, 50));
        }

      } catch (rowErr) {
        errors++;
        console.error(`Error en flare "${f.biz_name}":`, rowErr.message);
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = `Seed Tecate OK — ${inserted} insertados, ${skipped} ya activos, ${errors} errores — ${elapsed}s`;
    console.log(msg);

    return new Response(msg, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (err) {
    console.error("Seed fatal error:", err.message);
    return new Response("Seed error: " + err.message, { status: 500 });
  }
};
