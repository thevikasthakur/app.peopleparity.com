import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { ActivityPeriod } from './activity-period.entity';
import { Screenshot } from './screenshot.entity';

export type SessionMode = 'client_hours' | 'command_hours';

@Entity('sessions')
export class Session {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, user => user.sessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, project => project.sessions, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({
    type: 'enum',
    enum: ['client_hours', 'command_hours']
  })
  mode: SessionMode;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  task: string;

  @Column({ type: 'varchar', nullable: true })
  appVersion: string;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string; // Stores hostname of the device

  @Column({ type: 'varchar', nullable: true, length: 45 })
  realIpAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  location: { lat: number; lon: number } | null;

  @Column({ type: 'boolean', default: false })
  isVpnDetected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ActivityPeriod, period => period.session)
  activityPeriods: ActivityPeriod[];

  @OneToMany(() => Screenshot, screenshot => screenshot.session)
  screenshots: Screenshot[];
}