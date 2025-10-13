import { iRoute } from "@/libs";

export class TestController {
  readonly routes: iRoute[] = [
    {
      url: "/",
      method: "GET",
      requireAuth: false,
      callback: this.getList.bind(this)
    } as iRoute<undefined, []>
  ]
  constructor() { }
  getList(): Promise<{ result: [] }> {
    return new Promise((resolve, reject) => {
      return resolve({ result: [] })
    })
  }
}