declare module "http" {
  interface IncomingMessage {
    user: iUserToken
    body: Record<any, any>
    scheme?: { [key: string]: iValidator }
    requiredRoles?: iRoleId[]
  }
  interface ServerResponse {
    json: ({ error, status, result, headers }: { error: boolean, status: number, result: any, headers?: OutgoingHttpHeaders }) => void;
  }
}