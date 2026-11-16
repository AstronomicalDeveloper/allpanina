/** Nombre visible de un ámbito. Los departamentos conservan su nombre propio; el país va en inglés. */
export function areaName(id: string, name: string): string {
  return id === 'PE' ? 'Peru' : name
}
