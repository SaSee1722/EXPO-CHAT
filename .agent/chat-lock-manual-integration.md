# Chat Lock Feature - Manual Integration Required

## ⚠️ File Corruption Issue

The automated integration into `app/chat/[matchId].tsx` encountered errors. Please manually integrate the following changes:

## 📝 Manual Steps

### 1. First, Run the Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- See: supabase/chat-locks-schema.sql
```

### 2. Add Imports to Chat Screen

At the top of `app/chat/[matchId].tsx`, add:

```tsx
import { chatLockService } from '@/services/chatLockService';
import { PinSetupModal } from '@/components/chat/PinSetupModal';
import { LockedChatScreen } from '@/components/chat/LockedChatScreen';
```

### 3. Add State Variables

After the existing state declarations (around line 46), add:

```tsx
// Chat Lock State
const [isLocked, setIsLocked] = React.useState(false);
const [showPinSetup, setShowPinSetup] = React.useState(false);
const [isUnlocked, setIsUnlocked] = React.useState(false);
```

### 4. Add Lock Status Check

After the typing useEffect (around line 142), add:

```tsx
// Check if chat is locked on mount
React.useEffect(() => {
  if (user && matchId) {
    chatLockService.isChatLocked(user.id, matchId).then(setIsLocked);
  }
}, [user?.id, matchId]);
```

### 5. Add Lock Button to Header

In the header actions section (around line 528), add this button BEFORE the block button:

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

### 6. Wrap Chat Content with Locked Screen

Find the `<FlatList` component (around line 591) and wrap ALL the chat content (FlatList + input container) with this conditional:

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
    {/* ALL EXISTING FLATLIST AND INPUT CODE GOES HERE */}
  </>
)}
```

### 7. Add PIN Setup Modal

Before the closing `</KeyboardAvoidingView>` tag (around line 705), add:

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

## ✅ All Components Are Ready

All the necessary components have been created:

- ✅ `services/chatLockService.ts`
- ✅ `components/chat/PinInput.tsx`
- ✅ `components/chat/PinSetupModal.tsx`
- ✅ `components/chat/LockedChatScreen.tsx`
- ✅ `supabase/chat-locks-schema.sql`

## 🔄 Next: Update Matches List

After fixing the chat screen, we still need to update the matches list to show "X new messages" for locked chats.

Would you like me to:

1. Help you manually fix the chat screen file?
2. Or should I proceed with updating the matches list component?
