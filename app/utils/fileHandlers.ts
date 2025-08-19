import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export const handleFileUpload = async (webViewRef: any) => {
  try {
    if (Platform.OS === "web") {
      console.log("File upload not supported on web platform");
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          try {
            window.dispatchEvent(new CustomEvent('fileUploaded', {
              detail: {
                uri: '${asset.uri}',
                name: '${asset.name}',
                size: ${asset.size || 0}
              }
            }));
          } catch (error) {
            console.error('File upload event error:', error);
          }
          true;
        `);
      }
    }
  } catch (err) {
    console.error("File upload error:", err);
  }
};

export const handleFileDownload = async (
  fileUrl: string,
  fileName: string,
  webViewRef: any
) => {
  try {
    if (Platform.OS === "web") {
      // For web, open the file in a new tab
      window.open(fileUrl, "_blank");
      return;
    }

    if (!FileSystem.documentDirectory) {
      console.error("Document directory not available");
      return;
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      fileUrl,
      FileSystem.documentDirectory + fileName
    );

    const result = await downloadResumable.downloadAsync();

    if (result && result.uri && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        try {
          window.dispatchEvent(new CustomEvent('fileDownloaded', {
            detail: { uri: '${result.uri}', fileName: '${fileName}' }
          }));
        } catch (error) {
          console.error('File download event error:', error);
        }
        true;
      `);
    }
  } catch (e) {
    console.error("File download error:", e);
  }
};
