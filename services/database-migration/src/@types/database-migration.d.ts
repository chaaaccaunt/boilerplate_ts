declare global {
  namespace iDatabaseMigration {
    interface RuntimeUserConfig {
      userName: string
      password: string
      host: string
      grants: RuntimeUserGrant[]
    }

    interface RuntimeUserGrant {
      table: string
      operations: string[]
    }
  }
}

export { }
