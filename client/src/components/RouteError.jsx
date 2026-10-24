import { useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Graceful fallback for a route that crashes while rendering — without
// this, react-router unmounts the whole app to a blank white page.
const RouteError = () => {
  const error = useRouteError();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        This page hit an unexpected error
        {error?.statusText ? ` (${error.statusText})` : ""}. Try reloading —
        if it keeps happening, please come back later.
      </p>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
    </div>
  );
};

export default RouteError;
