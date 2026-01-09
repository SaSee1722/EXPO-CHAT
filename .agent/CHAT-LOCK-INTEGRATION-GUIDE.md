# Chat Lock Feature - Complete Integration Guide

## ✅ All Components Are Ready

The following files have been created and are ready to use:

- ✅ `services/chatLockService.ts` - Lock/unlock logic
- ✅ `components/chat/PinInput.tsx` - PIN input UI
- ✅ `components/chat/PinSetupModal.tsx` - PIN setup flow
- ✅ `components/chat/LockedChatScreen.tsx` - Locked screen with swipe gesture
- ✅ `supabase/chat-locks-schema.sql` - Database schema

## 🔧 Step-by-Step Integration

### Step 1: Run Database Schema

**Open Supabase SQL Editor** and run:

```sql
-- Copy and paste the entire contents of: supabase/chat-locks-schema.sql
```

### Step 2: Update Chat Screen (`app/chat/[matchId].tsx`)

#### 2.1 Add Imports (Line 2)

Change:

```tsx
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
```

To:

```tsx
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
```

#### 2.2 Add More Imports (After line 20)

Add these three lines:

```tsx
import { chatLockService } from '@/services/chatLockService';
import { PinSetupModal } from '@/components/chat/PinSetupModal';
import { LockedChatScreen } from '@/components/chat/LockedChatScreen';
```

#### 2.3 Add State Variables (After line 47, after `replyingTo` state)

Add:

```tsx
// Chat Lock State
const [isLocked, setIsLocked] = React.useState(false);
const [showPinSetup, setShowPinSetup] = React.useState(false);
const [isUnlocked, setIsUnlocked] = React.useState(false);
```

#### 2.4 Add Lock Status Check (After line 155, after `loadMatchProfile` useEffect)

Add:

```tsx
// Check if chat is locked on mount
React.useEffect(() => {
  if (user && matchId) {
    chatLockService.isChatLocked(user.id, matchId).then(setIsLocked);
  }
}, [user?.id, matchId]);
```

#### 2.5 Add Lock Button to Header (After line 461, after the videocam button)

Add this BEFORE the `</View>` that closes `headerActions`:

```tsx
<TouchableOpacity
  onPress={() => {
    if (isLocked) {
      Alert.alert(
        'Unlock Chat',
        'Remove lock from this chat?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock',
            onPress: async () => {
              if (user) {
                await chatLockService.unlockChat(user.id, matchId);
                setIsLocked(false);
                setIsUnlocked(false);
              }
            }
          }
        ]
      );
    } else {
      setShowPinSetup(true);
    }
  }}
  style={styles.headerActionBtn}
>
  <Ionicons name={isLocked ? "lock-closed" : "lock-open"} size={22} color="#87CEEB" />
</TouchableOpacity>
```

#### 2.6 Wrap Chat Content (Around line 465, find the `<FlatList` component)

**IMPORTANT**: You need to wrap the ENTIRE FlatList AND the input container below it.

Find this line:

```tsx
<FlatList
```

BEFORE it, add:

```tsx
{/* Show locked screen if chat is locked and not unlocked */}
{isLocked && !isUnlocked ? (
  <LockedChatScreen
    otherUserName={otherProfile?.display_name || 'User'}
    onUnlock={async (pin) => {
      if (!user) return false;
      const isValid = await chatLockService.verifyPin(user.id, matchId, pin);
      if (isValid) {
        setIsUnlocked(true);
      }
      return isValid;
    }}
  />
) : (
  <>
```

Then, find the `<MediaMenu` component (around line 599) and BEFORE it, add:

```tsx
        </>
      )}
```

This wraps everything between FlatList and MediaMenu in the conditional.

#### 2.7 Add PIN Setup Modal (Before `</KeyboardAvoidingView>`, around line 604)

Add:

```tsx
<PinSetupModal
  visible={showPinSetup}
  onComplete={async (pin) => {
    if (user) {
      await chatLockService.lockChat(user.id, matchId, pin);
      setIsLocked(true);
      setShowPinSetup(false);
    }
  }}
  onCancel={() => setShowPinSetup(false)}
/>
```

### Step 3: Update Matches List (NEXT STEP - Not done yet)

We still need to update `components/matches/MatchItem.tsx` to show "X new messages" for locked chats.

## 🎯 Testing the Feature

1. **Run the SQL** in Supabase first!
2. **Reload your app**
3. **Open a chat**
4. **Tap the lock icon** (should be open/unlocked initially)
5. **Set a 4-digit PIN** and confirm it
6. **Leave the chat** and come back
7. **You should see the locked screen**
8. **Swipe up** from the bottom
9. **Enter your PIN** to unlock

## ⚠️ Common Issues

- **"Column does not exist"** → Run the SQL schema
- **Lock button not showing** → Check imports are correct
- **Locked screen not showing** → Check the conditional wrapping is correct

## 📝 Summary

The chat lock feature is fully built! Just need to:

1. ✅ Run SQL schema
2. ✅ Add imports to chat screen
3. ✅ Add state variables
4. ✅ Add lock button
5. ✅ Wrap content with conditional
6. ✅ Add PIN setup modal
7. ⏳ Update matches list (next step)

Let me know when you've completed these steps and I'll help with the matches list integration!
