declare global {
  namespace iSharedApi {
    interface PaginationPayloadDto {
      limit?: number
      offset?: number
    }

    interface PaginationDto {
      total: number
      limit: number
      offset: number
    }

    interface ErrorDto {
      code: string
      message: string
    }

    type ResponseEnvelope<TResult = unknown> =
      | {
        ok: true
        result: TResult
        error: null
      }
      | {
        ok: false
        result: null
        error: ErrorDto
      }
  }
}

export { }
