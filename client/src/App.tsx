import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePWA } from "@/hooks/usePWA";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useState, useEffect } from "react";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isInstallable } = usePWA();
  const { permission, isSupported } = usePushNotifications();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  // Initialize WebSocket connection for authenticated users
  useWebSocket();

  // Show PWA prompts after user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("PWA State:", { isInstallable, isSupported, permission });

      // Show install prompt after a delay - but also show for debugging
      const installTimer = setTimeout(() => {
        console.log("Checking install prompt:", { isInstallable });
        // For debugging, show install prompt even if not installable on some browsers
        const shouldShowInstall =
          isInstallable ||
          // Show on desktop Chrome/Edge if not in standalone mode
          (!window.matchMedia("(display-mode: standalone)").matches &&
            (navigator.userAgent.includes("Chrome") ||
              navigator.userAgent.includes("Edge")));

        if (shouldShowInstall) {
          setShowInstallPrompt(true);
        }
      }, 3000);

      return () => {
        clearTimeout(installTimer);
        // clearTimeout(notificationTimer);
      };
    }
  }, [isAuthenticated, isLoading, isInstallable, isSupported, permission]);
  // useEffect(() => {
  //     if (isSupported && permission === 'default') {
  //       setShowNotificationPrompt(true);
  //     }
  //   }, isInstallable ? 8000 : 5000);
  // })

  return (
    <>
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>

      {/* PWA Prompts */}
      {showInstallPrompt && (
        <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <InstallPrompt
            onDismiss={() => {
              setShowInstallPrompt(false);
              setShowNotificationPrompt(true);
            }}
          />
        </div>
      )}

      {showNotificationPrompt && (
        <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <NotificationPermissionPrompt
            onDismiss={() => setShowNotificationPrompt(false)}
          />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
