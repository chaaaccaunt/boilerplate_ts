import type { ApiClient } from "@/application/api/ApiClient"

export class LogsApi {
  constructor(private readonly api: ApiClient) {}

  list(payload: iSharedLogs.LogsListPayloadDto = {}): Promise<iSharedLogs.LogsListResponseDto> {
    return this.api.get<iSharedLogs.LogsListResponseDto>({
      path: this.getListPath(payload),
      commit: "logs/setLogs"
    })
  }

  private getListPath(payload: iSharedLogs.LogsListPayloadDto): "/logs" | `/logs?${string}` {
    const params = new URLSearchParams()

    if (payload.limit !== undefined) params.set("limit", String(payload.limit))
    if (payload.offset !== undefined) params.set("offset", String(payload.offset))
    if (payload.level) params.set("level", payload.level)
    if (payload.kind) params.set("kind", payload.kind)
    if (payload.packageUid) params.set("packageUid", payload.packageUid)

    const query = params.toString()
    return query ? `/logs?${query}` : "/logs"
  }
}
