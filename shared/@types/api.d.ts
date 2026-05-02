declare global {
  namespace iSharedApi {
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
