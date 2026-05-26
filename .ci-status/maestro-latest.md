# Latest Maestro E2E status

- **Run number**: 16
- **Run URL**: https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/runs/26445792285
- **Branch**: `main`
- **Commit**: `4f3f26fe70680635c52c363d723df2fb1998eadc`
- **Tag run**: `smoke`
- **Triggered at**: 2026-05-26T10:20:33Z
- **Job status**: `failure`

## Step outcomes

| Step | Outcome |
|---|---|
| Install dependencies | `success` |
| Install Maestro CLI  | `success` |
| Build debug APK      | `success` |
| Run Maestro flows    | `failure` |

## Logs

<details><summary>gradle-diagnose.log (last 80 lines)</summary>

```
# IDE (e.g. Android Studio) users:
# Gradle settings configured through the IDE *will override*
# any settings specified in this file.

# For more details on how to configure your build environment visit
# http://www.gradle.org/docs/current/userguide/build_environment.html

# Specifies the JVM arguments used for the daemon process.
# The setting is particularly useful for tweaking memory settings.
# Default value: -Xmx512m -XX:MaxMetaspaceSize=256m

# When configured, Gradle will run in incubating parallel mode.
# This option should only be used with decoupled projects. More details, visit
# http://www.gradle.org/docs/current/userguide/multi_project_builds.html#sec:decoupled_projects
# org.gradle.parallel=true

# AndroidX package structure to make it clearer which packages are bundled with the
# Android operating system, and which are packaged with your app's APK
# https://developer.android.com/topic/libraries/support-library/androidx-rn
android.useAndroidX=true

# Automatically convert third-party libraries to use AndroidX
android.enableJetifier=true

# Enable AAPT2 PNG crunching
android.enablePngCrunchInReleaseBuilds=true

# Use this property to specify which architecture you want to build.
# You can also override it from the CLI using
# ./gradlew <task> -PreactNativeArchitectures=x86_64
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64

# Use this property to enable support to the new architecture.
# This will allow you to use TurboModules and the Fabric render in
# your application. You should enable this flag either if you want
# to write custom TurboModules/Fabric components OR use libraries that
# are providing them.
newArchEnabled=false

# Use this property to enable or disable the Hermes JS engine.
# If set to false, you will be using JSC instead.
hermesEnabled=true

# Enable GIF support in React Native images (~200 B increase)
expo.gif.enabled=true
# Enable webp support in React Native images (~85 KB increase)
expo.webp.enabled=true
# Enable animated webp support (~3.4 MB increase)
# Disabled by default because iOS doesn't support animated webp
expo.webp.animated=false

# Enable network inspector
EX_DEV_CLIENT_NETWORK_INSPECTOR=true

# Use legacy packaging to compress native libraries in the resulting APK.
expo.useLegacyPackaging=false

android.minSdkVersion=24
android.compileSdkVersion=34
android.targetSdkVersion=35
android.extraMavenRepos=[]
VisionCamera_enableCodeScanner=trueorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

=== ~/.gradle/gradle.properties (if any) ===
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

=== Relevant env vars ===
JAVA_TOOL_OPTIONS=<unset>
_JAVA_OPTIONS=<unset>
JAVA_OPTS=<unset>
GRADLE_OPTS=<unset>
GRADLE_USER_HOME=<unset>
JAVA_HOME=/opt/hostedtoolcache/Java_Temurin-Hotspot_jdk/17.0.19-10/x64

=== android/local.properties ===
(none)

=== gradle properties via gradlew (filtered) ===
VisionCamera_enableCodeScanner: trueorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.jvmargs: -Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

</details>

<details><summary>prebuild.log (last 60 lines)</summary>

```
Your git working tree is clean
To revert the changes after this command completes, you can run the following:
  git clean --force && git reset --hard
- Clearing android
✔ Cleared android code
- Creating native directory (./android)
✔ Created native directory
- Updating package.json
✔ Updated package.json | no changes
- Running prebuild
» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
- Running prebuild
✔ Finished prebuild
```

</details>

<details><summary>gradle-debug.log (last 100 lines)</summary>

```
> Task :react-native-screens:bundleDebugAar
> Task :react-native-screens:assembleDebug
> Task :react-native-svg:extractDeepLinksForAarDebug
> Task :react-native-svg:mergeDebugGeneratedProguardFiles
> Task :react-native-svg:mergeDebugConsumerProguardFiles
> Task :react-native-svg:prepareDebugArtProfile
> Task :react-native-svg:prepareLintJarForPublish
> Task :react-native-svg:mergeDebugJavaResource
> Task :react-native-vision-camera:extractDebugAnnotations
> Task :react-native-vision-camera:stripDebugDebugSymbols
> Task :react-native-svg:syncDebugLibJars
> Task :react-native-svg:bundleDebugAar
> Task :react-native-svg:assembleDebug
> Task :react-native-vision-camera:extractDeepLinksForAarDebug
> Task :react-native-vision-camera:mergeDebugGeneratedProguardFiles
> Task :react-native-vision-camera:mergeDebugConsumerProguardFiles
> Task :react-native-vision-camera:copyDebugJniLibsProjectAndLocalJars
> Task :react-native-vision-camera:externalNativeBuildDebug
> Task :react-native-vision-camera:generateJsonModelDebug
> Task :react-native-vision-camera:prefabDebugConfigurePackage
> Task :react-native-vision-camera:prefabDebugPackage
> Task :react-native-vision-camera:prepareDebugArtProfile
> Task :react-native-vision-camera:prepareLintJarForPublish
> Task :react-native-webview:stripDebugDebugSymbols NO-SOURCE
> Task :react-native-webview:copyDebugJniLibsProjectAndLocalJars
> Task :react-native-vision-camera:mergeDebugJavaResource
> Task :react-native-webview:extractDebugAnnotations
> Task :react-native-vision-camera:syncDebugLibJars
> Task :react-native-vision-camera:bundleDebugAar
> Task :react-native-vision-camera:assembleDebug
> Task :react-native-webview:extractDeepLinksForAarDebug
> Task :react-native-webview:mergeDebugGeneratedProguardFiles
> Task :react-native-webview:mergeDebugConsumerProguardFiles
> Task :react-native-webview:prepareDebugArtProfile
> Task :react-native-webview:prepareLintJarForPublish
> Task :rest-timer-live:stripDebugDebugSymbols NO-SOURCE
> Task :react-native-webview:mergeDebugJavaResource
> Task :rest-timer-live:copyDebugJniLibsProjectAndLocalJars
> Task :react-native-webview:syncDebugLibJars
> Task :react-native-webview:bundleDebugAar
> Task :react-native-webview:assembleDebug
> Task :rest-timer-live:extractDebugAnnotations
> Task :rest-timer-live:extractDeepLinksForAarDebug
> Task :rest-timer-live:mergeDebugGeneratedProguardFiles
> Task :rest-timer-live:mergeDebugConsumerProguardFiles
> Task :rest-timer-live:prepareDebugArtProfile
> Task :rest-timer-live:prepareLintJarForPublish
> Task :sentry_react-native:stripDebugDebugSymbols NO-SOURCE
> Task :sentry_react-native:copyDebugJniLibsProjectAndLocalJars
> Task :rest-timer-live:mergeDebugJavaResource
> Task :sentry_react-native:extractDebugAnnotations
> Task :rest-timer-live:syncDebugLibJars
> Task :rest-timer-live:bundleDebugAar
> Task :rest-timer-live:assembleDebug
> Task :sentry_react-native:extractDeepLinksForAarDebug
> Task :sentry_react-native:mergeDebugGeneratedProguardFiles
> Task :sentry_react-native:mergeDebugConsumerProguardFiles
> Task :sentry_react-native:prepareDebugArtProfile
> Task :sentry_react-native:prepareLintJarForPublish
> Task :sentry_react-native:mergeDebugJavaResource
> Task :shopify_react-native-skia:extractDebugAnnotations
> Task :sentry_react-native:syncDebugLibJars
> Task :sentry_react-native:bundleDebugAar
> Task :sentry_react-native:assembleDebug
> Task :shopify_react-native-skia:extractDeepLinksForAarDebug
> Task :shopify_react-native-skia:mergeDebugGeneratedProguardFiles
> Task :shopify_react-native-skia:mergeDebugConsumerProguardFiles
> Task :shopify_react-native-skia:stripDebugDebugSymbols
> Task :shopify_react-native-skia:externalNativeBuildDebug
> Task :shopify_react-native-skia:generateJsonModelDebug
> Task :shopify_react-native-skia:prefabDebugConfigurePackage
> Task :shopify_react-native-skia:copyDebugJniLibsProjectAndLocalJars
> Task :shopify_react-native-skia:prefabDebugPackage
> Task :shopify_react-native-skia:prepareDebugArtProfile
> Task :shopify_react-native-skia:prepareLintJarForPublish
> Task :unimodules-app-loader:stripDebugDebugSymbols NO-SOURCE
> Task :shopify_react-native-skia:mergeDebugJavaResource
> Task :unimodules-app-loader:copyDebugJniLibsProjectAndLocalJars
> Task :shopify_react-native-skia:syncDebugLibJars
> Task :shopify_react-native-skia:bundleDebugAar
> Task :shopify_react-native-skia:assembleDebug
> Task :unimodules-app-loader:extractDebugAnnotations
> Task :unimodules-app-loader:extractDeepLinksForAarDebug
> Task :unimodules-app-loader:mergeDebugGeneratedProguardFiles
> Task :unimodules-app-loader:mergeDebugConsumerProguardFiles
> Task :unimodules-app-loader:prepareDebugArtProfile
> Task :unimodules-app-loader:prepareLintJarForPublish
> Task :unimodules-app-loader:mergeDebugJavaResource
> Task :unimodules-app-loader:syncDebugLibJars
> Task :unimodules-app-loader:bundleDebugAar
> Task :unimodules-app-loader:assembleDebug

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.9/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 11m 22s
1508 actionable tasks: 1496 executed, 12 up-to-date
```

</details>

_adb-install.log not produced_

_maestro-output/run.log not produced_
