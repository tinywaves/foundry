import Page from './app/page';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  return (
    <TooltipProvider>
      <Page />
    </TooltipProvider>
  );
}
