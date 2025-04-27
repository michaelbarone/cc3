/**
 * Factory for creating test file blobs
 */

/**
 * Creates a test file blob with the given name and type
 * @param name The name of the file
 * @param type The MIME type of the file
 * @param content The content of the file
 * @returns A File object
 */
export function createTestFileBlob(
  name = "test.png",
  type = "image/png",
  content = "test"
): File {
  return new File([content], name, { type });
}
