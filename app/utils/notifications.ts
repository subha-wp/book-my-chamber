// @ts-nocheck
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const initializeNotifications = async () => {
  try {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    // Request permissions
    if (Platform.OS !== "web") {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission not granted");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return false;
  }
};

export const showNotification = async (title: string, body: string) => {
  try {
    if (Platform.OS === "web") {
      // For web, use browser notifications if available
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      } else {
        console.log("Web notifications not available or not permitted");
      }
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};
