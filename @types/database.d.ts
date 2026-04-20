import { mDatabase, tDatabase } from "@/database";

declare global {
  declare namespace iDatabase {
    interface Models extends mDatabase { }
    interface Instances extends tDatabase { }
  }
}