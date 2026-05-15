import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class RoutineExercise extends Model {
  static table = 'routine_exercises';
  static associations = {
    routines: { type: 'belongs_to', key: 'routine_id' },
  };

  @text('server_id') serverId;
  @text('routine_id') routineId;
  @text('exercise_id') exerciseId;
  @field('order_in_routine') orderInRoutine;
  @field('recommended_sets') recommendedSets;
  @field('recommended_reps_min') recommendedRepsMin;
  @field('recommended_reps_max') recommendedRepsMax;
  @text('notes') notes;
  @readonly @date('created_at') createdAt;

  @relation('routines', 'routine_id') routine;
}
