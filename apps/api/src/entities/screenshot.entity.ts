import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';
import { ActivityPeriod } from './activity-period.entity';

@Entity("screenshots")
export class Screenshot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.screenshots)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ nullable: true }) // Temporarily nullable for migration
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.screenshots, {
    nullable: true,
  })
  @JoinColumn({ name: "sessionId" })
  session: Session;

  @Column({ nullable: true }) // S3 URL - nullable for local screenshots not yet uploaded
  url: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'timestamp' })
  capturedAt: Date;

  @Column({
    type: "enum",
    enum: ["client_hours", "command_hours"],
  })
  mode: string;

  @Column({ type: "int", default: 0 })
  aggregatedScore: number; // Average score from 10 periods (0-100)

  @Column({ type: "text", nullable: true })
  activityPeriodIds: string; // JSON string array of the 10 activity period IDs

  @Column({ nullable: true })
  notes: string; // Copy of session task

  @Column({ default: false })
  isDeleted: boolean;

  @OneToMany(() => ActivityPeriod, activityPeriod => activityPeriod.screenshot)
  activityPeriods: ActivityPeriod[];

  @CreateDateColumn()
  createdAt: Date;
}
