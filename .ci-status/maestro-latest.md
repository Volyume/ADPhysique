# Latest Maestro E2E status

- **Run number**: 2
- **Run URL**: https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/runs/26408914204
- **Branch**: `claude/volyume-food-logging-app-k8wtU`
- **Commit**: `d456f21ff193ca4919c1ff51ab14211cf3eb2d51`
- **Tag run**: `smoke`
- **Triggered at**: 2026-05-25T15:59:30Z
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
Installing NDK (Side by side) 25.1.8937393 in /usr/local/lib/android/sdk/ndk/25.1.8937393
"Install NDK (Side by side) 25.1.8937393 v.25.1.8937393" complete.
"Install NDK (Side by side) 25.1.8937393 v.25.1.8937393" finished.

> Configure project :expo

Using expo modules
  - [32mexpo-application[0m (5.9.1)
  - [32mexpo-asset[0m (10.0.10)
  - [32mexpo-av[0m (14.0.7)
  - [32mexpo-background-fetch[0m (12.0.1)
  - [32mexpo-constants[0m (16.0.2)
  - [32mexpo-document-picker[0m (12.0.2)
  - [32mexpo-eas-client[0m (0.12.0)
  - [32mexpo-file-system[0m (17.0.1)
  - [32mexpo-font[0m (12.0.10)
  - [32mexpo-haptics[0m (13.0.1)
  - [32mexpo-image[0m (1.13.0)
  - [32mexpo-json-utils[0m (0.13.1)
  - [32mexpo-keep-awake[0m (13.0.2)
  - [32mexpo-linear-gradient[0m (13.0.2)
  - [32mexpo-manifests[0m (0.14.3)
  - [32mexpo-modules-core[0m (1.12.26)
  - [32mexpo-notifications[0m (0.28.19)
  - [32mexpo-print[0m (13.0.1)
  - [32mexpo-secure-store[0m (13.0.2)
  - [32mexpo-sensors[0m (13.0.9)
  - [32mexpo-sharing[0m (12.0.1)
  - [32mexpo-sqlite[0m (14.0.6)
  - [32mexpo-store-review[0m (7.0.2)
  - [32mexpo-structured-headers[0m (3.8.0)
  - [32mexpo-task-manager[0m (11.8.2)
  - [32mexpo-updates[0m (0.25.28)
  - [32mexpo-web-browser[0m (13.0.3)
  - [32mrest-timer-live[0m (0.1.0)
  - [32munimodules-app-loader[0m (4.6.0)


> Configure project :react-native-reanimated
Android gradle plugin: 8.2.1
Gradle: 8.8

> Configure project :react-native-vision-camera
[VisionCamera] Thank you for using VisionCamera ❤️
[VisionCamera] If you enjoy using VisionCamera, please consider sponsoring this project: https://github.com/sponsors/mrousavy
[VisionCamera] node_modules found at /home/runner/work/ADPhysique/ADPhysique/node_modules
[VisionCamera] VisionCamera_enableFrameProcessors is set to true!
[VisionCamera] react-native-worklets-core not found, Frame Processors are disabled!
[VisionCamera] VisionCamera_enableCodeScanner is set to true!

> Configure project :shopify_react-native-skia
react-native-skia: node_modules/ found at: /home/runner/work/ADPhysique/ADPhysique/node_modules
react-native-skia: RN Version: 74 / 0.74.5
react-native-skia: isSourceBuild: false
react-native-skia: PrebuiltDir: /home/runner/work/ADPhysique/ADPhysique/node_modules/@shopify/react-native-skia/android/build/react-native-0*/jni
react-native-skia: buildType: debug
react-native-skia: buildDir: /home/runner/work/ADPhysique/ADPhysique/node_modules/@shopify/react-native-skia/android/build
react-native-skia: node_modules: /home/runner/work/ADPhysique/ADPhysique/node_modules
react-native-skia: Enable Prefab: true
react-native-skia: aar state post 70, do nothing

FAILURE: Build failed with an exception.

* What went wrong:
Could not determine the dependencies of task ':app:compileDebugJavaWithJavac'.
> Could not resolve all dependencies for configuration ':app:debugCompileClasspath'.
   > Could not resolve project :react-native-iap.
     Required by:
         project :app
      > The consumer was configured to find a library for use during compile-time, preferably optimized for Android, as well as attribute 'com.android.build.api.attributes.AgpVersionAttr' with value '8.2.1', attribute 'com.android.build.api.attributes.BuildTypeAttr' with value 'debug', attribute 'org.jetbrains.kotlin.platform.type' with value 'androidJvm'. However we cannot choose between the following variants of project :react-native-iap:
          - amazonDebugApiElements
          - playDebugApiElements
        All of them match the consumer attributes:
          - Variant 'amazonDebugApiElements' capability Volyume:react-native-iap:unspecified declares a library for use during compile-time, preferably optimized for Android, as well as attribute 'com.android.build.api.attributes.AgpVersionAttr' with value '8.2.1', attribute 'com.android.build.api.attributes.BuildTypeAttr' with value 'debug', attribute 'org.jetbrains.kotlin.platform.type' with value 'androidJvm':
              - Unmatched attributes:
                  - Provides attribute 'com.android.build.api.attributes.ProductFlavor:store' with value 'amazon' but the consumer didn't ask for it
                  - Provides attribute 'com.android.build.gradle.internal.attributes.VariantAttr' with value 'amazonDebug' but the consumer didn't ask for it
                  - Provides attribute 'store' with value 'amazon' but the consumer didn't ask for it
          - Variant 'playDebugApiElements' capability Volyume:react-native-iap:unspecified declares a library for use during compile-time, preferably optimized for Android, as well as attribute 'com.android.build.api.attributes.AgpVersionAttr' with value '8.2.1', attribute 'com.android.build.api.attributes.BuildTypeAttr' with value 'debug', attribute 'org.jetbrains.kotlin.platform.type' with value 'androidJvm':
              - Unmatched attributes:
                  - Provides attribute 'com.android.build.api.attributes.ProductFlavor:store' with value 'play' but the consumer didn't ask for it
                  - Provides attribute 'com.android.build.gradle.internal.attributes.VariantAttr' with value 'playDebug' but the consumer didn't ask for it
                  - Provides attribute 'store' with value 'play' but the consumer didn't ask for it

* Try:
> Ambiguity errors are explained in more detail at https://docs.gradle.org/8.8/userguide/variant_model.html#sub:variant-ambiguity.
> Review the variant matching algorithm at https://docs.gradle.org/8.8/userguide/variant_attributes.html#sec:abm_algorithm.
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.8/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD FAILED in 3m 51s
15 actionable tasks: 15 executed
```

</details>

<details><summary>adb-install.log (last 40 lines)</summary>

```
Performing Streamed Install
adb: failed to stat android/app/build/outputs/apk/debug/app-debug.apk: No such file or directory
```

</details>

_maestro-output/run.log not produced_
