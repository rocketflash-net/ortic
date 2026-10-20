/**
 * Saves a blob (e.g. a CSV fetched with the auth header) as a file through a temporary object URL.
 *
 * @param blob - File contents.
 * @param filename - Suggested file name, e.g. `"pesanan-ortic.csv"`.
 */
export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
