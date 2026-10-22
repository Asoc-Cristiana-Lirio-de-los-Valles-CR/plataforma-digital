// sermon_date es un día del calendario editorial (hora de Costa Rica), sin hora. new Date('AAAA-MM-DD') lo
// interpreta como medianoche UTC y, formateado en la zona del navegador, en Costa Rica cae en el día anterior.
// Se formatea en UTC para que el día sea el mismo en el servidor y en cualquier navegador.
export function formatSermonDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString('es-CR', { ...options, timeZone: 'UTC' });
}
