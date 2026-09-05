import { EyeIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps } from 'react';
import { useState } from 'react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group';

export function SecretInput({
  value,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { value: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        type={isVisible ? 'text' : 'password'}
        value={value}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label={isVisible ? 'Hide API Key' : 'Show API Key'}
          size="icon-xs"
          onClick={() => setIsVisible((visible) => !visible)}
        >
          <HugeiconsIcon
            icon={isVisible ? ViewOffSlashIcon : EyeIcon}
            strokeWidth={2}
          />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
