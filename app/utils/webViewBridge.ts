export const getInjectedJavaScript = () => `
  (function() {
    // Enhanced bridge setup for SDK 53 compatibility
    if (!window.ReactNativeWebView) {
      window.ReactNativeWebView = {
        postMessage: function(data) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        }
      };
    }

    // SDK 53 specific crash prevention
    let isInitialized = false;
    let clickDebounce = false;
    
    function initializeBridge() {
      if (isInitialized) return;
      isInitialized = true;
      
      console.log('Initializing WebView bridge for SDK 53');
      
      // Enhanced click handling to prevent crashes
      document.addEventListener('click', function(e) {
        if (clickDebounce) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
        
        clickDebounce = true;
        const target = e.target;
        
        console.log('Safe click on:', target.tagName, target.className, target.id);
        
        // Prevent rapid clicks that cause crashes in SDK 53
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.type === 'submit') {
          target.style.pointerEvents = 'none';
          setTimeout(() => {
            target.style.pointerEvents = 'auto';
            clickDebounce = false;
          }, 800); // Increased delay for SDK 53
        } else {
          setTimeout(() => {
            clickDebounce = false;
          }, 300);
        }
      }, true);
      
      // Enhanced form handling for SDK 53
      document.addEventListener('submit', function(e) {
        console.log('Form submission intercepted');
        
        // Prevent multiple rapid submissions
        const form = e.target;
        if (form.dataset.submitting === 'true') {
          e.preventDefault();
          return false;
        }
        
        form.dataset.submitting = 'true';
        setTimeout(() => {
          form.dataset.submitting = 'false';
        }, 2000);
        
      }, true);
      
      // Prevent context menu issues in SDK 53
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Handle page navigation safely
      document.addEventListener('beforeunload', function(e) {
        console.log('Page unloading safely');
        isInitialized = false;
      });
      
      // Prevent drag and drop issues
      document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
      });
      
      // Handle selection issues that can cause crashes
      document.addEventListener('selectstart', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return true;
        }
        // Prevent text selection on other elements to avoid crashes
        e.preventDefault();
        return false;
      });
    }

    // Enhanced error handling for SDK 53
    window.addEventListener('error', function(e) {
      console.error('JavaScript error caught:', e.message);
      if (window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'jsError',
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            stack: e.error ? e.error.stack : 'No stack trace'
          }));
        } catch (postError) {
          console.error('Error posting message:', postError);
        }
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
      console.error('Unhandled promise rejection:', e.reason);
      if (window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'unhandledRejection',
            reason: String(e.reason)
          }));
        } catch (postError) {
          console.error('Error posting rejection message:', postError);
        }
      }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeBridge);
    } else {
      initializeBridge();
    }
    
    // Fallback initialization
    setTimeout(initializeBridge, 100);

    // Notify that bridge is ready
    setTimeout(() => {
      try {
        window.dispatchEvent(new Event('ReactNativeWebViewReady'));
        console.log('WebView bridge ready for SDK 53');
      } catch (error) {
        console.error('Error dispatching ready event:', error);
      }
    }, 200);

    true; // Required for iOS
  })();
`;
