export class ModelRegistry {
  #models = new Map()

  register(model) {
    if (!model._name) throw new Error('Model requires static _name')
    if (this.#models.has(model._name)) throw new Error(`Model already registered: ${model._name}`)
    this.#models.set(model._name, model)
    return this
  }

  get(name) {
    const model = this.#models.get(name)
    if (!model) throw new Error(`Unknown model: ${name}`)
    return model
  }

  has(name) {
    return this.#models.has(name)
  }

  names() {
    return [...this.#models.keys()]
  }
}
