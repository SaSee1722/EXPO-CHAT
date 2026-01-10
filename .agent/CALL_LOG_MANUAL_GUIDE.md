# Call Log Message Rendering - Manual Implementation Guide

## Step 1: Add the 'call' case in MessageBubble.tsx

**Location:** `/Users/apple/Desktop/twisha/components/chat/MessageBubble.tsx`

**Find this code** (around line 318-321):

```typescript
        );
      default:
        return <Text style={[styles.text, { color: isOwn ? '#000' : '#FFFFFF' }]}>{content}</Text>;
    }
  };
```

**Add this code BEFORE the `default:` case:**

```typescript
      case 'call':
        const callType = metadata?.call_type || 'voice';
        const callStatus = metadata?.call_status || 'ended';
        const duration = metadata?.duration || 0;
        const formatDuration = (seconds: number) => {
          if (seconds < 60) return `${seconds}s`;
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        return (
          <View style={styles.callLogContainer}>
            <View style={[styles.callIconContainer, { backgroundColor: isOwn ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }]}>
              <Ionicons 
                name={callType === 'video' ? 'videocam' : 'call'} 
                size={20} 
                color={callStatus === 'missed' || callStatus === 'rejected' ? '#FF4458' : (isOwn ? '#000' : '#87CEEB')} 
              />
            </View>
            <View style={styles.callDetails}>
              <Text style={[styles.callText, { color: isOwn ? '#000' : '#FFFFFF' }]}>
                {callType === 'video' ? 'Video call' : 'Voice call'}
              </Text>
              <Text style={[styles.callDuration, { color: isOwn ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }]}>
                {callStatus === 'ended' && duration > 0 ? formatDuration(duration) : 
                 callStatus === 'missed' ? 'Missed' : 
                 callStatus === 'rejected' ? 'Declined' : 'Ended'}
              </Text>
            </View>
          </View>
        );
```

**Result should look like:**

```typescript
        );
      case 'call':
        const callType = metadata?.call_type || 'voice';
        // ... (all the call case code above)
        );
      default:
        return <Text style={[styles.text, { color: isOwn ? '#000' : '#FFFFFF' }]}>{content}</Text>;
    }
  };
```

---

## Step 2: Add the styles to the StyleSheet

**Location:** Same file, in the `StyleSheet.create({` section (around line 430+)

**Find the end of the styles object** (look for the closing `});` of StyleSheet.create)

**Add these styles BEFORE the closing `});`:**

```typescript
  callLogContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callDetails: {
    flex: 1,
  },
  callText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  callDuration: {
    fontSize: 13,
  },
```

---

## What This Does

1. **Detects call messages**: When a message has `type: 'call'`, it renders a special call log UI
2. **Shows call icon**: Video camera icon for video calls, phone icon for voice calls
3. **Color codes status**: Red icon for missed/rejected calls, blue/black for completed calls
4. **Displays duration**: Shows formatted duration (e.g., "5:30") for ended calls
5. **Shows status text**: "Missed", "Declined", or "Ended" based on call status

---

## Testing

After making these changes:

1. Save the file
2. The app should reload automatically
3. Make a test call and end it
4. Check the chat - you should see a call log message like:
   - 📞 Voice call
   - 5:30

---

## Troubleshooting

If you get errors:

- Make sure you added the code in the RIGHT location (before `default:` case)
- Check that all brackets `{}` are properly closed
- Verify the styles are inside the `StyleSheet.create({` block
- Make sure there's a comma after each style property
