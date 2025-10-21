import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';
import { ActivityPeriod } from './activity-period.entity';

@Entity("screenshots")
@Index("idx_screenshots_user_time_deleted", ["userId", "capturedAt", "isDeleted"])
@Index("idx_screenshots_session", ["sessionId"])
export class Screenshot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.screenshots)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: 'uuid', nullable: false }) // MANDATORY - Cannot be null
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.screenshots, {
    nullable: false, // MANDATORY relationship
    onDelete: 'CASCADE' // Delete screenshot when session is deleted
  })
  @JoinColumn({ name: "sessionId" })
  session: Session;

  @Column({ type: 'varchar', nullable: true }) // S3 URL - nullable for local screenshots not yet uploaded
  url: string;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'timestamptz' })
  capturedAt: Date;

  @Column({
    type: "enum",
    enum: ["client_hours", "command_hours"],
  })
  mode: string;

  @Column({ type: 'text', nullable: true })
  notes: string; // Copy of session task

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  trackerVersion: string; // Version of the desktop tracker app

  @OneToMany(() => ActivityPeriod, activityPeriod => activityPeriod.screenshot)
  activityPeriods: ActivityPeriod[];

  @CreateDateColumn()
  createdAt: Date;
}
