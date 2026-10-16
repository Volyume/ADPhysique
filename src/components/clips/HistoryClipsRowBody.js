/**
 * HistoryClipsRowBody - the drawn half of HistoryClipsRow: a NavRow inside a
 * NavGroup ("Your videos", with the count) and the sheet it opens. Named house
 * parts only. No suppression read, on purpose: see HistoryClipsRow.js.
 */
import { NavRow, NavGroup } from '../NavRow';
import ClipsSheet from './ClipsSheet';
import { CLIP_STRINGS, clipCountLabel } from '../../lib/clips/rules';

export default function HistoryClipsRowBody({
  count, open, onOpen, onClose, onChanged, userId, workoutId,
}) {
  return (
    <>
      {count > 0 ? (
        <NavGroup>
          <NavRow
            icon="videocam-outline"
            label={CLIP_STRINGS.yourVideos}
            sub={clipCountLabel(count)}
            onPress={onOpen}
          />
        </NavGroup>
      ) : null}
      <ClipsSheet
        visible={open}
        onClose={onClose}
        userId={userId}
        workoutId={workoutId}
        onChanged={onChanged}
      />
    </>
  );
}
