interface SkillIpcFrameEvent {
  sender: {
    id: number;
    mainFrame: unknown;
  };
  senderFrame: unknown;
}

export function isTrustedSkillMainFrame(
  trustedWebContentsIds: ReadonlySet<number>,
  event: SkillIpcFrameEvent,
): boolean {
  return trustedWebContentsIds.has(event.sender.id)
    && event.senderFrame !== null
    && event.senderFrame === event.sender.mainFrame;
}
