import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Exercise extends Model {
  static table = 'exercises';

  @text('server_id') serverId;
  @text('user_id') userId;
  @text('name') name;
  @text('primary_muscle') primaryMuscle;
  @text('secondary_muscles') _secondaryMuscles;
  @text('equipment') equipment;
  @text('movement_pattern') movementPattern;
  @text('compound_isolation') compoundIsolation;
  @field('default_rep_min') defaultRepMin;
  @field('default_rep_max') defaultRepMax;
  @field('fatigue_cost') fatigueCost;
  @field('stimulus_to_fatigue_ratio') stimulusToFatigueRatio;
  @field('is_custom') isCustom;
  @text('notes') notes;
  @readonly @date('created_at') createdAt;
  @date('updated_at') updatedAt;

  get secondaryMuscles() {
    try {
      return this._secondaryMuscles ? JSON.parse(this._secondaryMuscles) : [];
    } catch {
      return [];
    }
  }
}
