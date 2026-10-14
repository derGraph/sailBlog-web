export function removeSensitiveData<T extends object | null>(inputData: T): T {
  if (inputData === null) return inputData;
  const record = inputData as Record<string, unknown>;
  if (Array.isArray(inputData)) {
    for (let element in inputData) {
      inputData[element] = removeSensitiveData(inputData[element]);
    }
  } else {
    for (let key in inputData) {
      if (record[key] == null) {
        record[key] = null;
      } else {
        if (typeof record[key] == 'object') {
          if (key == 'lastPing') {
            record[key] = null;
          }
          const value = record[key];
          if (typeof value === 'object') record[key] = removeSensitiveData(value);
          continue;
        }
        if (key == 'email') {
          record[key] = null;
        }
        if (key == 'dateOfBirth') {
          record[key] = null;
        }
        if (key == 'roleId') {
          record[key] = null;
        }
        if (key == 'activeTripId') {
          record[key] = null;
        }
      }
    }
  }
  return inputData;
}
