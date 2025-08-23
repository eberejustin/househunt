import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useToast } from '../hooks/use-toast';

interface NotificationPermissionPromptProps {
  onDismiss: () => void;
}

export function NotificationPermissionPrompt({ onDismiss }: NotificationPermissionPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { requestPermission, subscribe, isSupported } = usePushNotifications();
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device/browser.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const permission = await requestPermission();
      
      if (permission === 'granted') {
        await subscribe();
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for apartment updates!",
        });
        onDismiss();
      } else {
        toast({
          title: "Permission Denied",
          description: "You can enable notifications later in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    toast({
      title: "Notifications Disabled",
      description: "You can enable them later in your browser settings.",
    });
    onDismiss();
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Card className="max-w-md mx-auto mt-4" data-testid="notification-permission-prompt">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Stay Updated</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            data-testid="button-dismiss-notification-prompt"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Get notified when new apartments are added, comments are posted, or apartments are favorited by your collaborators.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>Real-time collaboration updates</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
          <Bell className="h-4 w-4" />
          <span>New apartment listings</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
          <Bell className="h-4 w-4" />
          <span>Comments and favorites</span>
        </div>
      </CardContent>
      <CardFooter className="flex space-x-2 pt-3">
        <Button
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="flex-1"
          data-testid="button-enable-notifications"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Enabling...
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDecline}
          className="flex-1"
          data-testid="button-decline-notifications"
        >
          <BellOff className="h-4 w-4 mr-2" />
          Not Now
        </Button>
      </CardFooter>
    </Card>
  );
}