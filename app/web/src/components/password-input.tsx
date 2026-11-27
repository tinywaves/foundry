import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

export function PasswordInput({
  id,
  disabled,
  ...props
}: Omit<ComponentProps<typeof InputGroupInput>, 'type'>) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = t(isVisible ? 'a11y.hidePassword' : 'a11y.showPassword');

  return (
    <InputGroup data-disabled={disabled}>
      <InputGroupInput
        {...props}
        id={inputId}
        type={isVisible ? 'text' : 'password'}
        disabled={disabled}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-xs"
          aria-label={toggleLabel}
          aria-controls={inputId}
          title={toggleLabel}
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
