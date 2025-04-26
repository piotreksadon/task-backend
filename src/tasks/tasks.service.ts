import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { v4 as uuidv4 } from 'uuid';
import * as process from "process";

export enum TaskStatusEnum {
  OPEN = 'open',
  DONE = 'done',
}

@Injectable()
export class TasksService {
  private readonly tasksByUser: Map<string, Task[]> = new Map();
  private readonly userCreationTimestamps: Map<string, Date[]> = new Map();
  private globalCreationTimestamps: Date[] = [];

  private readonly USER_RATE_LIMIT = Number(process.env.USER_RATE_LIMIT);
  private readonly USER_RATE_LIMIT_WINDOW_MS = Number(process.env.USER_RATE_LIMIT_WINDOW_MS);

  private readonly GLOBAL_RATE_LIMIT = Number(process.env.GLOBAL_RATE_LIMIT);
  private readonly GLOBAL_RATE_LIMIT_WINDOW_MS = Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS)

  create(createTaskDto: CreateTaskDto): Task {
    const { userId, description } = createTaskDto;
    const now = new Date();

    this.checkUserRateLimit(userId, now);
    this.checkGlobalRateLimit(now);

    const newTask: Task = {
      id: uuidv4(),
      userId,
      description,
      isDone: false,
      createdAt: now,
    };

    const userTasks = this.tasksByUser.get(userId) || [];
    userTasks.push(newTask);
    this.tasksByUser.set(userId, userTasks);

    this.recordUserTimestamp(userId, now);
    this.recordGlobalTimestamp(now);

    console.info(`Task created: ${newTask.id} for user ${userId}`);
    return newTask;
  }

  findAll(status?: TaskStatusEnum): Task[] {
    const allTasks = Array.from(this.tasksByUser.values()).flat();

    if (!status) {
      return allTasks;
    }

    return allTasks.filter(task => task.isDone === (status === TaskStatusEnum.DONE));
  }

  findByUser(userId: string, status?: TaskStatusEnum): Task[] {
    const userTasks = this.tasksByUser.get(userId) || [];

    if (!status) {
      return userTasks;
    }

    return userTasks.filter(task => task.isDone === (status === TaskStatusEnum.DONE));
  }

  markAsDone(taskId: string, userId: string): Task {
    const userTasks = this.tasksByUser.get(userId);
    if (!userTasks) {
      throw new NotFoundException(`Tasks not found for user ${userId}`);
    }

    const taskIndex = userTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new NotFoundException(`Task with ID ${taskId} not found for user ${userId}`);
    }

    const task = userTasks[taskIndex];

    if (task.isDone) {
      console.info(`Task ${taskId} is already done.`);
      return task;
    }

    const updatedTask = {
      ...task,
      isDone: true,
      completedAt: new Date(),
    };

    userTasks[taskIndex] = updatedTask;
    this.tasksByUser.set(userId, userTasks);

    console.info(`Task ${taskId} marked as done for user ${userId}`);
    return updatedTask;
  }

  private checkUserRateLimit(userId: string, now: Date): void {
    const timestamps = this.userCreationTimestamps.get(userId) || [];
    const relevantTimestamps = timestamps.filter(
        ts => now.getTime() - ts.getTime() < this.USER_RATE_LIMIT_WINDOW_MS,
    );

    this.userCreationTimestamps.set(userId, relevantTimestamps);

    console.info(`User ${userId} has ${relevantTimestamps.length} recent tasks.`);

    if (relevantTimestamps.length >= this.USER_RATE_LIMIT) {
      console.warn(`User ${userId} exceeded rate limit.`);
      throw new HttpException(
          `User rate limit exceeded. Max ${this.USER_RATE_LIMIT} tasks per ${this.USER_RATE_LIMIT_WINDOW_MS / 1000} seconds per user.`,
          HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordUserTimestamp(userId: string, timestamp: Date): void {
    const timestamps = this.userCreationTimestamps.get(userId) || [];
    timestamps.push(timestamp);
    this.userCreationTimestamps.set(userId, timestamps);
  }

  private checkGlobalRateLimit(now: Date): void {
    this.globalCreationTimestamps = this.globalCreationTimestamps.filter(
        ts => now.getTime() - ts.getTime() < this.GLOBAL_RATE_LIMIT_WINDOW_MS,
    );

    console.log(`Global tasks in last 5 mins: ${this.globalCreationTimestamps.length}`);

    if (this.globalCreationTimestamps.length >= this.GLOBAL_RATE_LIMIT) {
      console.warn(`Global rate limit exceeded.`);
      throw new HttpException(
          `Global rate limit exceeded. Max ${this.GLOBAL_RATE_LIMIT} tasks per ${this.GLOBAL_RATE_LIMIT_WINDOW_MS / 1000} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordGlobalTimestamp(timestamp: Date): void {
    this.globalCreationTimestamps.push(timestamp);
  }
}