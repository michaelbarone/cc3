/**
 * Creates a mock File object for testing file uploads
 * @param filename The name of the file
 * @param type The MIME type of the file
 * @param size The size of the file in bytes
 * @returns A File object
 */
export function createTestFile(filename: string, type: string, size: number): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], filename, { type });
}
