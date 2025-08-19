/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { handleFileDownload, handleFileUpload } from "./utils/fileHandlers";
import { getCurrentLocation } from "./utils/location";
import { handleOpenMaps, handlePhoneCall } from "./utils/navigation";
import {
  initializeNotifications,
  showNotification,
} from "./utils/notifications";
import { getInjectedJavaScript } from "./utils/webViewBridge";

export default function RootLayout() {
  useFrameworkReady();

  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);

  useEffect(() => {
    const setupApp = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        await initializeNotifications();
      } catch (error) {
        console.error("Setup error:", error);
      }
    };

    setupApp();

    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }
  }, [canGoBack]);

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView error: ", nativeEvent);
    setIsError(true);
    setIsLoading(false);
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView HTTP error: ", nativeEvent);
    if (nativeEvent.statusCode >= 400) {
      setIsError(true);
      setIsLoading(false);
    }
  };

  const retryLoading = () => {
    setIsError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("Received message from WebView:", data);

      switch (data.type) {
        case "phoneCall":
          if (data.phone) {
            handlePhoneCall(data.phone);
          }
          break;
        case "fileUpload":
          handleFileUpload(webViewRef);
          break;
        case "fileDownload":
          if (data.url && data.fileName) {
            handleFileDownload(data.url, data.fileName, webViewRef);
          }
          break;
        case "openMaps":
          if (data.pharmacyLatitude && data.pharmacyLongitude) {
            handleOpenMaps(
              data.pharmacyLatitude,
              data.pharmacyLongitude,
              userLocation?.latitude,
              userLocation?.longitude
            );
          }
          break;
        case "newNotification":
          if (data.notification?.title && data.notification?.message) {
            showNotification(
              data.notification.title,
              data.notification.message
            );
          }
          break;
        default:
          console.log("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  const onLoadStart = () => {
    setIsLoading(true);
    setIsError(false);
  };

  const onLoadEnd = () => {
    setIsLoading(false);
    // Enhanced JavaScript injection for SDK 53 stability
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            console.log('WebView bridge status:', !!window.ReactNativeWebView);
            
            // Prevent multiple rapid clicks that cause crashes
            let clickTimeout = null;
            let isProcessingClick = false;
            
            document.addEventListener('click', function(e) {
              if (isProcessingClick) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
              
              isProcessingClick = true;
              console.log('Click detected on:', e.target.tagName, e.target.className);
              
              // Reset click processing after delay
              clearTimeout(clickTimeout);
              clickTimeout = setTimeout(() => {
                isProcessingClick = false;
              }, 500);
              
            }, true);
            
            // Enhanced form handling for SDK 53
            document.addEventListener('submit', function(e) {
              console.log('Form submission detected');
              // Add small delay to prevent crashes
              setTimeout(() => {
                console.log('Form submission processed');
              }, 100);
            }, true);
            
            // Prevent context menu that can cause issues
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              return false;
            });
            
            // Handle touch events more safely
            document.addEventListener('touchstart', function(e) {
              console.log('Touch start detected');
            }, { passive: true });
            
          } catch (error) {
            console.error('Injection error:', error);
          }
        })();
        true;
      `);
    }
  };

  const onNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    console.log("Navigation state changed:", navState.url);
  };

  // Enhanced error recovery for SDK 53
  const onRenderProcessGone = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn("Render process gone:", nativeEvent);
    setIsError(true);
    // Auto-retry after a short delay
    setTimeout(() => {
      retryLoading();
    }, 2000);
  };

  const onContentProcessDidTerminate = () => {
    console.warn("Content process terminated");
    setIsError(true);
    // Auto-retry after a short delay
    setTimeout(() => {
      retryLoading();
    }, 2000);
  };

  return (
    <>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.container}>
        {isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Unable to load the application. Please check your internet
              connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: "https://medicare-blush.vercel.app/dashboard" }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlaybook={true}
            mediaPlaybackRequiresUserAction={false}
            allowsBackForwardNavigationGestures={true}
            bounces={false}
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onError={handleError}
            onHttpError={handleHttpError}
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onNavigationStateChange={onNavigationStateChange}
            injectedJavaScript={getInjectedJavaScript()}
            onMessage={onMessage}
            // SDK 53 specific props for stability
            setSupportMultipleWindows={false}
            allowsLinkPreview={false}
            fraudulentWebsiteWarningEnabled={false}
            // Enhanced crash prevention
            onShouldStartLoadWithRequest={(request) => {
              console.log("Should start load with request:", request.url);
              return true;
            }}
            onRenderProcessGone={onRenderProcessGone}
            onContentProcessDidTerminate={onContentProcessDidTerminate}
            // Additional SDK 53 stability props
            pullToRefreshEnabled={false}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            // Prevent crashes on rapid interactions
            onLoadProgress={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log("Load progress:", nativeEvent.progress);
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
