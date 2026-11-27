import process from 'node:process';
import { SettingsService } from '../features/settings/service';
import { BundledSkillCopyService } from '../features/settings/skill-copy-service';
import { DataExportService } from '../features/data-export/service';
import { DataImportService } from '../features/data-import/service';
import { InstructionsService } from '../features/instructions/service';
import {
  initializeFoundryStorage,
} from '../storage/index';
import type { FoundryStorage } from '../storage/index';

export interface CliSession {
  storage: FoundryStorage;
  settingsService: SettingsService;
  settingsSkillCopyService: BundledSkillCopyService;
  dataExportService: DataExportService;
  dataImportService: DataImportService;
  instructionsService: InstructionsService;
}

export async function runCliAction(
  action: (session: CliSession) => unknown,
): Promise<void> {
  let session: CliSession | undefined;

  try {
    const storage = initializeFoundryStorage();
    session = {
      storage,
      settingsService: new SettingsService(storage),
      settingsSkillCopyService: new BundledSkillCopyService(),
      dataExportService: new DataExportService(storage),
      dataImportService: new DataImportService(storage),
      instructionsService: new InstructionsService(storage),
    };

    writeJson(await action(session));
  } catch (error) {
    const details = describeCliError(error);
    console.error(JSON.stringify({ error: details }, null, 2));
    process.exitCode = 1;
  } finally {
    session?.storage.close();
  }
}

export function resolvePassphrase(value: string | undefined): string {
  const passphrase = value ?? process.env.FOUNDRY_PASSPHRASE;
  if (!passphrase) {
    throw new CliInputError(
      'PASSPHRASE_REQUIRED',
      'Provide --passphrase or set FOUNDRY_PASSPHRASE',
    );
  }

  return passphrase;
}

export class CliInputError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CliInputError';
  }
}

function writeJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function describeCliError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    return {
      code: readErrorCode(error) ?? 'CLI_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'CLI_ERROR',
    message: String(error),
  };
}

function readErrorCode(error: Error): string | undefined {
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'string' ? code : undefined;
}
