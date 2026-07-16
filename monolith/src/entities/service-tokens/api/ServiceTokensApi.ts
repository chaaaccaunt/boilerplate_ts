import type { ApiClient } from "@/application/api/ApiClient"

export class ServiceTokensApi {
  constructor(private readonly api: ApiClient) { }

  list(): Promise<iSharedServiceToken.ListServiceTokensResponseDto> {
    return this.api.get<iSharedServiceToken.ListServiceTokensResponseDto>({
      path: "/service-tokens",
      commit: "serviceTokens/setTokens"
    })
  }

  create(payload: iSharedServiceToken.CreateServiceTokenPayloadDto): Promise<iSharedServiceToken.CreateServiceTokenResponseDto> {
    return this.api.post<iSharedServiceToken.CreateServiceTokenResponseDto, iSharedServiceToken.CreateServiceTokenPayloadDto>({
      path: "/service-tokens",
      payload,
      commit: "serviceTokens/addToken"
    })
  }

  update(payload: iSharedServiceToken.UpdateServiceTokenPayloadDto): Promise<iSharedServiceToken.UpdateServiceTokenResponseDto> {
    return this.api.patch<iSharedServiceToken.UpdateServiceTokenResponseDto, iSharedServiceToken.UpdateServiceTokenPayloadDto>({
      path: "/service-tokens",
      payload,
      commit: "serviceTokens/updateToken"
    })
  }

  delete(payload: iSharedServiceToken.DeleteServiceTokenPayloadDto): Promise<iSharedServiceToken.DeleteServiceTokenResponseDto> {
    return this.api.delete<iSharedServiceToken.DeleteServiceTokenResponseDto, iSharedServiceToken.DeleteServiceTokenPayloadDto>({
      path: "/service-tokens",
      payload,
      commit: "serviceTokens/deleteToken"
    })
  }
}
