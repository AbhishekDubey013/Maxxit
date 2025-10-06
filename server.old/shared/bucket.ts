/**
 * Bucket a timestamp to the nearest 6-hour window in UTC
 * Used for signal deduplication
 */
export function bucket6hUtc(date: Date): Date {
  const hours = date.getUTCHours();
  const bucketHour = Math.floor(hours / 6) * 6;
  
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    bucketHour,
    0,
    0,
    0
  ));
}

/**
 * Check if a signal already exists in the same 6h bucket
 */
export function isDuplicateSignal(
  existingCreatedAt: Date,
  newCreatedAt: Date
): boolean {
  const existingBucket = bucket6hUtc(existingCreatedAt);
  const newBucket = bucket6hUtc(newCreatedAt);
  
  return existingBucket.getTime() === newBucket.getTime();
}
