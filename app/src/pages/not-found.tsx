import { Link } from 'react-router';

import { PagePlaceholder } from '#/components/page-placeholder';
import { Button } from '#/components/ui/button';

export function NotFoundPage() {
  return (
    <PagePlaceholder
      title="Page not found"
      description="The page you requested does not exist."
      action={
        (
          <Button nativeButton={false} render={<Link to="/dashboard" />}>
            Back to dashboard
          </Button>
        )
      }
    />
  );
}
