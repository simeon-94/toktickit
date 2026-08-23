export function generateTicketNumber(sequenceNumber: number, year = new Date().getFullYear()): string {
  const padded = String(sequenceNumber).padStart(6, "0");
  return `TKT-${year}-${padded}`;
}