import { companies } from '../db/schema.js'
import { fields } from '../orm/index.js'

export class ResCompany {
  static _name = 'res.company'
  static _description = 'Company'
  static _api = {
    rest: true,
    rpc: [
    'search',
    'search_read',
    'count',
    'browse',
    'create',
    'create_many',
    'write',
    'unlink'
  ]
  }
  static table = companies

  static fields = {
    name: fields.Char({ required: true }),
    active: fields.Boolean({ default: true })
  }
}
