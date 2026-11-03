/** Le matchmaking place le nom de salle dans l'URL : pas de « / ». */
export const nomSalle = (map: string) => map.replaceAll("/", "-");
