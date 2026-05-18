import { Exceptions, MicroServiceController } from "@/libs"
import { LogCollectorService } from "@/services/LogCollectorService"

export class LogsController extends MicroServiceController {
  constructor(private readonly service: LogCollectorService) {
    super()

    const listRoute: iContracts.iMicroServiceRoute<iSharedLogs.LogsListPayloadDto, iSharedLogs.LogsListResponseDto> = {
      url: /^POST:\/logs\/list\/?$/,
      method: "POST",
      callback: this.handle(this.service.constructor.name, "list", this.list.bind(this))
    }

    this.addRoutes([listRoute])
  }

  private list(payload: iContracts.iMicroServiceRequestPayload<iSharedLogs.LogsListPayloadDto>): Promise<iSharedLogs.LogsListResponseDto> {
    if (!payload.data) throw new Exceptions.ControllerError.InternalError("Отсутствуют данные запроса")

    return this.service.list(payload.data)
  }
}
