import { Exceptions, MicroServiceController, WebSocketServer } from "@/libs"

export class FileEventsController extends MicroServiceController {
  private readonly allowedEventNames: readonly iSharedFiles.FilesRealtimeEventName[] = [
    "files:file:created",
    "files:file:updated",
    "files:file:deleted",
    "files:folder:created",
    "files:folder:updated",
    "files:folder:deleted"
  ]

  constructor(private readonly webSocketServer: WebSocketServer) {
    super()

    const notifyRoute: iContracts.iMicroServiceRoute<iSharedFiles.FilesRealtimeEventDto, { delivered: true }> = {
      url: /^POST:\/files\/events\/?$/,
      method: "POST",
      callback: this.handle(this.constructor.name, "notify", this.notify.bind(this))
    }

    this.addRoutes([notifyRoute])
  }

  private notify(payload: iContracts.iMicroServiceRequestPayload<iSharedFiles.FilesRealtimeEventDto>): Promise<{ delivered: true }> {
    const event = this.getEventPayload(payload.data)

    this.webSocketServer.broadcast(event.eventName, {
      changedAt: event.changedAt
    } satisfies iSharedFiles.FilesRealtimeEventPayloadDto)

    return Promise.resolve({
      delivered: true
    })
  }

  private getEventPayload(payload: iSharedFiles.FilesRealtimeEventDto | undefined): iSharedFiles.FilesRealtimeEventDto {
    if (!payload) throw new Exceptions.ServiceError.ConflictError("Отсутствуют данные файлового события")
    if (!this.allowedEventNames.includes(payload.eventName)) {
      throw new Exceptions.ServiceError.ConflictError("Некорректный тип файлового события")
    }
    if (!payload.changedAt) {
      throw new Exceptions.ServiceError.ConflictError("Некорректное время файлового события")
    }

    return payload
  }
}
