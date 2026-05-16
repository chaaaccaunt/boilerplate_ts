import { existsSync, readdirSync, readFileSync } from "fs"
import { basename, extname, resolve } from "path"
import { QueryTypes, Sequelize } from "sequelize"

interface AppliedMigrationRow {
  name: string
}

interface MigrationFile {
  name: string
  path: string
}

export class DatabaseMigrationService {
  private readonly migrationsTableName = "database_migrations"

  constructor(
    private readonly sequelize: Sequelize,
    private readonly migrationsDirectory = resolve(process.cwd(), "src/database/migrations")
  ) { }

  migrate(): Promise<void> {
    return this.ensureMigrationsTable()
      .then(() => this.getPendingMigrations())
      .then((migrations) => this.applyMigrations(migrations))
  }

  private ensureMigrationsTable(): Promise<unknown> {
    return this.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTableName} (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  private getPendingMigrations(): Promise<MigrationFile[]> {
    return this.getAppliedMigrationNames()
      .then((appliedMigrationNames) => this.getMigrationFiles()
        .filter((migration) => !appliedMigrationNames.has(migration.name)))
  }

  private getAppliedMigrationNames(): Promise<Set<string>> {
    return this.sequelize.query<AppliedMigrationRow>(
      `SELECT name FROM ${this.migrationsTableName}`,
      { type: QueryTypes.SELECT }
    )
      .then((rows) => new Set(rows.map((row) => row.name)))
  }

  private getMigrationFiles(): MigrationFile[] {
    if (!existsSync(this.migrationsDirectory)) return []

    return readdirSync(this.migrationsDirectory)
      .filter((fileName) => extname(fileName) === ".sql")
      .sort((left, right) => left.localeCompare(right))
      .map((fileName) => ({
        name: basename(fileName),
        path: resolve(this.migrationsDirectory, fileName)
      }))
  }

  private applyMigrations(migrations: MigrationFile[]): Promise<void> {
    return migrations.reduce(
      (chain, migration) => chain.then(() => this.applyMigration(migration)),
      Promise.resolve()
    )
  }

  private applyMigration(migration: MigrationFile): Promise<void> {
    const sql = readFileSync(migration.path, "utf-8")
    const statements = this.getSqlStatements(sql)

    return this.sequelize.transaction((transaction) => statements.reduce(
      (chain, statement) => chain.then(() => this.sequelize.query(statement, { transaction })),
      Promise.resolve<unknown>(undefined)
    )
      .then(() => this.sequelize.query(
        `INSERT INTO ${this.migrationsTableName} (name) VALUES (?)`,
        {
          replacements: [migration.name],
          transaction
        }
      )))
      .then(() => undefined)
  }

  private getSqlStatements(sql: string): string[] {
    const statements: string[] = []
    let currentStatement = ""
    let quote: "'" | '"' | "`" | null = null
    let isEscaped = false

    for (const character of sql) {
      if (quote) {
        currentStatement += character

        if (isEscaped) {
          isEscaped = false
          continue
        }

        if (character === "\\") {
          isEscaped = true
          continue
        }

        if (character === quote) quote = null
        continue
      }

      if (character === "'" || character === "\"" || character === "`") {
        quote = character
        currentStatement += character
        continue
      }

      if (character === ";") {
        this.pushSqlStatement(statements, currentStatement)
        currentStatement = ""
        continue
      }

      currentStatement += character
    }

    this.pushSqlStatement(statements, currentStatement)

    return statements
  }

  private pushSqlStatement(statements: string[], statement: string): void {
    const normalizedStatement = statement.trim()
    if (normalizedStatement) statements.push(normalizedStatement)
  }
}
