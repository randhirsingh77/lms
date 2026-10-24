import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store";
import { Toaster } from "./components/ui/sonner";
import { useLoadUserQuery } from "./features/api/authApi";
import LoadingSpinner from "./components/LoadingSpinner";

// Session gate: the app renders only once the /profile probe settles, so a
// hard refresh on a protected page restores the session IN PLACE instead
// of bouncing through /login. A 401 is a definitive "logged out" and
// renders immediately — but a network error or 5xx usually means the
// (free-tier) API is still waking up; the old code treated that exactly
// like "logged out", so refreshing during a cold start dumped a logged-in
// user on the login page. Transient failures now retry a few times first.
const MAX_SESSION_RETRIES = 3;

const Custom = ({ children }) => {
  const { isLoading, isError, error, refetch } = useLoadUserQuery();
  const [retries, setRetries] = useState(0);

  const isDefinitive = !isError || error?.status === 401;
  useEffect(() => {
    if (isError && !isDefinitive && retries < MAX_SESSION_RETRIES) {
      const timer = setTimeout(
        () => {
          setRetries((r) => r + 1);
          refetch();
        },
        1200 * (retries + 1)
      );
      return () => clearTimeout(timer);
    }
  }, [isError, isDefinitive, retries, refetch]);

  const stillRestoring =
    isLoading || (isError && !isDefinitive && retries < MAX_SESSION_RETRIES);
  return <>{stillRestoring ? <LoadingSpinner /> : <>{children}</>}</>;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={appStore}>
      <Custom>
        <App />
        <Toaster />
      </Custom>
    </Provider>
  </StrictMode>
);
