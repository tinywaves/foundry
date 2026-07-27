import Table from 'cli-table3';
import { consola } from 'consola';

type LogArguments = Parameters<typeof consola.log>;
type RawLogArguments = Parameters<typeof consola.log.raw>;

export const output = {
  log(...args: LogArguments): void {
    consola.log(...args);
  },

  raw(...args: RawLogArguments): void {
    consola.log.raw(...args);
  },

  table(headers: readonly string[], rows: readonly string[][]): void {
    const table = new Table({ head: [...headers] });

    for (const row of rows) {
      table.push([...row]);
    }

    consola.log(table.toString());
  },

  info(...args: Parameters<typeof consola.info>): void {
    consola.info(...args);
  },

  error(...args: Parameters<typeof consola.error>): void {
    consola.error(...args);
  },
};
