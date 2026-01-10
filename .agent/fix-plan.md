# Gossip Chat App - Fix Plan

## Issues to Fix

### 1. Profile Photo Upload Error ✅
**Problem**: Error message "upload failed try picking a smaller image" appears even for valid images
**Location**: `app/(tabs)/profile.tsx` line 58
**Solution**: Remove the generic error message and provide better error handling with specific feedback

### 2. Video Call Preview & Face Rendering Issue
**Problem**: 
- Receiver's own face appears in preview incorrectly
- Video keeps re-rendering/flickering
- Faces displayed prematurely
**Location**: `components/chat/CallOverlay.tsx`
**Solution**: 
- Fix stream rendering logic to show correct streams
- Separate local and remote stream rendering properly
- Fix the RTCView streamURL logic

### 3. Call UI Buttons & Speaker Issue
**Problem**:
- Call buttons look basic/outdated
- Speaker button doesn't work (audio stays in earpiece)
**Location**: `components/chat/CallOverlay.tsx`, `services/webrtcService.ts`
**Solution**:
- Redesign call control buttons with modern glassmorphism
- Fix speaker toggle in webrtcService.ts (Android audio routing)

### 4. Call Audio Stops in Background/Lock Screen
**Problem**: Audio stops when app is minimized or screen is locked
**Location**: `app.json`, `android/app/src/main/AndroidManifest.xml`
**Solution**:
- Add foreground service for calls (Android)
- Ensure UIBackgroundModes is properly configured (iOS - already done)
- Add FOREGROUND_SERVICE permission

### 5. Permissions Not Requested at App Start
**Problem**: Mic/camera permissions not requested on first launch
**Location**: `app/_layout.tsx` or create new permission handler
**Solution**: Add permission request flow on app startup

### 6. Online Status Visibility Improvement
**Problem**: "online" text is not green in chat screen
**Location**: `app/chat/[matchId].tsx` line 521-523
**Solution**: Change color from #888 to #4CAF50 when user is online

### 7. Call Log Inside Chat Screen
**Problem**: No call log messages in individual chats
**Location**: `app/chat/[matchId].tsx`, need to add call log messages
**Solution**: Create call log message type and insert into chat after calls end

## Implementation Order
1. Fix #1 - Profile Photo Upload (Simple)
2. Fix #6 - Online Status Color (Simple)
3. Fix #3 - Speaker Button & UI Redesign (Medium)
4. Fix #2 - Video Call Rendering (Medium)
5. Fix #5 - Permission Requests (Medium)
6. Fix #7 - Call Logs in Chat (Complex)
7. Fix #4 - Background Audio (Complex - requires native code)
