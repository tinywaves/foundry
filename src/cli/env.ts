import process from 'node:process';

export const isDevelopment = process.env.FOUNDRY_DEV === 'true';
