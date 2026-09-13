CREATE TABLE IF NOT EXISTS res_company (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS res_partner (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  company_id INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES res_company(id)
);

CREATE INDEX IF NOT EXISTS res_partner_company_id_idx ON res_partner(company_id);
CREATE INDEX IF NOT EXISTS res_partner_name_idx ON res_partner(name);
