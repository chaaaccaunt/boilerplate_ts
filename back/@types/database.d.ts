import { iModels } from "@/database";

declare global {
  namespace iDatabase {
    interface Models extends iModels { }
  }
}