export function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function addMinutesToIso(
  isoDate: string | Date,
  minutes: number,
): string {
  const baseDate = typeof isoDate === "string" ? new Date(isoDate) : isoDate;

  return new Date(baseDate.getTime() + minutes * 60_000).toISOString();
}

export function isExpired(isoDate: string, now = new Date()): boolean {
  return new Date(isoDate).getTime() <= now.getTime();
}
