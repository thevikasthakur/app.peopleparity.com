import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';
import { Screenshot } from './screenshot.entity';

@Entity('activity_periods')
export class ActivityPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, session => session.activityPeriods)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.activityPeriods)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true }) // Optional - activity periods can exist without screenshots
  screenshotId: string;

  @ManyToOne(() => Screenshot, screenshot => screenshot.activityPeriods, { 
    nullable: true,  // Optional relationship
    onDelete: 'SET NULL' // Set to null when screenshot is deleted
  })
  @JoinColumn({ name: 'screenshotId' })
  screenshot: Screenshot;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  @Column({
    type: 'enum',
    enum: ['client_hours', 'command_hours']
  })
  mode: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'float', default: 0 })
  activityScore: number;

  @Column({ default: true })
  isValid: boolean;

  @Column({ nullable: true })
  classification: string;

  @Column({ type: 'jsonb', nullable: true })
  metrics: any;

  @CreateDateColumn()
  createdAt: Date;
}