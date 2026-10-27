import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  providerList: {
    gap: 'var(--spacing-2)',
  },
  providerItem: {
    borderWidth: 'var(--border-width)',
    borderStyle: 'solid',
    borderColor: 'var(--color-border-emphasized)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-surface)',
  },
  providerDescription: {
    minWidth: 0,
    overflow: 'hidden',
  },
  providerProtocol: {
    minWidth: 0,
    flexShrink: 1,
  },
  providerBaseURLGroup: {
    minWidth: 0,
    flex: '1 1 auto',
    flexShrink: 1,
  },
  providerCustomModelsGroup: {
    flexShrink: 0,
  },
  providerBaseURL: {
    maxWidth: 'min(34rem, 42vw)',
  },
  providerActions: {
    flexShrink: 0,
  },
  providerPopover: {
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized), var(--shadow-med)',
  },
  formFieldRow: {
    width: '100%',
  },
  formNameField: {
    flex: '1 1 14rem',
    minWidth: 'min(100%, 14rem)',
  },
  formProtocolField: {
    flex: '1 1 18rem',
    minWidth: 'min(100%, 18rem)',
  },
  formApiKeyField: {
    width: '100%',
  },
  formModelInput: {
    minWidth: 'min(100%, 18rem)',
    flex: '1 1 18rem',
  },
  formModelNameInput: {
    minWidth: 'min(100%, 14rem)',
    flex: '1 1 14rem',
  },
  apiKeyVisibilityAddon: {
    backgroundColor: 'var(--color-background-surface)',
  },
  modelHelpTrigger: {
    'display': 'inline-flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'padding': 0,
    'border': 0,
    'borderRadius': 'var(--radius-full)',
    'backgroundColor': 'transparent',
    'color': 'var(--color-icon-secondary)',
    'cursor': 'pointer',
    ':hover': {
      color: 'var(--color-icon-primary)',
    },
    ':focus-visible': {
      outline: '2px solid var(--color-accent)',
      outlineOffset: '2px',
    },
  },
});
