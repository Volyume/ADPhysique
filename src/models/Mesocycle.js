import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Mesocycle extends Model {
  static table = 'mesocycles';

  @text('server_id') serverId;
  @text('user_id') userId;
  @text('name') name;
  @text('start_date') startDate;
  @text('end_date') endDate;
  @field('duration_weeks') durationWeeks;
  @text('focus') focus;
  @text('goals') goals;
  @field('is_active') isActive;
  @field('deload_week') deloadWeek;
  @field('auto_regulation_enabled') autoRegulationEnabled;
  @readonly @date('created_at') createdAt;
  @date('updated_at') updatedAt;
}
