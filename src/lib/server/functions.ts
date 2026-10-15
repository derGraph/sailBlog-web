const privateFields = new Set(['email', 'dateOfBirth', 'roleId', 'activeTripId', 'lastPing']);

export function removeSensitiveData<T>(inputData: T): T {
  if (inputData === null || typeof inputData !== 'object' || inputData instanceof Date)
    return inputData;
  const record = inputData as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    record[key] = privateFields.has(key) ? null : removeSensitiveData(record[key]);
  }
  return inputData;
}
