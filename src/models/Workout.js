import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, children } from '@nozbe/watermelondb/decorators';

export default class Workout extends Model {
  static table = 'workouts';
  static associations = {
    workout_sets: { type: 'has_many', foreignKey: 'workout_id' },
  };

  @text('server_id') serverId;
  @text('user_id') userId;
  @text('routine_id') routineId;
  @text('mesocycle_id') mesocycleId;
  @field('started_at') startedAt;
  @field('ended_at') endedAt;
  @field('duration_minutes') durationMinutes;
  @text('notes') notes;
  @field('session_difficulty') sessionDifficulty;
  @field('overall_pump') overallPump;
  @field('soreness_24h_before') soreness24hBefore;
  @field('fatigue_level') fatigueLevel;
  @field('is_completed') isCompleted;
  @readonly @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced_at') syncedAt;

  @children('workout_sets') sets;
}
