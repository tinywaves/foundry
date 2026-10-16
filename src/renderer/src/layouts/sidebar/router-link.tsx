import type { ComponentProps, Ref } from 'react';
import { NavLink } from 'react-router-dom';

export default function RouterLink({
  href = '/',
  ref,
  ...props
}: Omit<ComponentProps<typeof NavLink>, 'to'> & {
  href?: string;
  ref?: Ref<HTMLAnchorElement>;
}) {
  return <NavLink ref={ref} to={href} {...props} />;
}
