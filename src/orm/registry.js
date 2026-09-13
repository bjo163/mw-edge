import { AccessError, NotFoundError, ValidationError } from './errors.js'
import { validateModelDefinition } from './validation.js'

export class ModelRegistry {
  #models = new Map()
  #metadata = new Map()
  #finalized = false

  register(model) {
    if (this.#finalized) throw new ValidationError('Registry is already finalized')

    const meta = validateModelDefinition(model)

    if (this.#models.has(meta.name)) {
      throw new ValidationError(`Model already registered: ${meta.name}`)
    }

    this.#models.set(meta.name, model)
    this.#metadata.set(meta.name, meta)
    return this
  }

  finalize() {
    for (const [modelName, meta] of this.#metadata) {
      for (const [fieldName, field] of Object.entries(meta.fields)) {
        if (field.type === 'many2one' && !this.#models.has(field.comodel)) {
          throw new ValidationError(
            `Unknown comodel ${field.comodel} on ${modelName}.${fieldName}`,
            { model: modelName, field: fieldName, comodel: field.comodel }
          )
        }
      }
    }

    this.#finalized = true
    return this
  }

  get(name) {
    const model = this.#models.get(name)
    if (!model) throw new NotFoundError(`Unknown model: ${name}`, { model: name })
    return model
  }

  metadata(name) {
    const meta = this.#metadata.get(name)
    if (!meta) throw new NotFoundError(`Unknown model: ${name}`, { model: name })
    return meta
  }

  assertRest(name) {
    const meta = this.metadata(name)

    if (!meta.api.rest) {
      throw new AccessError(`REST access is disabled for model: ${name}`, { model: name })
    }

    return meta
  }

  assertRpc(name, method) {
    const meta = this.metadata(name)

    if (!meta.api.rpc.includes(method)) {
      throw new AccessError(`RPC method is not exposed: ${name}.${method}`, {
        model: name,
        method
      })
    }

    return meta
  }

  describe(name) {
    const meta = this.metadata(name)
    return {
      name: meta.name,
      description: meta.description,
      fields: meta.fields,
      api: meta.api
    }
  }

  describeAll() {
    return this.names().map(name => this.describe(name))
  }

  describeApi() {
    return this.names()
      .map(name => this.describe(name))
      .filter(model => model.api.rest || model.api.rpc.length > 0)
  }

  has(name) {
    return this.#models.has(name)
  }

  names() {
    return [...this.#models.keys()]
  }
}
