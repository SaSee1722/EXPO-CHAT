# Android Release Build - Memory Fix & APK Location Guide

## Problem Summary

The build failed with `OutOfMemoryError: Java heap space` during the `:app:packageRelease` task. This prevented the generation of split APK files.

## Changes Made

### 1. Updated `android/gradle.properties`

- **Increased JVM heap size**: From 2GB to 4GB (`-Xmx4096m`)
- **Increased MetaSpace**: From 512MB to 1GB (`-XX:MaxMetaspaceSize=1024m`)
- **Added heap dump on OOM**: For debugging if the issue persists
- **Disabled parallel builds**: Reduces memory pressure during release builds
- **Enabled Gradle daemon**: Improves build performance
- **Enabled configure on demand**: Optimizes configuration phase

### 2. Updated `android/app/build.gradle`

- **Added dexOptions block**:
  - `javaMaxHeapSize "4g"`: Allocates 4GB for DEX compilation
  - `preDexLibraries = true`: Enables pre-dexing for faster builds
  - `maxProcessCount = 4`: Limits parallel processes to reduce memory usage

## Where to Find Split APK Files

After a **successful** build, the split APK files will be located at:

```
/Users/apple/Desktop/twisha/android/app/build/outputs/apk/release/
```

The files will be named:

- `app-armeabi-v7a-release.apk` (for 32-bit ARM devices)
- `app-arm64-v8a-release.apk` (for 64-bit ARM devices - most modern phones)
- `app-x86-release.apk` (for 32-bit x86 devices - emulators)
- `app-x86_64-release.apk` (for 64-bit x86 devices - emulators)

### Most Important APK

For distribution to real Android devices, you'll primarily need:

- **`app-arm64-v8a-release.apk`** - For modern Android phones (64-bit)
- **`app-armeabi-v7a-release.apk`** - For older Android phones (32-bit)

## Next Steps

### Option 1: Build Locally

```bash
cd /Users/apple/Desktop/twisha/android
./gradlew clean
./gradlew assembleRelease
```

### Option 2: Rebuild on Codemagic

1. Commit and push these changes to GitHub
2. Trigger a new build on Codemagic
3. The build should now complete successfully with the increased memory

## Verification

After the build completes, you can verify the APK files:

```bash
ls -lh /Users/apple/Desktop/twisha/android/app/build/outputs/apk/release/
```

This will show all generated APK files with their sizes.

## Alternative: Generate AAB Instead

If memory issues persist, consider generating an Android App Bundle (AAB) instead:

```bash
./gradlew bundleRelease
```

The AAB will be at:

```
/Users/apple/Desktop/twisha/android/app/build/outputs/bundle/release/app-release.aab
```

AAB files are smaller and can be uploaded to Google Play Store, which will generate optimized APKs for each device configuration.
