declare global {
  namespace iSharedServiceToken {
    type ServiceTokenType = "service" | "messenger" | "social_network"

    interface ServiceTokenDto {
      uid: string
      type: ServiceTokenType
      serviceName: string
      displayName: string
      tokenPreview: string
      isEnabled: boolean
      createdAt: string
      updatedAt: string
    }

    interface ListServiceTokensResponseDto {
      tokens: ServiceTokenDto[]
    }

    interface CreateServiceTokenPayloadDto {
      type: ServiceTokenType
      serviceName: string
      displayName: string
      token: string
      isEnabled: boolean
    }

    type CreateServiceTokenResponseDto = ServiceTokenDto

    interface UpdateServiceTokenPayloadDto {
      uid: string
      type: ServiceTokenType
      serviceName: string
      displayName: string
      token?: string
      isEnabled: boolean
    }

    type UpdateServiceTokenResponseDto = ServiceTokenDto

    interface DeleteServiceTokenPayloadDto {
      uid: string
    }

    interface DeleteServiceTokenResponseDto {
      uid: string
    }
  }
}

export { }
