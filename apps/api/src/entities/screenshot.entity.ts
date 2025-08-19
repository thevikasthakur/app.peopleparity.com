import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ActivityPeriod } from './activity-period.entity';

@Entity('screenshots')
export class Screenshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.screenshots)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  activityPeriodId: string;

  @ManyToOne(() => ActivityPeriod, period => period.screenshots)
  @JoinColumn({ name: 'activityPeriodId' })
  activityPeriod: ActivityPeriod;

  @Column()
  s3Url: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'timestamp' })
  capturedAt: Date;

  @Column({
    type: 'enum',
    enum: ['client_hours', 'command_hours']
  })
  mode: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    aggregatedScore?: number;
    localCaptureTime?: Date;
    relatedPeriodIds?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;
}