# WhatsApp-Style Notification System Setup

This system mimics WhatsApp's notification behavior:

1. **Foreground**: Custom In-App Banner.
2. **Background/Terminated**: System Notification.

## 1. Database Prerequisites (Completed ✅)

You have successfully added the `push_token` column to the `profiles` table.

## 2. Backend Logic (Supabase Edge Function)

### A. Deployment (Completed ✅)

Function URL: `https://vkahvqaqdkkpefbimngu.supabase.co/functions/v1/push-notification`

### B. Set Database Webhook (Completed ✅)

You have set up the `message-push` webhook.

## 3. Firebase Setup (REQUIRED FOR ANDROID)

The app is crashing on Android because it needs Firebase credentials.

### A. Generate Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Add a project (e.g., "Gossip").
3. Add an **Android App**.
    * **Package Name**: `com.ssabee1722.gossip`  
        *(Copy exactly! Note there is NO DASH, unlike ios).*
    * **App Nickname**: Gossip (Optional)
    * **SHA-1**: (Optional for now)
4. **Download** `google-services.json`.
5. **Move** the file to your project root: `/Users/apple/Desktop/twisha/google-services.json`.

### B. Rebuild

After adding the file, you **must** run:

```bash
npx expo run:android
```

## 4. Testing

1. **Login**: To save your new Push Token.
2. **Test**:
    * Kill Android app.
    * Send message from Simulator.
    * Check for System Notification.
