import { Exceptions } from "@/libs"
import { LogCollectorService } from "@/services/LogCollectorService"
import { BaseController } from "./BaseController"

export class LogsController extends BaseController {
  constructor(private readonly service: LogCollectorService) {
    super()

    const listRoute: iContracts.iRoute<iSharedLogs.LogsListPayloadDto, iContracts.iControllerResult<iSharedLogs.LogsListResponseDto>> = {
      url: /^\/logs\/list\/?$/,
      method: "POST",
      callback: this.handle("list", this.list.bind(this))
    }

    this.addRoutes([listRoute])
  }

  private list(payload: iContracts.iRequestContextPayload<iSharedLogs.LogsListPayloadDto>): Promise<iContracts.iControllerResult<iSharedLogs.LogsListResponseDto>> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.list(payload.data)
      .then((data) => ({ data }))
  }
}
