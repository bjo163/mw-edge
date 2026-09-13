function field(type, options = {}) {
  if (options === undefined) options = {}
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Field options must be an object')
  }

  return Object.freeze({ type, ...options })
}

export const fields = Object.freeze({
  Char: (options = {}) => field('char', options),
  Text: (options = {}) => field('text', options),
  Integer: (options = {}) => field('integer', options),
  Float: (options = {}) => field('float', options),
  Boolean: (options = {}) => field('boolean', options),
  DateTime: (options = {}) => field('datetime', options),
  Selection: (selection, options = {}) => field('selection', {
    ...options,
    selection: Object.freeze([...selection])
  }),
  Many2one: (comodel, options = {}) => field('many2one', { ...options, comodel })
})
