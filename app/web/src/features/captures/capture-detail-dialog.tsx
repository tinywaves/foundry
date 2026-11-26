import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Heading, EmptyMessage } from '@/components/workbench';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { RefreshCw as ArrowPathIcon } from 'lucide-react';
import ReactJsonView from '@microlink/react-json-view';
import { captureKeys, getCapture } from './api';
import { useI18n } from '../../i18n';
import { TitlebarActions } from '../../components/titlebar-actions';

export default function CaptureDetailDialog() {
  const { captureId = '' } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { resolvedTheme: mode } = useTheme();
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
        <div className="flex flex-row items-center gap-2">
          <Button onClick={refresh} variant="ghost" size="icon-sm" aria-label={t('captures.refresh')} title={t('captures.refresh')}>
            <ArrowPathIcon />
          </Button>
        </div>
      </TitlebarActions>
      {detailQuery.isPending
        ? (
            <div className="flex flex-col gap-3 w-full">
              <Skeleton className="w-[280px] h-[30px]" />
              <Skeleton className="w-[420px] h-[18px]" />
              <Skeleton className="w-full h-[280px]" />
            </div>
          )
        : (detail
            ? (
                <div className="flex flex-col gap-5 w-full h-full">
                  <div className="flex flex-col gap-2">
                    <Heading level={1}>
                      {detail.capture.title || t('navigation.captureDetails')}
                    </Heading>
                    <a href={detail.capture.url} className="text-primary underline-offset-4 hover:underline break-all">
                      {detail.capture.url}
                    </a>
                    <div className="flex flex-row flex-wrap gap-4">
                      <span className="text-xs text-muted-foreground">
                        {`${t('captures.createdAt')}: ${detail.capture.createdAt}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {`${t('captures.updatedAt')}: ${detail.capture.updatedAt}`}
                      </span>
                    </div>
                    {detail.capture.userNote && (<span className="text-muted-foreground">{detail.capture.userNote}</span>)}
                  </div>
                  <Separator />
                  {rawResponse
                    ? (
                        <div className="min-w-0 flex-1">
                          <Card className="p-5 w-full h-full">
                            <div className="h-full min-h-0 font-mono text-[13px] flex flex-col w-full overflow-auto">
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
                            </div>
                          </Card>
                        </div>
                      )
                    : (<EmptyMessage title={t('captures.noResponseTitle')} description={t('captures.noResponseDescription')} />)}
                </div>
              )
            : (<EmptyMessage title={t('captures.detailUnavailable')} />))}
    </>
  );
}
