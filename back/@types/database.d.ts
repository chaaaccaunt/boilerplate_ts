import { iModels, DataBaseInstance } from "@/database";

declare global {
  namespace iDatabase {
    interface Database extends DataBaseInstance { }
    interface Models extends iModels { }
  }
}