import type { ApiClient } from "@/application/api/ApiClient"

export class SystemApi {
  constructor(private readonly api: ApiClient) {}

  metrics(): Promise<iSharedSystem.RuntimeMetricsListResponseDto> {
    return this.api.get<iSharedSystem.RuntimeMetricsListResponseDto>({
      path: "/system/metrics",
      commit: "system/setMetrics"
    })
  }
}

