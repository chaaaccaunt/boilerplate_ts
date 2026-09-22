export function runLimited<T>(tasks: ReadonlyArray<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = []
  let nextTaskIndex = 0

  const runNext = (): Promise<void> => {
    const taskIndex = nextTaskIndex
    nextTaskIndex += 1

    const task = tasks[taskIndex]
    if (!task) return Promise.resolve()

    return task()
      .then((result) => {
        results[taskIndex] = result
      })
      .then(runNext)
  }

  return Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, runNext))
    .then(() => results)
}
