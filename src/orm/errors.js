export class MwError extends Error {
  constructor(message, { code = 'MW_ERROR', status = 500, details } = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.status = status
    this.details = details
  }
}

export class ValidationError extends MwError {
  constructor(message, details) {
    super(message, { code: 'VALIDATION_ERROR', status: 400, details })
  }
}

export class PayloadTooLargeError extends MwError {
  constructor(message = 'Request body is too large', details) {
    super(message, { code: 'PAYLOAD_TOO_LARGE', status: 413, details })
  }
}

export class NotFoundError extends MwError {
  constructor(message, details) {
    super(message, { code: 'NOT_FOUND', status: 404, details })
  }
}

export class ConflictError extends MwError {
  constructor(message, details) {
    super(message, { code: 'CONFLICT', status: 409, details })
  }
}

export function errorPayload(error, requestId) {
  const known = error instanceof MwError

  return {
    status: known ? error.status : 500,
    body: {
      error: {
        code: known ? error.code : 'INTERNAL_ERROR',
        message: known ? error.message : 'Internal server error',
        ...(known && error.details ? { details: error.details } : {}),
        ...(requestId ? { request_id: requestId } : {})
      }
    }
  }
}
