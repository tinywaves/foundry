import { useEffect, useState } from 'react';
import { checkServiceHealth } from './health-client';
import type { ServiceConnection } from './health-client';

function getConnectionCopy(connection?: ServiceConnection): {
  message: string;
  title: string;
} {
  if (!connection) {
    return {
      title: 'Checking service...',
      message: 'Connecting to the local Foundry server.',
    };
  }

  if (connection.state === 'connected') {
    return { title: 'Service connected', message: connection.message };
  }

  return { title: 'Connection unavailable', message: connection.message };
}

const App = () => {
  const [connection, setConnection] = useState<ServiceConnection | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    void checkServiceHealth(fetch, controller.signal).then((result) => {
      if (isActive) {
        setConnection(result);
      }
    });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  const state = connection?.state ?? 'checking';
  const { message, title } = getConnectionCopy(connection);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Foundry</h1>
      </header>

      <section className="status-region" aria-labelledby="service-status-title">
        <div className="service-status" data-state={state} aria-live="polite">
          <span className="status-indicator" aria-hidden="true" />
          <div>
            <p className="status-label">Local service</p>
            <h2 id="service-status-title">{title}</h2>
            <p className="status-message">{message}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default App;
