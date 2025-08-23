// Service Worker registration and management
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New update available
                    console.log('New content is available; please refresh.');
                    showUpdateAvailableNotification(registration);
                  } else {
                    // Content is cached for the first time
                    console.log('Content is cached for offline use.');
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

function showUpdateAvailableNotification(registration: ServiceWorkerRegistration) {
  // Create a custom event to notify the app of updates
  const event = new CustomEvent('sw-update-available', {
    detail: { registration }
  });
  window.dispatchEvent(event);
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Handle messages from service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'notification-click') {
      // Handle notification click from service worker
      const data = event.data.data;
      
      // Navigate to apartment if specified
      if (data.apartmentId) {
        const url = new URL(window.location.href);
        url.searchParams.set('apartment', data.apartmentId);
        window.history.pushState({}, '', url.toString());
        
        // Dispatch custom event for app to handle
        window.dispatchEvent(new CustomEvent('navigate-to-apartment', {
          detail: { apartmentId: data.apartmentId }
        }));
      }
    }
  });
}