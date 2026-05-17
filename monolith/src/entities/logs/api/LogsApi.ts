import type { ApiClient } from "@/application/api/ApiClient"

export class LogsApi {
  constructor(private readonly api: ApiClient) {}

  list(): Promise<iSharedLogs.LogsListResponseDto> {
    return this.api.get<iSharedLogs.LogsListResponseDto>({
      path: "/logs",
      commit: "logs/setLogs"
    })
  }
}
