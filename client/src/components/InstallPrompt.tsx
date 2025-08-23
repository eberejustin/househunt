import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { useToast } from '../hooks/use-toast';

interface InstallPromptProps {
  onDismiss: () => void;
}

export function InstallPrompt({ onDismiss }: InstallPromptProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const { installApp, isInstallable } = usePWA();
  const { toast } = useToast();

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      if (isInstallable) {
        await installApp();
        toast({
          title: "App Installed",
          description: "HouseHunt has been added to your home screen!",
        });
      } else {
        // Fallback instructions for manual installation
        toast({
          title: "Install HouseHunt",
          description: "Look for 'Add to Home Screen' or 'Install App' in your browser menu.",
        });
      }
      onDismiss();
    } catch (error) {
      console.error('Error installing app:', error);
      toast({
        title: "Installation Instructions",
        description: "Look for 'Add to Home Screen' or 'Install App' in your browser menu.",
      });
      onDismiss();
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    toast({
      title: "Install Later",
      description: "You can install HouseHunt anytime from your browser menu.",
    });
    onDismiss();
  };

  // Always show the prompt component when it's called
  // The parent component controls when to show it

  return (
    <Card className="max-w-md mx-auto mt-4" data-testid="install-prompt">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Install HouseHunt</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            data-testid="button-dismiss-install-prompt"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Install HouseHunt on your device for quick access and a native app experience.
          {!isInstallable && " Look for 'Add to Home Screen' in your browser menu."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
          <Download className="h-4 w-4" />
          <span>Works offline</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
          <Download className="h-4 w-4" />
          <span>Quick access from home screen</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
          <Download className="h-4 w-4" />
          <span>Native app experience</span>
        </div>
      </CardContent>
      <CardFooter className="flex space-x-2 pt-3">
        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          className="flex-1"
          data-testid="button-install-app"
        >
          {isInstalling ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Installing...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Install App
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDismiss}
          className="flex-1"
          data-testid="button-install-later"
        >
          Later
        </Button>
      </CardFooter>
    </Card>
  );
}