import { TestController } from "@/controllers/TestController";
import { HTTPServer } from "@/libs"

export interface iDefaultEnvs { }

const testController = new TestController()

const httpServer = new HTTPServer()

httpServer.use(testController.routes)

httpServer.listen("8081")