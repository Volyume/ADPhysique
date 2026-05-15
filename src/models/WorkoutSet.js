import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class WorkoutSet extends Model {
  static table = 'workout_sets';
  static associations = {
    workouts: { type: 'belongs_to', key: 'workout_id' },
  };

  @text('server_id') serverId;
  @text('user_id') userId;
  @text('workout_id') workoutId;
  @text('exercise_id') exerciseId;
  @field('set_number') setNumber;
  @text('set_type') setType;
  @field('target_reps_min') targetRepsMin;
  @field('target_reps_max') targetRepsMax;
  @field('actual_reps') actualReps;
  @field('weight') weight;
  @field('rir') rir;
  @field('rpe') rpe;
  @field('failed') failed;
  @text('notes') notes;
  @field('post_set_pump') postSetPump;
  @field('post_set_muscle_connection') postSetMuscleConnection;
  @field('joint_discomfort') jointDiscomfort;
  @field('is_amrap') isAmrap;
  @field('amrap_reps') amrapReps;
  @readonly @date('created_at') createdAt;
  @date('updated_at') updatedAt;

  @relation('workouts', 'workout_id') workout;
}
