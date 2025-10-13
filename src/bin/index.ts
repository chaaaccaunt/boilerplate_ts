import { MainController } from "@/controllers/MainController";
import { HTTPServer } from "@/libs"

export interface iDefaultEnvs { }

const testController = new MainController()

const httpServer = new HTTPServer()

httpServer.use(testController.routes)

httpServer.listen("8081")