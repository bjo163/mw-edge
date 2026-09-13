import { ValidationError } from './errors.js'

export const SYSTEM_FIELDS = Object.freeze(['id', 'created_at', 'updated_at'])
export const RESERVED_MODEL_NAMES = Object.freeze([
  'mw.model',
  'mw.field',
  'mw.registry'
])

const SYSTEM_FIELD_SET = new Set(SYSTEM_FIELDS)
const RESERVED_MODEL_SET = new Set(RESERVED_MODEL_NAMES)
const MODEL_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/
const API_METHOD = /^[a-z][a-z0-9_]*$/
const SUPPORTED_TYPES = new Set([
  'char',
  'text',
  'integer',
  'float',
  'boolean',
  'datetime',
  'selection',
  'many2one'
])

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasDefault(field) {
  return Object.prototype.hasOwnProperty.call(field, 'default')
}

function defaultValue(field) {
  return typeof field.default === 'function' ? field.default() : field.default
}

function isMissing(value, field) {
  if (value === undefined || value === null) return true
  return (field.type === 'char' || field.type === 'text') && value === ''
}

function normalizeApi(model) {
  if (model._api === undefined) {
    return Object.freeze({
      rest: false,
      rpc: Object.freeze([])
    })
  }

  if (!isObject(model._api)) {
    throw new ValidationError(`Model ${model._name} _api must be an object`)
  }

  const rest = model._api.rest === true
  const rpc = model._api.rpc ?? []

  if (!Array.isArray(rpc)) {
    throw new ValidationError(`Model ${model._name} _api.rpc must be an array`)
  }

  const methods = [...new Set(rpc)]

  for (const method of methods) {
    if (typeof method !== 'string' || !API_METHOD.test(method)) {
      throw new ValidationError(`Invalid RPC method exposure: ${method}`, {
        model: model._name,
        method
      })
    }
  }

  return Object.freeze({
    rest,
    rpc: Object.freeze(methods)
  })
}

function validateSelection(field, value, name) {
  const allowed = field.selection.map(option => Array.isArray(option) ? option[0] : option)
  if (!allowed.includes(value)) {
    throw new ValidationError(`Invalid value for ${name}`, { field: name, allowed })
  }
}

function normalizeValue(field, value, name) {
  if (value === null) return null

  switch (field.type) {
    case 'char':
    case 'text':
      if (typeof value !== 'string') throw new ValidationError(`${name} must be a string`, { field: name })
      return value
    case 'integer':
      if (!Number.isSafeInteger(value)) throw new ValidationError(`${name} must be an integer`, { field: name })
      return value
    case 'float':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ValidationError(`${name} must be a finite number`, { field: name })
      }
      return value
    case 'boolean':
      if (typeof value !== 'boolean') throw new ValidationError(`${name} must be a boolean`, { field: name })
      return value
    case 'datetime': {
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value
      if (typeof value === 'string') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) return parsed
      }
      throw new ValidationError(`${name} must be a valid datetime`, { field: name })
    }
    case 'selection':
      validateSelection(field, value, name)
      return value
    case 'many2one':
      if (!Number.isSafeInteger(value) || value < 1) {
        throw new ValidationError(`${name} must be a positive integer ID or null`, { field: name })
      }
      return value
    default:
      throw new ValidationError(`Unsupported field type: ${field.type}`, { field: name })
  }
}

export function normalizeId(value) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ValidationError('ID must be a positive integer', { id: value })
  }
  return id
}

export function validateModelDefinition(model) {
  if (typeof model?._name !== 'string' || !MODEL_NAME.test(model._name)) {
    throw new ValidationError('Model _name must use dotted lowercase notation', { model: model?._name })
  }

  if (RESERVED_MODEL_SET.has(model._name)) {
    throw new ValidationError(`Model name is reserved by MW Edge: ${model._name}`, {
      model: model._name
    })
  }

  if (!isObject(model.table)) {
    throw new ValidationError(`Model ${model._name} requires a table binding`)
  }

  if (!isObject(model.fields)) {
    throw new ValidationError(`Model ${model._name} requires a fields object`)
  }

  const normalizedFields = {}

  for (const [name, definition] of Object.entries(model.fields)) {
    if (SYSTEM_FIELD_SET.has(name)) {
      throw new ValidationError(`Field ${name} is reserved by MW Edge`, { model: model._name, field: name })
    }

    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new ValidationError(`Invalid field name: ${name}`, { model: model._name, field: name })
    }

    if (!isObject(definition) || !SUPPORTED_TYPES.has(definition.type)) {
      throw new ValidationError(`Invalid field definition: ${name}`, { model: model._name, field: name })
    }

    if (definition.type === 'many2one' && typeof definition.comodel !== 'string') {
      throw new ValidationError(`Many2one field ${name} requires a comodel`, { model: model._name, field: name })
    }

    if (definition.type === 'selection' && (!Array.isArray(definition.selection) || definition.selection.length === 0)) {
      throw new ValidationError(`Selection field ${name} requires choices`, { model: model._name, field: name })
    }

    if (!(name in model.table)) {
      throw new ValidationError(`Field ${name} has no matching table column`, { model: model._name, field: name })
    }

    normalizedFields[name] = Object.freeze({ ...definition })
  }

  for (const systemField of SYSTEM_FIELDS) {
    if (!(systemField in model.table)) {
      throw new ValidationError(`Model ${model._name} is missing system column ${systemField}`)
    }
  }

  return Object.freeze({
    name: model._name,
    description: model._description ?? model._name,
    fields: Object.freeze(normalizedFields),
    api: normalizeApi(model)
  })
}

export function prepareValues(meta, values, { mode }) {
  if (!isObject(values)) throw new ValidationError('Values must be an object')

  const output = {}

  for (const key of Object.keys(values)) {
    if (SYSTEM_FIELD_SET.has(key)) {
      throw new ValidationError(`Field ${key} is managed by MW Edge`, { field: key })
    }

    const field = meta.fields[key]
    if (!field) throw new ValidationError(`Unknown field: ${key}`, { field: key })
    if (field.readonly) throw new ValidationError(`Field ${key} is readonly`, { field: key })

    output[key] = normalizeValue(field, values[key], key)
  }

  if (mode === 'create') {
    for (const [name, field] of Object.entries(meta.fields)) {
      if (!(name in output) && hasDefault(field)) {
        output[name] = normalizeValue(field, defaultValue(field), name)
      }

      if (field.required && isMissing(output[name], field)) {
        throw new ValidationError(`Field ${name} is required`, { field: name })
      }
    }
  }

  if (mode === 'write') {
    for (const [name, value] of Object.entries(output)) {
      const field = meta.fields[name]
      if (field.required && isMissing(value, field)) {
        throw new ValidationError(`Field ${name} is required`, { field: name })
      }
    }
  }

  return output
}

export function validateReadFields(meta, fields = []) {
  if (!Array.isArray(fields)) throw new ValidationError('Fields must be an array')
  if (fields.length === 0) return fields

  const allowed = new Set([...SYSTEM_FIELDS, ...Object.keys(meta.fields)])

  for (const field of fields) {
    if (!allowed.has(field)) throw new ValidationError(`Unknown field: ${field}`, { field })
  }

  return fields
}
