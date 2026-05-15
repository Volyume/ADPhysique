import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, children } from '@nozbe/watermelondb/decorators';

export default class Routine extends Model {
  static table = 'routines';
  static associations = {
    routine_exercises: { type: 'has_many', foreignKey: 'routine_id' },
  };

  @text('server_id') serverId;
  @text('user_id') userId;
  @text('name') name;
  @text('description') description;
  @text('split_type') splitType;
  @field('is_active') isActive;
  @readonly @date('created_at') createdAt;
  @date('updated_at') updatedAt;

  @children('routine_exercises') exercises;
}
