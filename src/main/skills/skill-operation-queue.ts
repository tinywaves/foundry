export class SkillOperationQueue {
  private tail: Promise<undefined> = Promise.resolve(undefined);

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    const gate = Promise.withResolvers<undefined>();
    this.tail = gate.promise;
    await previous;
    try {
      return await operation();
    } finally {
      gate.resolve(undefined);
    }
  }
}
