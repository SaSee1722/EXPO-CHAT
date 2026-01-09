# Chat Lock Feature Implementation Plan

## ✅ Completed

1. Database schema (`chat-locks-schema.sql`)
2. Chat lock service (`chatLockService.ts`)
3. PIN input component (`PinInput.tsx`)

## 🔄 In Progress

4. PIN setup modal component
2. Locked chat screen with swipe gesture
3. Chat header lock/unlock button
4. Matches list integration (hide messages for locked chats)

## 📋 TODO

8. Test PIN setup flow
2. Test PIN verification
3. Test swipe gesture unlock
4. Update matches list to show "X new messages" for locked chats

## Implementation Steps

### Step 4: PIN Setup Modal

Create a modal that:

- Asks for PIN (4 digits)
- Asks for confirmation PIN
- Validates they match
- Saves to database

### Step 5: Locked Chat Screen

Create a screen that:

- Shows blank/placeholder initially
- Detects swipe-up gesture
- Shows PIN input on swipe
- Unlocks chat on correct PIN

### Step 6: Chat Header Integration

Add to chat header:

- Lock icon button
- Opens PIN setup if not locked
- Shows unlock option if locked

### Step 7: Matches List Update

Modify MatchItem to:

- Check if chat is locked
- Show "X new messages" instead of preview
- Hide actual message content

## Database Setup

Run this SQL in Supabase:

```sql
-- See chat-locks-schema.sql
```

## Dependencies

- crypto-js for PIN hashing (need to install)
