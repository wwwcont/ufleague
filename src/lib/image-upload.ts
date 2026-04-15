export type CircleCrop = {
  x: number
  y: number
  zoom: number
}

type CropRect = {
  sx: number
  sy: number
  side: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const fileToObjectUrl = (file: File) => URL.createObjectURL(file)

const loadImage = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = fileToObjectUrl(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return image
  } catch {
    throw new Error('Не удалось декодировать изображение. Для iPhone выберите фото в формате JPG/PNG (Most Compatible).')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const canvasToJpegFile = async (canvas: HTMLCanvasElement, name: string) => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Не удалось обработать изображение')
  return new File([blob], name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}

const resolveSquareCrop = (width: number, height: number, crop: CircleCrop): CropRect => {
  const safeZoom = clamp(crop.zoom, 1, 3)
  const cropSide = Math.min(width, height) / safeZoom
  const freeX = Math.max(0, width - cropSide)
  const freeY = Math.max(0, height - cropSide)
  const sx = clamp(freeX / 2 + (clamp(crop.x, -100, 100) / 100) * (freeX / 2), 0, freeX)
  const sy = clamp(freeY / 2 + (clamp(crop.y, -100, 100) / 100) * (freeY / 2), 0, freeY)

  return {
    sx,
    sy,
    side: cropSide,
  }
}

export const normalizeImageForUpload = async (input: File, maxSide = 2048): Promise<File> => {
  if (input.type === 'image/svg+xml') return input
  const image = await loadImage(input)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) throw new Error('Файл изображения поврежден')

  const scale = Math.min(1, maxSide / Math.max(width, height))
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось подготовить canvas')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, targetW, targetH)
  return canvasToJpegFile(canvas, input.name || 'upload.jpg')
}

export const buildCircularCropUploadFile = async (input: File, crop: CircleCrop, size = 1024): Promise<File> => {
  const image = await loadImage(input)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) throw new Error('Файл изображения поврежден')

  const { sx, sy, side } = resolveSquareCrop(width, height, crop)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось подготовить canvas')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size)
  return canvasToJpegFile(canvas, input.name || 'avatar.jpg')
}
