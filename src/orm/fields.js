function field(type, options = {}) {
  return Object.freeze({ type, ...options })
}

export const fields = {
  Char: options => field('char', options),
  Text: options => field('text', options),
  Integer: options => field('integer', options),
  Float: options => field('float', options),
  Boolean: options => field('boolean', options),
  DateTime: options => field('datetime', options),
  Selection: (selection, options = {}) => field('selection', { selection, ...options }),
  Many2one: (comodel, options = {}) => field('many2one', { comodel, ...options })
}
