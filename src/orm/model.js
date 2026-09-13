import { count as sqlCount, eq } from 'drizzle-orm'
import { compileDomain } from './domain.js'
import { ValidationError } from './errors.js'
import {
  normalizeId,
  prepareValues,
  validateReadFields
} from './validation.js'

function pick(record, fields) {
  if (!fields?.length) return { ...record }
  return Object.fromEntries(fields.map(field => [field, record[field]]))
}

function pagination(options = {}) {
  const limit = options.limit === undefined ? 100 : Number(options.limit)
  const offset = options.offset === undefined ? 0 : Number(options.offset)

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new ValidationError('limit must be an integer between 1 and 1000', { limit: options.limit })
  }

  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new ValidationError('offset must be a non-negative integer', { offset: options.offset })
  }

  return { limit, offset }
}

export class Record {
  constructor(model, data) {
    this.model = model
    this.data = { ...data }
    Object.assign(this, data)
  }

  read(fields = []) {
    validateReadFields(this.model.meta, fields)
    return pick(this.data, fields)
  }

  async exists() {
    return this.model.exists(this.id)
  }

  async write(values) {
    const prepared = await this.model.prepare(values, 'write')
    const next = { ...prepared, updated_at: new Date() }

    await this.model.db.update(this.model.definition.table)
      .set(next)
      .where(eq(this.model.definition.table.id, this.id))
      .run()

    Object.assign(this, next)
    this.data = { ...this.data, ...next }
    return true
  }

  async unlink() {
    await this.model.db.delete(this.model.definition.table)
      .where(eq(this.model.definition.table.id, this.id))
      .run()
    return true
  }

  toJSON() {
    return { ...this.data }
  }
}

export class RecordSet {
  constructor(model, records = []) {
    this.model = model
    this.records = Object.freeze([...records])
  }

  get length() {
    return this.records.length
  }

  get ids() {
    return this.records.map(record => record.id)
  }

  [Symbol.iterator]() {
    return this.records[Symbol.iterator]()
  }

  at(index) {
    return this.records.at(index) ?? null
  }

  first() {
    return this.at(0)
  }

  map(callback) {
    return this.records.map(callback)
  }

  mapped(fieldOrCallback) {
    if (typeof fieldOrCallback === 'function') {
      return this.records.map(fieldOrCallback)
    }

    if (typeof fieldOrCallback !== 'string' || !fieldOrCallback) {
      throw new ValidationError('mapped() expects a field name or callback')
    }

    return this.records.map(record => record[fieldOrCallback])
  }

  filtered(callback) {
    if (typeof callback !== 'function') {
      throw new ValidationError('filtered() expects a callback')
    }

    return new RecordSet(this.model, this.records.filter(callback))
  }

  ensureOne() {
    if (this.records.length !== 1) {
      throw new ValidationError('Expected exactly one record', {
        count: this.records.length
      })
    }

    return this.records[0]
  }

  async write(values) {
    for (const record of this.records) {
      await record.write(values)
    }
    return true
  }

  async unlink() {
    for (const record of this.records) {
      await record.unlink()
    }
    return true
  }

  toJSON() {
    return this.records.map(record => record.toJSON())
  }
}

export class ModelSet {
  constructor(db, definition, meta, resolveModel) {
    this.db = db
    this.definition = definition
    this.meta = meta
    this.resolveModel = resolveModel
  }

  async prepare(values, mode) {
    const prepared = prepareValues(this.meta, values, { mode })
    await this.validateRelations(prepared)
    return prepared
  }

  async validateRelations(values) {
    for (const [name, field] of Object.entries(this.meta.fields)) {
      if (field.type !== 'many2one' || !(name in values) || values[name] === null) continue

      const related = this.resolveModel?.(field.comodel)

      if (!related || !(await related.exists(values[name]))) {
        throw new ValidationError(
          `Related record not found: ${field.comodel}(${values[name]})`,
          { field: name, comodel: field.comodel, id: values[name] }
        )
      }
    }
  }

  async search(domain = [], options = {}) {
    const { limit, offset } = pagination(options)
    const where = compileDomain(this.definition.table, domain)
    let query = this.db.select().from(this.definition.table)

    if (where) query = query.where(where)

    const rows = await query.limit(limit).offset(offset).all()
    return new RecordSet(this, rows.map(row => new Record(this, row)))
  }

  async searchRead(domain = [], fields = [], options = {}) {
    validateReadFields(this.meta, fields)
    const records = await this.search(domain, options)
    return records.map(record => record.read(fields))
  }

  async browse(id) {
    const normalizedId = normalizeId(id)
    const row = await this.db.select()
      .from(this.definition.table)
      .where(eq(this.definition.table.id, normalizedId))
      .get()

    return row ? new Record(this, row) : null
  }

  async exists(id) {
    const record = await this.browse(id)
    return Boolean(record)
  }

  async create(values) {
    const prepared = await this.prepare(values, 'create')
    const rows = await this.db.insert(this.definition.table)
      .values(prepared)
      .returning()
      .all()

    return new Record(this, rows[0])
  }

  async createMany(valuesList) {
    if (!Array.isArray(valuesList)) {
      throw new ValidationError('createMany() expects an array of values')
    }

    if (valuesList.length === 0) {
      return new RecordSet(this)
    }

    const prepared = []

    for (const values of valuesList) {
      prepared.push(await this.prepare(values, 'create'))
    }

    const rows = await this.db.insert(this.definition.table)
      .values(prepared)
      .returning()
      .all()

    return new RecordSet(this, rows.map(row => new Record(this, row)))
  }

  async count(domain = []) {
    const where = compileDomain(this.definition.table, domain)
    let query = this.db.select({ value: sqlCount() }).from(this.definition.table)

    if (where) query = query.where(where)

    const row = await query.get()
    return row?.value ?? 0
  }
}
