import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationPermissionPrompt() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isSupported, permission, requestPermission, isRegistering } = usePushNotifications();

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setIsDismissed(true);
      localStorage.setItem('notification-prompt-dismissed', 'true');
    }
  };

  // Don't show if not supported, already granted, or dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-96">
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Enable Notifications</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
              data-testid="notification-prompt-dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Get instant browser notifications when others add apartments, comments, or mark favorites.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex space-x-2">
            <Button
              onClick={handleEnable}
              disabled={isRegistering}
              className="flex-1"
              data-testid="notification-enable-button"
            >
              {isRegistering ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              data-testid="notification-maybe-later-button"
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}