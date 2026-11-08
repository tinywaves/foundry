import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { useTheme } from '@astryxdesign/core/theme';
import * as stylex from '@stylexjs/stylex';
import ReactJsonView from '@microlink/react-json-view';
import {
  captureKeys,
  getCapture,
} from './api';
import { useI18n } from '../../i18n';
import { TitlebarActions } from '../../components/titlebar-actions';

const styles = stylex.create({
  jsonViewport: {
    height: '100%',
    minHeight: 0,
    fontFamily: 'ui-monospace, "SF Mono", Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: '13px',
  },
});

export default function CaptureDetailDialog() {
  const { captureId = '' } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { mode } = useTheme();
  const detailQuery = useQuery({
    queryKey: captureKeys.detail(captureId),
    queryFn: () => getCapture(captureId),
    enabled: Boolean(captureId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: captureKeys.detail(captureId) });
  };
  const detail = detailQuery.data?.ok ? detailQuery.data.data : null;
  const rawResponse = detail?.rawResponse
    && typeof detail.rawResponse === 'object'
    ? detail.rawResponse
    : null;

  return (
    <>
      <TitlebarActions>
        <HStack gap={2} vAlign="center">
          <IconButton
            label={t('captures.refresh')}
            tooltip={t('captures.refresh')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            onClick={refresh}
          />
        </HStack>
      </TitlebarActions>
      {detailQuery.isPending
        ? (
            <VStack gap={3} width="100%">
              <Skeleton width={280} height={30} />
              <Skeleton width={420} height={18} index={1} />
              <Skeleton width="100%" height={280} radius={2} index={2} />
            </VStack>
          )
        : (detail
            ? (
                <VStack gap={5} width="100%" height="100%">
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
                  {rawResponse
                    ? (
                        <StackItem size="fill">
                          <Card width="100%" height="100%" padding={5} variant="muted">
                            <VStack
                              width="100%"
                              height="100%"
                              minHeight={0}
                              isScrollable
                              xstyle={styles.jsonViewport}
                            >
                              <ReactJsonView
                                src={rawResponse}
                                name={false}
                                theme={mode === 'dark' ? 'twilight' : 'rjv-default'}
                                iconStyle="square"
                                indentWidth={2}
                                collapsed={false}
                                collapseStringsAfterLength={false}
                                enableClipboard
                                displayObjectSize
                                displayDataTypes
                                onEdit={false}
                                onAdd={false}
                                onDelete={false}
                                onSelect={false}
                                style={{
                                  minHeight: '100%',
                                  flexShrink: 0,
                                  backgroundColor: 'transparent',
                                }}
                              />
                            </VStack>
                          </Card>
                        </StackItem>
                      )
                    : (
                        <EmptyState
                          title={t('captures.noResponseTitle')}
                          description={t('captures.noResponseDescription')}
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
