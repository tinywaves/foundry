import { useI18n } from '../i18n';
import { useId } from 'react';
import type { ComponentProps, ElementType, ReactElement, ReactNode } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogClose } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from './ui/empty';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { cn } from '../lib/utils';

type FieldProps = Omit<ComponentProps<'input'>, 'onChange' | 'size'> & {
  label: string;
  description?: string;
  isLabelHidden?: boolean;
  size?: 'sm';
  isRequired?: boolean;
  isOptional?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  hasAutoFocus?: boolean;
  hasClear?: boolean;
  width?: string | number;
  status?: { type: string; message: string };
  startIcon?: ElementType;
  onChange?: (value: string) => void;
  onEnter?: () => void;
  onClear?: () => void;
};

export function FormInput({ label, description, isLabelHidden, size: _size, isRequired, isOptional: _optional, isDisabled, isLoading, hasAutoFocus, hasClear, width, status, startIcon: StartIcon, onChange, onEnter, onClear, className, id: suppliedId, onKeyDown, ...props }: FieldProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)} style={width ? { width, maxWidth: '100%' } : undefined}>
      <Label htmlFor={id} className={isLabelHidden ? 'sr-only' : undefined}>
        <span>{label}</span>
        {isRequired && <span aria-hidden="true"> *</span>}
      </Label>
      <div className="relative flex items-center gap-1">
        {StartIcon && <StartIcon aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />}
        <Input
          {...props}
          id={id}
          className={cn('w-full', StartIcon && 'pl-9', hasClear && 'pr-9')}
          required={isRequired}
          disabled={isDisabled || isLoading}
          autoFocus={hasAutoFocus}
          aria-invalid={Boolean(status)}
          aria-describedby={description || status ? `${id}-description` : undefined}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented && event.key === 'Enter' && !event.nativeEvent.isComposing) {
              onEnter?.();
            }
          }}
        />
        {hasClear && Boolean(props.value) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1"
            aria-label={`${t('common.clear')} ${label}`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange?.('');
              onClear?.();
            }}
          >
            <X />
          </Button>
        )}
      </div>
      {(description || status) && <p id={`${id}-description`} role={status ? 'alert' : undefined} className={cn('text-xs text-muted-foreground', status && 'text-destructive')}>{status?.message ?? description}</p>}
    </div>
  );
}

type SelectOption = { value: string; label: string } | { type: 'section'; title: string; options: Array<{ value: string; label: string }> };
export function SelectField({ label, isLabelHidden, options, value, onChange, isDisabled, isRequired, width, className, renderValue, size, variant: _variant }: {
  label: string;
  isLabelHidden?: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  width?: string | number;
  className?: string;
  renderValue?: () => ReactNode;
  size?: 'sm';
  variant?: string;
}) {
  const id = useId();
  const items = options.flatMap((o) => ('options' in o ? o.options : [o]));
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)} style={width ? { width, maxWidth: '100%' } : undefined}>
      <Label htmlFor={id} className={isLabelHidden ? 'sr-only' : undefined}>
        <span>{label}</span>
        {isRequired && <span aria-hidden="true"> *</span>}
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) {
            onChange(next);
          }
        }}
        disabled={isDisabled}
        required={isRequired}
        items={items}
      >
        <SelectTrigger id={id} size={size} className="w-full min-w-0">
          <SelectValue>{renderValue ? renderValue() : undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => ('options' in option
            ? (
                <SelectGroup key={option.title}>
                  <SelectLabel>{option.title}</SelectLabel>
                  {option.options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectGroup>
              )
            : <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ToggleField({ label, value, onChange, isDisabled, isLabelHidden, size }: {
  label: string;
  value: boolean;
  onChange: (isChecked: boolean) => void;
  isDisabled?: boolean;
  isLabelHidden?: boolean;
  size?: 'sm';
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={value} onCheckedChange={onChange} disabled={isDisabled} size={size} />
      <Label htmlFor={id} className={isLabelHidden ? 'sr-only' : undefined}>{label}</Label>
    </div>
  );
}
export function CheckField({ label, value, onChange, size: _size, description, isDisabled }: {
  label: string;
  value: boolean;
  onChange: (isChecked: boolean) => void;
  size?: 'sm';
  description?: string;
  isDisabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={value} onCheckedChange={(checked) => onChange(checked)} disabled={isDisabled} />
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs wrap-anywhere text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
export function Modal({ isOpen, onOpenChange, children, width = 520, className, purpose, padding: _padding, position: _position, 'aria-label': label }: {
  'isOpen': boolean;
  'onOpenChange': (isOpen: boolean) => void;
  'children': ReactNode;
  'width'?: number;
  'className'?: string;
  'purpose'?: string;
  'padding'?: number;
  'position'?: object;
  'aria-label'?: string;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} disablePointerDismissal={purpose === 'required'}>
      <DialogContent style={{ width, maxWidth: 'calc(100vw - 2rem)' }} className={cn('max-h-[calc(100dvh-2rem)] overflow-y-auto', className)} showCloseButton={false}>
        {label && <DialogTitle className="sr-only">{label}</DialogTitle>}
        {children}
        {purpose !== 'required' && (
          <DialogClose render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4 bg-secondary" />} aria-label={t('common.close')}>
            <X />
          </DialogClose>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function Hint({ content, children }: { content: ReactNode; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
export function ActionPopover({ children, content, label, isOpen, onOpenChange, isEnabled = true, placement, alignment }: {
  children: ReactElement;
  content: ReactNode;
  label: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isEnabled?: boolean;
  placement?: string;
  alignment?: string;
}) {
  return (
    <Popover
      open={isOpen}
      onOpenChange={(isOpen, details) => {
        if (isEnabled || details.reason !== 'trigger-press') {
          onOpenChange(isOpen);
        }
      }}
    >
      <PopoverTrigger render={children} />
      <PopoverContent side={placement === 'below' ? 'bottom' : undefined} align={alignment === 'start' ? 'start' : undefined}>
        <PopoverTitle className="sr-only">{label}</PopoverTitle>
        {content}
      </PopoverContent>
    </Popover>
  );
}
export function Notice({ title, description, status }: { title: string; description: string; status?: string }) {
  return (
    <Alert variant={status === 'error' ? 'destructive' : 'default'}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
export function EmptyMessage({ title, description }: { title: string; description?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}
export function Heading({ level, children }: { level: 1 | 2 | 3; children: ReactNode }) {
  const Tag = ({ 1: 'h1', 2: 'h2', 3: 'h3' } as const)[level];
  return <Tag className="text-xl font-semibold tracking-tight">{children}</Tag>;
}
export function FieldGroup({ label, children, isRequired, size: _size, className }: { label: string; children: ReactNode; isRequired?: boolean; size?: string; className?: string }) {
  return (
    <fieldset className={cn('min-w-0 space-y-2', className)}>
      <legend className="mb-2 text-sm font-medium">
        <span>{label}</span>
        {isRequired && <span aria-hidden="true"> *</span>}
      </legend>
      <div className="flex items-center gap-1 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1">{children}</div>
    </fieldset>
  );
}
export function FieldAddon({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
export function IconGlyph({ icon: Icon, ...props }: { icon: ElementType; className?: string }) {
  return typeof Icon === 'string' ? <ChevronRight {...props} /> : <Icon aria-hidden="true" {...props} />;
}
export function FilterTabs({ label, value, onChange, children, size: _size }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; size?: string }) {
  return (
    <Tabs value={value} onValueChange={(value) => onChange(String(value))}>
      <TabsList aria-label={label} className="max-w-full">{children}</TabsList>
    </Tabs>
  );
}
export function FilterTab({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <TabsTrigger value={value}>
      {icon != null && <span className="size-4">{icon}</span>}
      <span>{label}</span>
    </TabsTrigger>
  );
}
export type DataColumn<T> = { key: string; header: string; width?: number | string; align?: 'end'; renderCell: (record: T) => ReactNode };
export function DataTable<T>({ data, columns, idKey, stickyEndKeys = [] }: { data: T[]; columns: Array<DataColumn<T>>; idKey: keyof T; stickyEndKeys?: string[] }) {
  return (
    <Table className="min-w-[760px]">
      <TableHeader>
        <TableRow>{columns.map((column) => <TableHead key={column.key} style={{ width: column.width }} className={cn(column.align === 'end' && 'text-right', stickyEndKeys.includes(column.key) && 'sticky right-0 bg-background')}>{column.header}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>{data.map((row) => <TableRow key={String(row[idKey])}>{columns.map((column) => <TableCell key={column.key} className={cn('max-w-[320px]', stickyEndKeys.includes(column.key) && 'sticky right-0 bg-background')}>{column.renderCell(row)}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  );
}

export function RecordRow({ label, description, startContent, endContent, isSelected, className, onClick, ...props }: Omit<ComponentProps<'div'>, 'onClick'> & {
  label: ReactNode;
  description?: ReactNode;
  startContent?: ReactNode;
  endContent?: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      {startContent}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-sm font-medium">{label}</div>
        {description != null && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {endContent}
    </>
  );
  return onClick
    ? (
        <div {...props} className={className}>
          <Button variant={isSelected ? 'secondary' : 'ghost'} onClick={onClick} className="h-auto w-full justify-start whitespace-normal p-3 text-start">
            <span>{body}</span>
          </Button>
        </div>
      )
    : <div {...props} className={cn('flex min-w-0 items-center gap-3 p-4 max-[600px]:flex-wrap', className)}>{body}</div>;
}
