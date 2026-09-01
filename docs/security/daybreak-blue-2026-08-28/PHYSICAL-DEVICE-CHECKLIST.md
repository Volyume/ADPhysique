# Daybreak physical-device closure checklist

Use synthetic accounts/data on release-equivalent signed iOS and Android
builds from the accepted integration SHA. Record device/OS/build SHA, expected
result, actual result and artifact for every row. A refusal must leave the prior
identity/data state intact or publish no authenticated identity.

## Auth callbacks

- Install a competing app that claims `volyume://`; exercise legitimate,
  forged, stale, replayed and two simultaneous signup/recovery callbacks.
- Kill the app before/after SecureStore write, callback consumption, OTP
  exchange and session publication; relaunch with the same callback.
- Move device time backward/forward across the ten-minute window.
- Sign out and perform A→B while an A callback is pending; deliver the old
  callback after B. Confirm no A session is published.
- After the controlled Universal Links rollout, repeat with the signed AASA
  build, Safari/Mail and the app installed/not installed.

## Account isolation

- Exercise A→B→A with an active workout, notification schedule, Zustand state,
  background sync/purchase work and navigation history populated.
- Hold an A network/database promise until after B begins admission; release it
  late and verify epoch checks prevent any A mutation/publication.
- Fault-inject SQLite wipe/verification, AsyncStorage wipe/verification,
  notification cancellation and owner-marker read/write/readback. B must not be
  published. Repeat SIGNED_OUT and SIGNED_IN events during each failure.

## SQLCipher and OS storage

- Inspect database, WAL and shared-memory headers after first unlock; no
  plaintext schema/user strings may be recoverable.
- Test key unavailable, wrong key, concurrent open, process death during
  migration/swap and recovery from each intermediate file set.
- Inspect iOS/Android device backup and cloud-backup eligibility for database,
  WAL, SecureStore/Keychain/Keystore, photos, avatars, exports and temp files.

## Images

- Import corrupt JPEG, wrong MIME/extension, Android content URI, APP1 EXIF/GPS,
  COM metadata, extreme dimensions and a decompression-bomb corpus on a
  low-memory device.
- Force sanitizer failure and interruption after partial output. Verify no raw
  or partial private image remains and temp/cache cleanup is complete.
- Directly request deletion of a foreign owner, similar-prefix owner, traversal
  path and legacy shared path; verify refusal and foreign file survival.

## Native fuzz

- Feed NaN/infinities, huge epochs/dimensions/arrays/strings through
  notifications, Live Activities, timer, Reanimated, Skia/SVG, camera,
  OCR/barcode and each custom native module.
- Record crash, hang, memory pressure and persistent-state behavior; repeat
  after background/foreground and process restart.

## Store identity/lifecycle

- On Apple and Google, attempt an A purchase/receipt/token while signed into B;
  exercise missing/wrong buyer identifier, duplicate/replay, restore, lapse,
  cancellation/refund, offline recovery and old-client payloads.
- Verify the durable server tier changes only when the independently validated
  store buyer equals the validated Supabase caller; local UI tier never survives
  refresh/sign-out as an entitlement source.
