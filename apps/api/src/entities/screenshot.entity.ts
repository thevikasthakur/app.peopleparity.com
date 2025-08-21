import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Session } from "./session.entity";

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

  @Column()
  url: string; // Full-size screenshot URL in S3

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: "timestamp" })
  capturedAt: Date; // When the screenshot was captured

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

  @CreateDateColumn()
  createdAt: Date;
}
