/** Photo types the API accepts (`IMAGE_RULES` in product.service.ts). */
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const MAX_PRODUCT_IMAGES = 8
export const MAX_PRODUCT_IMAGE_MB = 5

/** Longest side after compression; enough for zoom on the product page. */
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.85

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Unreadable image"))
    }
    image.src = url
  })

/**
 * Resizes a photo to at most 1600 px on its longest side and re-encodes it as WebP, keeping transparency
 * (cut-out product photos suit the store theme).
 *
 * @returns The WebP file, or the original when the browser cannot encode WebP or the result is not smaller.
 */
export const compressToWebp = async (file: File): Promise<File> => {
  const image = await loadImage(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY))
  if (!blob || blob.type !== "image/webp" || (blob.size >= file.size && file.type === "image/webp")) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" })
}
