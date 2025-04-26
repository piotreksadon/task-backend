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

  createTaskInternal(createTaskDto: CreateTaskDto, createdAt: Date): Task {
    const { userId, description, startTime, endTime } = createTaskDto;

    const userTasks = this.tasksByUser.get(userId) || [];

    if (this.checkTimeCollision(userId, startTime, endTime)) {
      console.warn(`Time collision detected for user ${userId}.`);
      throw new HttpException(
          'New task time range overlaps with existing tasks.',
          HttpStatus.CONFLICT,
      );
    }

    const newTask: Task = {
      id: uuidv4(),
      userId,
      description,
      isDone: false,
      createdAt,
      startTime,
      endTime,
    };

    userTasks.push(newTask);
    this.tasksByUser.set(userId, userTasks);

    console.info(`Task created: ${newTask.id} for user ${userId} from ${startTime} to ${endTime}`);
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

  private checkTimeCollision(userId: string, newStartTime: Date, newEndTime: Date): boolean {
    const userTasks = this.tasksByUser.get(userId) || [];
    return userTasks.some(task => {
      return (newStartTime < task.endTime && task.startTime < newEndTime);
    });
  }
}