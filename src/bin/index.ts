import { MainController } from "@/controllers/MainController";
import { HTTPServer } from "@/libs"

export interface iDefaultEnvs { }

const httpServer = new HTTPServer()
const mainController = new MainController()

httpServer.use(mainController.routes)

httpServer.listen("8081")