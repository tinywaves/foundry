export function getEmptyTrashDescription(count: number): string {
  const label = count === 1 ? 'Prompt is' : 'Prompts are';
  const pronoun = count === 1 ? 'It' : 'They';
  return `${count} ${label} in Trash. ${pronoun} will no longer be accessible in Foundry. This can't be undone.`;
}

export function getEmptyTrashSuccessMessage(count: number): string {
  const label = count === 1 ? 'Prompt' : 'Prompts';
  return `Removed ${count} ${label} from Trash.`;
}
