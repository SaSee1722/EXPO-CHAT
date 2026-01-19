# APK Size Reduction Plan

**Current Size**: 226.41 MB  
**Target Size**: <100 MB (ideally 50-80 MB)

## 🔴 Critical Issues

### 1. **Optimize Images** (Save ~2 MB)

Your app icon and logo are 1 MB each - way too large!

**Current:**

- `assets/app-icon.png`: 1.0 MB
- `assets/images/app-logo.png`: 1.0 MB

**Recommended:**

- App icons should be **<100 KB** (ideally 20-50 KB)
- Use optimized PNG or WebP format
- Remove duplicate logo if not needed

**Action:**

```bash
# Optimize images using ImageOptim or similar
# Target: <50 KB per icon
```

---

### 2. **Enable Build Optimizations** (Save ~50-80 MB)

**Current Settings:**

```gradle
minifyEnabled = false
shrinkResources = false
enableBundleCompression = false
```

**Recommended Settings:**
Add to `android/gradle.properties`:

```properties
# Enable R8 minification and obfuscation
android.enableMinifyInReleaseBuilds=true

# Enable resource shrinking to remove unused resources
android.enableShrinkResourcesInReleaseBuilds=true

# Enable bundle compression
android.enableBundleCompression=true

# Disable PNG crunching (already optimized)
android.enablePngCrunchInReleaseBuilds=false
```

---

### 3. **Use Split APKs Instead of Universal APK** (Save ~100-150 MB)

**Current:** Building universal APK with all architectures (226 MB)

**Recommended:** Build separate APKs per architecture

Each split APK will be **50-80 MB** instead of 226 MB:

- `app-arm64-v8a-release.apk` (~60 MB) - **Most devices**
- `app-armeabi-v7a-release.apk` (~55 MB) - Older devices
- `app-x86_64-release.apk` (~60 MB) - Emulators
- `app-x86-release.apk` (~55 MB) - Emulators

**Action:**
Your Codemagic config already generates split APKs! Just use the architecture-specific APKs instead of the universal one.

---

### 4. **Use Android App Bundle (AAB)** (Best Option)

**Recommended:** Build an AAB instead of APK for Play Store

**Benefits:**

- Google Play automatically serves optimized APKs
- Users download only what they need (~50-70 MB)
- Supports dynamic delivery

**Action:**
Update `codemagic.yaml`:

```yaml
- name: Build Android Release Bundle
  script: |
    cd android
    chmod +x gradlew
    ./gradlew bundleRelease --stacktrace
```

Then upload the AAB to Play Store instead of APK.

---

## 🟡 Medium Priority

### 5. **Remove Unused Dependencies**

Review and remove unused packages:

- Do you need `react-native-maps`?
- Do you need `lottie-react-native`?
- Do you need `@apollo/client` and `graphql`?
- Do you need `react-native-chart-kit`?
- Do you need `react-native-calendars`?

Each heavy library adds 5-20 MB.

---

### 6. **Optimize Native Libraries**

**Current:** Building for 4 architectures

**Recommended:** Focus on ARM architectures only

```properties
# In android/gradle.properties
reactNativeArchitectures=arm64-v8a,armeabi-v7a
```

This removes x86/x86_64 (emulator-only) from production builds.

---

### 7. **Enable Hermes Optimizations**

You already have `hermesEnabled=true`, but ensure it's optimized:

```gradle
// In android/app/build.gradle
react {
    hermesFlags = ["-O", "-output-source-map"]
}
```

---

## 🟢 Nice to Have

### 8. **Lazy Load Heavy Features**

- Load WebRTC only when needed
- Load maps only when needed
- Use dynamic imports for heavy screens

### 9. **Optimize Fonts**

Only include font weights you actually use.

### 10. **Review ProGuard Rules**

Create custom ProGuard rules to remove more unused code.

---

## 📋 Implementation Checklist

### Phase 1: Quick Wins (30 min)

- [ ] Optimize app icon and logo images (<50 KB each)
- [ ] Enable minification and resource shrinking
- [ ] Use split APKs instead of universal APK

**Expected Result:** 50-80 MB per architecture

### Phase 2: Build Optimization (1 hour)

- [ ] Switch to Android App Bundle (AAB)
- [ ] Remove x86/x86_64 architectures from production
- [ ] Enable bundle compression

**Expected Result:** 40-60 MB download size

### Phase 3: Dependency Cleanup (2-4 hours)

- [ ] Audit and remove unused dependencies
- [ ] Lazy load heavy features
- [ ] Optimize fonts and assets

**Expected Result:** 30-50 MB download size

---

## 🚀 Recommended Immediate Actions

1. **Use the split APKs** you already have:
   - `app-arm64-v8a-release.apk` (~60 MB)
   - `app-armeabi-v7a-release.apk` (~55 MB)

2. **Optimize your images** (2 minutes):

   ```bash
   # Use ImageOptim, TinyPNG, or similar
   # Target: <50 KB per image
   ```

3. **Enable build optimizations** (5 minutes):
   Add to `android/gradle.properties`:

   ```properties
   android.enableMinifyInReleaseBuilds=true
   android.enableShrinkResourcesInReleaseBuilds=true
   ```

4. **Rebuild** and you should see **50-80 MB** per APK instead of 226 MB!

---

## 📊 Expected Results

| Optimization | Size Reduction | Effort |
|-------------|----------------|--------|
| Use split APKs | -140 MB | ✅ Already done |
| Optimize images | -2 MB | 5 min |
| Enable minification | -50 MB | 5 min |
| Enable resource shrinking | -20 MB | 5 min |
| Remove unused deps | -10-30 MB | 2 hours |
| **Total** | **~200 MB** | **15 min - 2 hours** |

**Final Size:** 50-80 MB per architecture (instead of 226 MB universal)
