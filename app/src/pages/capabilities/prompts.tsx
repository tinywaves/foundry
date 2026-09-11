import type { PromptSummary } from '@dhzh/foundry-api-contract';
import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  EyeIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from 'cn';

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
} from '#/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty';
import { Input } from '#/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover';
import { Skeleton } from '#/components/ui/skeleton';
import { Spinner } from '#/components/ui/spinner';
import { toast } from '#/components/ui/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { useDeletePrompt, usePrompt, usePrompts } from '#/hooks/use-prompts';
import { copyPromptContent } from '#/pages/capabilities/prompt-copy';
import { PromptDialog } from '#/pages/capabilities/prompt-dialog';

interface PromptDialogTarget {
  promptId: string | null;
}

function PromptCard({ prompt, onOpen }: {
  prompt: PromptSummary;
  onOpen: () => void;
}) {
  const summary = prompt.description
    ? `${prompt.title} · ${prompt.description}`
    : prompt.title;
  const summaryRef = useRef<HTMLSpanElement>(null);
  const [isSummaryTruncated, setIsSummaryTruncated] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const promptQuery = usePrompt(prompt.id, false);
  const promptDeletion = useDeletePrompt(prompt.id);

  useEffect(() => {
    const summaryElement = summaryRef.current;
    if (!summaryElement) {
      return;
    }

    const updateTruncation = () => {
      setIsSummaryTruncated(summaryElement.scrollWidth > summaryElement.clientWidth);
    };

    const frame = requestAnimationFrame(updateTruncation);
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(summaryElement);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [summary]);

  async function copyContent() {
    setIsCopying(true);
    try {
      const result = await promptQuery.refetch();
      if (!result.data) {
        toast.add({ title: 'Prompt could not be copied', type: 'error' });
        return;
      }
      await copyPromptContent(result.data.content);
    } catch {
      toast.add({ title: 'Prompt could not be copied', type: 'error' });
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Card data-testid={`prompt-${prompt.id}`} size="sm">
      <CardHeader className="has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1">
          <Tooltip disabled={!isSummaryTruncated}>
            <TooltipTrigger
              render={(
                <span
                  ref={summaryRef}
                  className="block w-full min-w-0 truncate font-heading text-sm font-medium leading-5"
                  data-testid={`prompt-title-${prompt.id}`}
                />
              )}
            >
              {summary}
            </TooltipTrigger>
            <TooltipContent className="max-w-lg wrap-break-word text-start">
              {summary}
            </TooltipContent>
          </Tooltip>
          <CardDescription
            className="w-full truncate font-mono leading-5"
            data-testid={`prompt-content-${prompt.id}`}
          >
            {prompt.excerpt}
          </CardDescription>
        </div>

        <CardAction className="flex items-center gap-1 self-center">
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`View ${prompt.title}`}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={onOpen}
                />
              )}
            >
              <HugeiconsIcon icon={EyeIcon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`Edit ${prompt.title}`}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={onOpen}
                />
              )}
            >
              <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`Copy ${prompt.title}`}
                  disabled={isCopying}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => void copyContent()}
                />
              )}
            >
              {isCopying
                ? <Spinner />
                : <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />}
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Popover open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <PopoverTrigger
              render={(
                <Button
                  aria-label={`Delete ${prompt.title}`}
                  size="icon"
                  type="button"
                  variant="destructive"
                />
              )}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </PopoverTrigger>
            <PopoverContent align="end">
              <PopoverHeader>
                <PopoverTitle>Delete Prompt?</PopoverTitle>
                <PopoverDescription>
                  This Prompt will be removed from Foundry. This action cannot be undone in the app.
                </PopoverDescription>
              </PopoverHeader>
              <div className="flex justify-end gap-2">
                <Button
                  disabled={promptDeletion.isPending}
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={promptDeletion.isPending}
                  type="button"
                  variant="destructive"
                  onClick={() => promptDeletion.mutate(undefined, {
                    onError: () => {
                      toast.add({ title: 'Prompt could not be deleted', type: 'error' });
                    },
                    onSuccess: () => {
                      setIsDeleteOpen(false);
                      toast.add({ title: 'Prompt deleted', type: 'success' });
                    },
                  })}
                >
                  {promptDeletion.isPending && <Spinner data-icon="inline-start" />}
                  <span>Delete</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function PromptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogTarget, setDialogTarget] = useState<PromptDialogTarget | null>(null);
  const query = searchParams.get('query') ?? '';
  const [isSearchOpen, setIsSearchOpen] = useState(query !== '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusSearchRef = useRef(false);
  const prompts = usePrompts({ query });

  useEffect(() => {
    if (!isSearchOpen || !shouldFocusSearchRef.current) {
      return;
    }
    shouldFocusSearchRef.current = false;
    searchInputRef.current?.focus();
  }, [isSearchOpen]);

  function updateQuery(value: string) {
    setSearchParams(value ? { query: value } : {}, { replace: true });
  }

  function openSearch() {
    shouldFocusSearchRef.current = true;
    setIsSearchOpen(true);
  }

  return (
    <main className="flex w-full min-w-0 flex-col gap-5 pb-12">
      <header className="flex min-w-0 items-center gap-2">
        <div
          className={cn(
            'relative h-7 min-w-7 shrink transition-[width] duration-200 ease-out',
            isSearchOpen ? 'w-full sm:w-72' : 'w-7',
          )}
        >
          {isSearchOpen
            ? (
                <>
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-s-2 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
                    icon={Search01Icon}
                    strokeWidth={2}
                  />
                  <Input
                    ref={searchInputRef}
                    aria-label="Search Prompts"
                    className="ps-7"
                    placeholder="Search Prompts"
                    value={query}
                    onBlur={(event) => {
                      if (event.currentTarget.value === '') {
                        setIsSearchOpen(false);
                      }
                    }}
                    onChange={(event) => updateQuery(event.target.value)}
                  />
                </>
              )
            : (
                <Button
                  aria-expanded="false"
                  aria-label="Search Prompts"
                  size="icon"
                  type="button"
                  variant="outline"
                  onClick={openSearch}
                >
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                </Button>
              )}
        </div>
        <Button
          className="shrink-0"
          type="button"
          onClick={() => setDialogTarget({ promptId: null })}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
          Add Prompt
        </Button>
      </header>

      {prompts.isPending && (
        <div
          aria-label="Loading Prompts"
          className="flex flex-col gap-4"
          role="status"
        >
          <Skeleton className="h-17 w-full" />
          <Skeleton className="h-17 w-full" />
          <Skeleton className="h-17 w-full" />
        </div>
      )}

      {prompts.isError && (
        <Alert variant="destructive">
          <AlertTitle>Prompts could not be loaded</AlertTitle>
          <AlertDescription>Check the Foundry Server and try again.</AlertDescription>
        </Alert>
      )}

      {prompts.data?.items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle aria-level={2} role="heading">
              {query ? 'No matching Prompts' : 'No Prompts'}
            </EmptyTitle>
            <EmptyDescription>
              {query ? 'Try a different search.' : 'Save a reusable text fragment.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {prompts.data && prompts.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {prompts.data.items.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onOpen={() => setDialogTarget({ promptId: prompt.id })}
            />
          ))}
        </div>
      )}

      {dialogTarget && (
        <PromptDialog
          promptId={dialogTarget.promptId}
          onClose={() => setDialogTarget(null)}
        />
      )}
    </main>
  );
}
