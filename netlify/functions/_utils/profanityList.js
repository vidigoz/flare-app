// _utils/profanityList.js
// Lista de palabras bloqueadas. Agregar o quitar palabras aquí sin tocar flares.js.
// Las palabras son case-insensitive y se detectan aunque estén dentro de otra palabra.

export const BLOCKED_WORDS = [
  // Mexicanismos
  "pinche", "pinches", "pinchi",
  "chinga", "chingada", "chingado", "chingados", "chingon", "chingona", "chingones",
  "cabron", "cabrona", "cabrones",
  "pendejo", "pendeja", "pendejos", "pendejas", "pendejada",
  "culero", "culera", "culeros",
  "verga", "vergon",
  "puta", "puto", "putas", "putos", "putear",
  "wey", "guey",
  "joto", "jota",
  "mamada", "mamadas", "mamon", "mamona",
  "perra", "perro",
  "ojete", "ojetes",
  "cholo", "naco", "naca",
  "culiao",
  // Español general
  "mierda", "mierdas",
  "gilipollas", "gilipolla",
  "hostia", "hostias",
  "coño", "cono",
  "polla", "pollas",
  "capullo", "capullos",
  "idiota", "idiotas",
  "imbecil", "imbeciles",
  "estupido", "estupida", "estupidos",
  "culo", "culos",
  "follar", "folla",
  "pedo", "pedos",
  // Inglés
  "fuck", "fucking", "fucker", "fucked",
  "shit", "shitty",
  "bitch", "bitches",
  "asshole", "ass",
  "cunt", "cunts",
  "dick", "dicks",
  "cock", "cocks",
  "pussy", "pussies",
  "nigger", "nigga",
  "faggot", "fag",
  "whore", "whores",
  "bastard", "bastards",
];

/**
 * Verifica si el texto contiene alguna palabra de la lista.
 * @param {string} text
 * @returns {boolean}
 */
export function containsProfanity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}
