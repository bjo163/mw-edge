import { ModelRegistry } from '../orm/index.js'
import { ResCompany } from './res.company.js'
import { ResPartner } from './res.partner.js'

export const registry = new ModelRegistry()
  .register(ResCompany)
  .register(ResPartner)
  .finalize()
