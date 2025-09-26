import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Session } from './session.entity';
import { ActivityPeriod } from './activity-period.entity';
import { Screenshot } from './screenshot.entity';

export type UserRole = 'super_admin' | 'org_admin' | 'developer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  microsoftId: string;

  @Column({ type: 'varchar', default: 'local' })
  authProvider: 'local' | 'microsoft';

  @Column({
    type: 'enum',
    enum: ['super_admin', 'org_admin', 'developer'],
    default: 'developer'
  })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, org => org.users, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ type: 'varchar', default: 'Asia/Kolkata' })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Session, session => session.user)
  sessions: Session[];

  @OneToMany(() => ActivityPeriod, period => period.user)
  activityPeriods: ActivityPeriod[];

  @OneToMany(() => Screenshot, screenshot => screenshot.user)
  screenshots: Screenshot[];
}