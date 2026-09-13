import {
  PayloadTooLargeError,
  ValidationError
} from '../orm/index.js'

export const MAX_JSON_BODY_BYTES = 64 * 1024

export async function readJsonObject(context) {
  const declaredLength = Number(context.req.header('content-length') ?? 0)

  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new PayloadTooLargeError(undefined, {
      max_bytes: MAX_JSON_BODY_BYTES,
      received_bytes: declaredLength
    })
  }

  const text = await context.req.text()
  const size = new TextEncoder().encode(text).byteLength

  if (size > MAX_JSON_BODY_BYTES) {
    throw new PayloadTooLargeError(undefined, {
      max_bytes: MAX_JSON_BODY_BYTES,
      received_bytes: size
    })
  }

  if (!text.trim()) {
    throw new ValidationError('JSON request body is required')
  }

  let value

  try {
    value = JSON.parse(text)
  } catch {
    throw new ValidationError('Request body must contain valid JSON')
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('JSON request body must be an object')
  }

  return value
}
