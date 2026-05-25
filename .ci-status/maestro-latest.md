# Latest Maestro E2E status

- **Run number**: 3
- **Run URL**: https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/runs/26409249579
- **Branch**: `claude/volyume-food-logging-app-k8wtU`
- **Commit**: `ce6f0465779b19d55ff2df355c2c1d5d147e4e3c`
- **Tag run**: `smoke`
- **Triggered at**: 2026-05-25T16:08:45Z
- **Job status**: `success`

## Step outcomes

| Step | Outcome |
|---|---|
| Install dependencies | `success` |
| Install Maestro CLI  | `success` |
| Build debug APK      | `success` |
| Run Maestro flows    | `failure` |

## Logs

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
> Task :expo-sqlite:preDebugBuild UP-TO-DATE
> Task :expo-store-review:preBuild UP-TO-DATE
> Task :expo-store-review:preDebugBuild UP-TO-DATE
> Task :expo-sharing:writeDebugAarMetadata
> Task :expo-sqlite:writeDebugAarMetadata
> Task :expo-store-review:writeDebugAarMetadata
> Task :expo-structured-headers:preBuild UP-TO-DATE
> Task :expo-structured-headers:preDebugBuild UP-TO-DATE
> Task :expo-task-manager:preBuild UP-TO-DATE
> Task :expo-task-manager:preDebugBuild UP-TO-DATE
> Task :expo-structured-headers:writeDebugAarMetadata
> Task :expo-updates:preBuild UP-TO-DATE
> Task :expo-updates:preDebugBuild UP-TO-DATE
> Task :expo-task-manager:writeDebugAarMetadata
> Task :expo-updates-interface:preBuild UP-TO-DATE
> Task :expo-updates:writeDebugAarMetadata
> Task :expo-updates-interface:preDebugBuild UP-TO-DATE
> Task :expo-updates-interface:writeDebugAarMetadata
> Task :expo-web-browser:preBuild UP-TO-DATE
> Task :expo-web-browser:preDebugBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:preBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:preDebugBuild UP-TO-DATE
> Task :expo-web-browser:writeDebugAarMetadata
> Task :react-native-gesture-handler:preBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:writeDebugAarMetadata
> Task :react-native-gesture-handler:preDebugBuild UP-TO-DATE
> Task :react-native-iap:preBuild UP-TO-DATE
> Task :react-native-gesture-handler:writeDebugAarMetadata
> Task :react-native-iap:prePlayDebugBuild UP-TO-DATE
> Task :react-native-iap:writePlayDebugAarMetadata
> Task :react-native-ml-kit_text-recognition:preBuild UP-TO-DATE
> Task :react-native-ml-kit_text-recognition:preDebugBuild UP-TO-DATE
> Task :react-native-reanimated:assertLatestReactNativeWithNewArchitectureTask SKIPPED
> Task :react-native-reanimated:assertMinimalReactNativeVersionTask SKIPPED
> Task :react-native-ml-kit_text-recognition:writeDebugAarMetadata
> Task :react-native-reanimated:prepareHeadersForPrefab
> Task :react-native-reanimated:preBuild
> Task :react-native-reanimated:preDebugBuild
> Task :react-native-safe-area-context:preBuild UP-TO-DATE
> Task :react-native-reanimated:writeDebugAarMetadata
> Task :react-native-safe-area-context:preDebugBuild UP-TO-DATE
> Task :react-native-screens:preBuild UP-TO-DATE
> Task :react-native-screens:preDebugBuild UP-TO-DATE
> Task :react-native-safe-area-context:writeDebugAarMetadata
> Task :react-native-svg:preBuild UP-TO-DATE
> Task :react-native-svg:preDebugBuild UP-TO-DATE
> Task :react-native-screens:writeDebugAarMetadata
> Task :react-native-svg:writeDebugAarMetadata
> Task :react-native-vision-camera:prepareHeaders
> Task :react-native-vision-camera:preBuild
> Task :react-native-vision-camera:preDebugBuild
> Task :react-native-webview:preBuild UP-TO-DATE
> Task :react-native-webview:preDebugBuild UP-TO-DATE
> Task :react-native-vision-camera:writeDebugAarMetadata
> Task :rest-timer-live:preBuild UP-TO-DATE
> Task :rest-timer-live:preDebugBuild UP-TO-DATE
> Task :react-native-webview:writeDebugAarMetadata
> Task :sentry_react-native:preBuild UP-TO-DATE
> Task :sentry_react-native:preDebugBuild UP-TO-DATE
> Task :rest-timer-live:writeDebugAarMetadata
> Task :sentry_react-native:writeDebugAarMetadata
> Task :shopify_react-native-skia:prepareHeaders
> Task :shopify_react-native-skia:preBuild
> Task :shopify_react-native-skia:preDebugBuild
> Task :unimodules-app-loader:preBuild UP-TO-DATE
> Task :unimodules-app-loader:preDebugBuild UP-TO-DATE
> Task :shopify_react-native-skia:writeDebugAarMetadata
> Task :unimodules-app-loader:writeDebugAarMetadata
> Task :app:generateDebugResValues

> Task :app:checkDebugAarMetadata
WARNING: [Processor] Library '/home/runner/.gradle/caches/modules-2/files-2.1/com.google.android.exoplayer/exoplayer-ui/2.18.1/eed81d49b8b0e9a365cbec260dafb222d6e5bc67/exoplayer-ui-2.18.1.aar' contains references to both AndroidX and old support library. This seems like the library is partially migrated. Jetifier will try to rewrite the library anyway.
 Example of androidX reference: 'androidx/core/app/NotificationCompat$Builder'
 Example of support library reference: 'android/support/v4/media/session/MediaSessionCompat$Token'

> Task :app:checkDebugAarMetadata FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:checkDebugAarMetadata'.
> Could not resolve all files for configuration ':app:debugRuntimeClasspath'.
   > Failed to transform react-android-0.74.5-debug.aar (com.facebook.react:react-android:0.74.5) to match attributes {artifactType=android-aar-metadata, com.android.build.api.attributes.BuildTypeAttr=debug, org.gradle.category=library, org.gradle.dependency.bundling=external, org.gradle.libraryelements=aar, org.gradle.status=release, org.gradle.usage=java-runtime}.
      > Execution failed for JetifyTransform: /home/runner/.gradle/caches/modules-2/files-2.1/com.facebook.react/react-android/0.74.5/c80a0b28c8c97d879209b811418fd98efa8959ce/react-android-0.74.5-debug.aar.
         > Java heap space

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.9/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD FAILED in 4m 24s
68 actionable tasks: 68 executed
```

</details>

<details><summary>adb-install.log (last 40 lines)</summary>

```
Performing Streamed Install
adb: failed to stat android/app/build/outputs/apk/debug/app-debug.apk: No such file or directory
```

</details>

_maestro-output/run.log not produced_
