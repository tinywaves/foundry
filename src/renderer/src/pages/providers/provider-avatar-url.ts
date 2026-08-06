import type { ProviderAvatar } from '../../../../shared/provider-contract';

export function createProviderAvatarUrl(avatar: ProviderAvatar): string {
  const bytes = new Uint8Array(avatar.bytes.byteLength);
  bytes.set(avatar.bytes);
  return URL.createObjectURL(new Blob([bytes.buffer], { type: avatar.mimeType }));
}
