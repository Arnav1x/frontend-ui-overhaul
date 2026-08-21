/** Saves in-session content through a transient object-URL link. */
export function downloadFile(
  content: string,
  fileName: string,
  type: string
): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
