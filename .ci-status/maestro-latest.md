# Latest Maestro E2E status

- **Run number**: 4
- **Run URL**: https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/runs/26409561795
- **Branch**: `claude/volyume-food-logging-app-k8wtU`
- **Commit**: `7e905b90b20d8bbeee125c9137f7de688c4bf74d`
- **Tag run**: `smoke`
- **Triggered at**: 2026-05-25T16:16:37Z
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
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:pluginDescriptors
> Task :expo-updates-gradle-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
> Task :expo-updates-gradle-plugin:compileKotlin
> Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
> Task :expo-updates-gradle-plugin:classes
> Task :expo-updates-gradle-plugin:jar

> Configure project :app
 ℹ️  [33mApplying gradle plugin[0m '[32mexpo-updates-gradle-plugin[0m' (expo-updates@0.25.28)

> Configure project :expo-av
Checking the license for package NDK (Side by side) 26.1.10909125 in /usr/local/lib/android/sdk/licenses
License for package NDK (Side by side) 26.1.10909125 accepted.
Preparing "Install NDK (Side by side) 26.1.10909125 v.26.1.10909125".
"Install NDK (Side by side) 26.1.10909125 v.26.1.10909125" ready.
Installing NDK (Side by side) 26.1.10909125 in /usr/local/lib/android/sdk/ndk/26.1.10909125
"Install NDK (Side by side) 26.1.10909125 v.26.1.10909125" complete.
"Install NDK (Side by side) 26.1.10909125 v.26.1.10909125" finished.

> Configure project :expo-sqlite
Checking the license for package NDK (Side by side) 25.1.8937393 in /usr/local/lib/android/sdk/licenses
License for package NDK (Side by side) 25.1.8937393 accepted.
Preparing "Install NDK (Side by side) 25.1.8937393 v.25.1.8937393".
"Install NDK (Side by side) 25.1.8937393 v.25.1.8937393" ready.
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

The Daemon will expire after the build after running out of JVM heap space.
The project memory settings are likely not configured or are configured to an insufficient value.
The daemon will restart for the next build, which may increase subsequent build times.
These settings can be adjusted by setting 'org.gradle.jvmargs' in 'gradle.properties'.
The currently configured max heap space is '512 MiB' and the configured max metaspace is '384 MiB'.
For more information on how to set these values, please refer to https://docs.gradle.org/8.9/userguide/build_environment.html#sec:configuring_jvm_memory in the Gradle documentation.
To disable this warning, set 'org.gradle.daemon.performance.disable-logging=true'.
Daemon will be stopped at the end of the build after running out of JVM heap space
The Daemon will expire immediately since the JVM garbage collector is thrashing.
The project memory settings are likely not configured or are configured to an insufficient value.
The memory settings for this project must be adjusted to avoid this failure.
These settings can be adjusted by setting 'org.gradle.jvmargs' in 'gradle.properties'.
The currently configured max heap space is '512 MiB' and the configured max metaspace is '384 MiB'.
For more information on how to set these values, please refer to https://docs.gradle.org/8.9/userguide/build_environment.html#sec:configuring_jvm_memory in the Gradle documentation.
To disable this warning, set 'org.gradle.daemon.performance.disable-logging=true'.
Daemon is stopping immediately since the JVM garbage collector is thrashing

FAILURE: Build failed with an exception.

* What went wrong:
Gradle build daemon has been stopped: since the JVM garbage collector is thrashing

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
```

</details>

<details><summary>adb-install.log (last 40 lines)</summary>

```
Performing Streamed Install
adb: failed to stat android/app/build/outputs/apk/debug/app-debug.apk: No such file or directory
```

</details>

_maestro-output/run.log not produced_
