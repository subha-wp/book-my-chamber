import * as Location from "expo-location";

export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const location = await Location.getCurrentPositionAsync({});
      return location.coords;
    }
    console.log("Location permission denied");
    return null;
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
};
