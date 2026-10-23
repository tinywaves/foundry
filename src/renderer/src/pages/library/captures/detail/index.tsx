import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import {
  captureKeys,
  getCapture,
  subscribeToScrapeJobFinished,
} from '@renderer/apis/captures';
import { useI18n } from '@renderer/i18n/use-i18n';

export default function CaptureDetailPage() {
  const { captureId = '' } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);
  const detailQuery = useQuery({
    queryKey: captureKeys.detail(captureId),
    queryFn: () => getCapture(captureId),
    enabled: Boolean(captureId),
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setTitlebarActions(document.getElementById('window-titlebar-actions'));
  }, []);

  useEffect(() => subscribeToScrapeJobFinished((event) => {
    if (event.captureId === captureId && event.status === 'succeeded') {
      void queryClient.invalidateQueries({ queryKey: captureKeys.detail(captureId) });
    }
  }), [captureId, queryClient]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: captureKeys.detail(captureId) });
  };
  const detail = detailQuery.data?.ok ? detailQuery.data.data : null;

  return (
    <>
      {titlebarActions && createPortal(
        <HStack gap={2} vAlign="center">
          <IconButton
            label={t('captures.refresh')}
            tooltip={t('captures.refresh')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            onClick={refresh}
          />
        </HStack>,
        titlebarActions,
      )}
      {detailQuery.isPending
        ? (
            <VStack gap={3} width="100%" maxWidth={960}>
              <Skeleton width={280} height={30} />
              <Skeleton width={420} height={18} index={1} />
              <Skeleton width="100%" height={280} radius={2} index={2} />
            </VStack>
          )
        : (detail
            ? (
                <VStack gap={5} width="100%" maxWidth={960}>
                  <VStack gap={2}>
                    <Heading level={1}>
                      {detail.capture.title || t('navigation.captureDetails')}
                    </Heading>
                    <Link
                      href={detail.capture.url}
                      isExternalLink
                      type="supporting"
                      display="block"
                      maxLines={2}
                    >
                      {detail.capture.url}
                    </Link>
                    <HStack gap={4} wrap="wrap">
                      <Text type="supporting">
                        {`${t('captures.createdAt')}: ${detail.capture.createdAt}`}
                      </Text>
                      <Text type="supporting">
                        {`${t('captures.updatedAt')}: ${detail.capture.updatedAt}`}
                      </Text>
                    </HStack>
                    {detail.capture.userNote && (
                      <Text color="secondary">{detail.capture.userNote}</Text>
                    )}
                  </VStack>
                  <Divider />
                  {detail.content
                    ? (
                        <Card width="100%" padding={5} variant="muted">
                          <Markdown
                            density="compact"
                            headingLevelStart={2}
                            contentWidth={760}
                            onLinkClick={(href, event) => {
                              if (href.startsWith('#')) {
                                return;
                              }
                              event.preventDefault();
                              if (href.startsWith('http://') || href.startsWith('https://')) {
                                window.open(href, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            {detail.content.markdown}
                          </Markdown>
                        </Card>
                      )
                    : (
                        <EmptyState
                          title={t('captures.noContentTitle')}
                          description={t('captures.noContentDescription')}
                        />
                      )}
                </VStack>
              )
            : (
                <EmptyState title={t('captures.detailUnavailable')} />
              ))}
    </>
  );
}
