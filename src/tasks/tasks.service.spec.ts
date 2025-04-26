import { Test, TestingModule } from '@nestjs/testing';
import { TasksService, TaskStatusEnum } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as process from "process";

jest.mock('uuid');
jest.mock('process', () => ({
  env: {
    USER_RATE_LIMIT: '5',
    USER_RATE_LIMIT_WINDOW_MS: '60000',
    GLOBAL_RATE_LIMIT: '20',
    GLOBAL_RATE_LIMIT_WINDOW_MS: '300000',
  },
}));

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService],
    }).compile();
    service = module.get<TasksService>(TasksService);
    (service as any).tasksByUser = new Map();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTaskInternal', () => {
    it('should create a new task with start and end times', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 1000);
      const endTime = new Date(now.getTime() + 2000);
      const createTaskDto: CreateTaskDto = {
        userId: 'user123',
        description: 'Test Task',
        startTime,
        endTime,
      };
      (uuidv4 as jest.Mock).mockReturnValue('new-task-id');

      const newTask = service.createTaskInternal(createTaskDto, now);

      expect(newTask.id).toBe('new-task-id');
      expect(newTask.userId).toBe('user123');
      expect(newTask.description).toBe('Test Task');
      expect(newTask.isDone).toBe(false);
      expect(newTask.createdAt).toEqual(now);
      expect(newTask.startTime).toEqual(startTime);
      expect(newTask.endTime).toEqual(endTime);
      expect((service as any).tasksByUser.get('user123')).toEqual([newTask]);
    });

    it('should throw ConflictException if time collision exists', () => {
      const now = new Date();
      const startTime1 = new Date(now.getTime() + 1000);
      const endTime1 = new Date(now.getTime() + 2000);
      const existingTask = {
        id: 'existing-id',
        userId: 'user123',
        description: 'Existing Task',
        isDone: false,
        createdAt: now,
        startTime: startTime1,
        endTime: endTime1,
      };
      (service as any).tasksByUser.set('user123', [existingTask]);

      const startTime2 = new Date(now.getTime() + 1500);
      const endTime2 = new Date(now.getTime() + 2500);
      const createTaskDto: CreateTaskDto = {
        userId: 'user123',
        description: 'Conflicting Task',
        startTime: startTime2,
        endTime: endTime2,
      };

      expect(() => service.createTaskInternal(createTaskDto, new Date())).toThrowError(HttpException);
      expect(() => service.createTaskInternal(createTaskDto, new Date())).toThrowError('New task time range overlaps with existing tasks.');
    });

    it('should not throw ConflictException if no time collision exists', () => {
      const now = new Date();
      const startTime1 = new Date(now.getTime() + 1000);
      const endTime1 = new Date(now.getTime() + 2000);
      const existingTask = {
        id: 'existing-id',
        userId: 'user123',
        description: 'Existing Task',
        isDone: false,
        createdAt: now,
        startTime: startTime1,
        endTime: endTime1,
      };
      (service as any).tasksByUser.set('user123', [existingTask]);

      const startTime2 = new Date(now.getTime() + 3000);
      const endTime2 = new Date(now.getTime() + 4000);
      const createTaskDto: CreateTaskDto = {
        userId: 'user123',
        description: 'Non-conflicting Task',
        startTime: startTime2,
        endTime: endTime2,
      };

      expect(() => service.createTaskInternal(createTaskDto, new Date())).not.toThrowError();
    });
  });

  describe('findAll', () => {
    it('should return all tasks when no status is provided', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: false, createdAt: now, startTime: now, endTime: now };
      const task2 = { id: '2', userId: 'user2', description: 'Task 2', isDone: true, createdAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([
        ['user1', [task1]],
        ['user2', [task2]],
      ]);

      const result = service.findAll();

      expect(result).toEqual([task1, task2]);
    });

    it('should return tasks filtered by status', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: false, createdAt: now, startTime: now, endTime: now };
      const task2 = { id: '2', userId: 'user2', description: 'Task 2', isDone: true, createdAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([
        ['user1', [task1]],
        ['user2', [task2]],
      ]);

      const openTasks = service.findAll(TaskStatusEnum.OPEN);
      const doneTasks = service.findAll(TaskStatusEnum.DONE);

      expect(openTasks).toEqual([task1]);
      expect(doneTasks).toEqual([task2]);
    });
  });

  describe('findByUser', () => {
    it('should return tasks for a specific user', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: false, createdAt: now, startTime: now, endTime: now };
      const task2 = { id: '2', userId: 'user1', description: 'Task 2', isDone: true, createdAt: now, startTime: now, endTime: now };
      const task3 = { id: '3', userId: 'user2', description: 'Task 3', isDone: false, createdAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([
        ['user1', [task1, task2]],
        ['user2', [task3]],
      ]);

      const user1Tasks = service.findByUser('user1');

      expect(user1Tasks).toEqual([task1, task2]);
    });

    it('should return tasks for a user filtered by status', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: false, createdAt: now, startTime: now, endTime: now };
      const task2 = { id: '2', userId: 'user1', description: 'Task 2', isDone: true, createdAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([
        ['user1', [task1, task2]],
      ]);

      const openTasks = service.findByUser('user1', TaskStatusEnum.OPEN);
      const doneTasks = service.findByUser('user1', TaskStatusEnum.DONE);

      expect(openTasks).toEqual([task1]);
      expect(doneTasks).toEqual([task2]);
    });

    it('should return an empty array if user has no tasks', () => {
      (service as any).tasksByUser = new Map();
      const result = service.findByUser('nonexistent-user');
      expect(result).toEqual([]);
    });
  });

  describe('markAsDone', () => {
    it('should mark a task as done', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: false, createdAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([['user1', [task1]]]);

      const updatedTask = service.markAsDone('1', 'user1');

      expect(updatedTask.isDone).toBe(true);
      expect(updatedTask.completedAt).toBeInstanceOf(Date);
      expect((service as any).tasksByUser.get('user1')[0]).toEqual(updatedTask);
    });

    it('should return the task if it is already done', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: true, createdAt: now, completedAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([['user1', [task1]]]);
      const result = service.markAsDone('1', 'user1');
      expect(result).toEqual(task1);
    });

    it('should throw NotFoundException if user has no tasks', () => {
      (service as any).tasksByUser = new Map();
      expect(() => service.markAsDone('1', 'nonexistent-user')).toThrowError(NotFoundException);
      expect(() => service.markAsDone('1', 'nonexistent-user')).toThrowError('Tasks not found for user nonexistent-user');
    });

    it('should throw NotFoundException if task is not found for the user', () => {
      const now = new Date();
      const task1 = { id: '1', userId: 'user1', description: 'Task 1', isDone: false, createdAt: now, startTime: now, endTime: now };
      (service as any).tasksByUser = new Map([['user1', [task1]]]);
      expect(() => service.markAsDone('nonexistent-task', 'user1')).toThrowError(NotFoundException);
      expect(() => service.markAsDone('nonexistent-task', 'user1')).toThrowError('Task with ID nonexistent-task not found for user user1');
    });
  });
});