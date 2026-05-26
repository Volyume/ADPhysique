# Latest Maestro E2E status

- **Run number**: 12
- **Run URL**: https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/runs/26436303595
- **Branch**: `main`
- **Commit**: `b41f77d1885fb94748161bfe63d4d439106bc40d`
- **Tag run**: `smoke`
- **Triggered at**: 2026-05-26T06:49:20Z
- **Job status**: `success`

## Step outcomes

| Step | Outcome |
|---|---|
| Install dependencies | `success` |
| Install Maestro CLI  | `success` |
| Build debug APK      | `success` |
| Run Maestro flows    | `failure` |

## Logs

_gradle-diagnose.log not produced_

<details><summary>prebuild.log (last 60 lines)</summary>

```
Warning! Your git working tree is dirty.
It's recommended to commit all your changes before proceeding, so you can revert the changes made by this command if necessary.
Git status is dirty but the command will continue because the terminal is not interactive.
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
> Task :react-native-screens:assembleDebug
> Task :react-native-svg:extractDebugAnnotations
> Task :react-native-svg:extractDeepLinksForAarDebug
> Task :react-native-svg:mergeDebugGeneratedProguardFiles
> Task :react-native-svg:mergeDebugConsumerProguardFiles
> Task :react-native-svg:prepareDebugArtProfile
> Task :react-native-svg:prepareLintJarForPublish
> Task :react-native-svg:mergeDebugJavaResource
> Task :react-native-vision-camera:stripDebugDebugSymbols
> Task :react-native-svg:syncDebugLibJars
> Task :react-native-svg:bundleDebugAar
> Task :react-native-svg:assembleDebug
> Task :react-native-vision-camera:extractDebugAnnotations
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

BUILD SUCCESSFUL in 10m 56s
1480 actionable tasks: 1468 executed, 12 up-to-date
```

</details>

<details><summary>adb-install.log (last 40 lines)</summary>

```
Performing Streamed Install
Success
```

</details>

_maestro-output/run.log not produced_
