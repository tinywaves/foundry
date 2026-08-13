import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { providerRuntimeLabels } from '../providers/provider-runtime';
import {
  getInitialRuntimeApplyDialogState,
  getRuntimeApplyDialogStateFromChatGptState,
  getRuntimeApplyRestartResolution,
  runtimeApplyResultTitles,
} from './runtime-apply-result';
import type {
  RuntimeApplyDialogState,
  RuntimeApplyManualReason,
  RuntimeApplyResult,
} from './runtime-apply-result';
import {
  getChatGptApplicationState,
  restartChatGptApplication,
} from './runtime-query';

interface RuntimeApplyResultDialogProps {
  result: RuntimeApplyResult;
  onClose: () => void;
}

function getSuccessDescription(result: RuntimeApplyResult): string {
  const runtimeLabel = providerRuntimeLabels[result.runtime];
  switch (result.source) {
    case 'provider-applied': {
      return `${runtimeLabel} now uses the selected Provider configuration.`;
    }
    case 'defaults-restored': {
      return `Official Default configuration was restored for ${runtimeLabel}.`;
    }
    case 'provider-updated-and-applied': {
      return `The updated Provider configuration was written for ${runtimeLabel}.`;
    }
  }
}

function ManualRestartGuidance({ reason }: { reason: RuntimeApplyManualReason }) {
  switch (reason) {
    case 'claude-code': {
      return (
        <Text type="body" textWrap="pretty">
          Restart existing Claude Code CLI sessions manually to load this configuration.
        </Text>
      );
    }
    case 'initial-not-running': {
      return (
        <Banner
          status="info"
          title="ChatGPT isn't running"
          description="ChatGPT will load this configuration the next time you open it."
        />
      );
    }
    case 'restart-not-running': {
      return (
        <Banner
          status="info"
          title="ChatGPT exited before restart began"
          description="ChatGPT will load this configuration the next time you open it."
        />
      );
    }
    case 'quit-failed': {
      return (
        <Banner
          status="warning"
          title="ChatGPT couldn't restart"
          description="Quit and reopen the ChatGPT desktop app manually to load this configuration."
        />
      );
    }
    case 'reopen-failed': {
      return (
        <Banner
          status="warning"
          title="ChatGPT couldn't reopen"
          description="ChatGPT exited, but Foundry couldn't reopen it. Open the ChatGPT desktop app manually to load this configuration."
        />
      );
    }
    case 'unavailable': {
      return (
        <Banner
          status="warning"
          title="Automatic restart is unavailable"
          description="Restart the ChatGPT desktop app manually to load this configuration."
        />
      );
    }
  }
}

function CodexCliGuidance() {
  return (
    <Text type="supporting" color="secondary" textWrap="pretty">
      Existing Codex CLI sessions must be restarted manually to load this configuration.
    </Text>
  );
}

function getRestartGuidance(dialogState: RuntimeApplyDialogState): ReactNode {
  switch (dialogState.status) {
    case 'checking': {
      return (
        <VStack gap={3} hAlign="center" padding={6}>
          <Spinner label="Checking ChatGPT..." />
        </VStack>
      );
    }
    case 'restart-available': {
      return (
        <Banner
          status="warning"
          title="Restart ChatGPT to load changes"
          description="Codex is hosted by the ChatGPT desktop app. Restarting the entire application may interrupt work in its Chat, Work, and Codex views."
        />
      );
    }
    case 'restarting': {
      return (
        <Text type="body" textWrap="pretty">
          ChatGPT is restarting. Keep Foundry open until this finishes.
        </Text>
      );
    }
    case 'manual': {
      return <ManualRestartGuidance reason={dialogState.reason} />;
    }
  }
}

function preserveRequiredDialog(): void {
  // Required results are acknowledged only through their footer actions.
}

export function RuntimeApplyResultDialog({ result, onClose }: RuntimeApplyResultDialogProps) {
  const showToast = useToast();
  const isRestartInFlightRef = useRef(false);
  const [dialogState, setDialogState] = useState<RuntimeApplyDialogState>(() => (
    getInitialRuntimeApplyDialogState(result.runtime)
  ));

  useEffect(() => {
    if (result.runtime !== 'codex') {
      return;
    }
    let isActive = true;
    void getChatGptApplicationState()
      .then((state) => {
        if (isActive) {
          setDialogState(getRuntimeApplyDialogStateFromChatGptState(state));
        }
      })
      .catch(() => {
        if (isActive) {
          setDialogState({ status: 'manual', reason: 'unavailable' });
        }
      });
    return () => {
      isActive = false;
    };
  }, [result.runtime]);

  const handleRestart = useCallback(async () => {
    if (dialogState.status !== 'restart-available' || isRestartInFlightRef.current) {
      return;
    }
    isRestartInFlightRef.current = true;
    setDialogState({ status: 'restarting' });
    try {
      const resolution = getRuntimeApplyRestartResolution(
        await restartChatGptApplication(),
      );
      if (resolution.status === 'restarted') {
        onClose();
        showToast({ body: 'ChatGPT restarted', uniqueID: 'chatgpt-restarted' });
        return;
      }
      setDialogState(resolution);
    } catch {
      setDialogState({ status: 'manual', reason: 'unavailable' });
    } finally {
      isRestartInFlightRef.current = false;
    }
  }, [dialogState.status, onClose, showToast]);

  let footer: ReactNode;
  switch (dialogState.status) {
    case 'checking': {
      footer = null;
      break;
    }
    case 'restart-available': {
      footer = (
        <LayoutFooter hasDivider>
          <HStack gap={2} hAlign="end">
            <Button label="Restart Later" variant="ghost" onClick={onClose} />
            <Button label="Restart ChatGPT" variant="primary" onClick={handleRestart} />
          </HStack>
        </LayoutFooter>
      );
      break;
    }
    case 'restarting': {
      footer = (
        <LayoutFooter hasDivider>
          <HStack hAlign="end">
            <Button label="Restart ChatGPT" variant="primary" isLoading />
          </HStack>
        </LayoutFooter>
      );
      break;
    }
    case 'manual': {
      footer = (
        <LayoutFooter hasDivider>
          <HStack hAlign="end">
            <Button label="Got It" variant="primary" onClick={onClose} />
          </HStack>
        </LayoutFooter>
      );
      break;
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={preserveRequiredDialog}
      purpose="required"
      width={560}
    >
      <Layout
        header={<DialogHeader title={runtimeApplyResultTitles[result.source]} />}
        content={(
          <LayoutContent isScrollable>
            <VStack gap={4} width="100%">
              <Banner
                status="success"
                title="Configuration written successfully"
                description={getSuccessDescription(result)}
              />
              {getRestartGuidance(dialogState)}
              {result.runtime === 'codex' && <CodexCliGuidance />}
            </VStack>
          </LayoutContent>
        )}
        footer={footer}
      />
    </Dialog>
  );
}
