import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService, TaskStatusEnum } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { ParseUUIDPipe, ValidationPipe } from '@nestjs/common';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    markAsDone: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call tasksService.create with the dto and return the created task', () => {
      const createTaskDto: CreateTaskDto = { userId: "9843rnfjknjrfn34fnu43nf", description: 'Test Task' };
      const createdTask: Task = {
        id: 'some-uuid',
        userId: 'user-uuid',
        description: 'Test Task',
        isDone: false,
        createdAt: new Date(),
      };

      mockTasksService.create.mockReturnValue(createdTask);

      const result = controller.create(createTaskDto);

      expect(tasksService.create).toHaveBeenCalledWith(createTaskDto);
      expect(result).toEqual(result);
    });
  });

  describe('findAll', () => {
    it('should call tasksService.findAll with no status and return all tasks', () => {
      const allTasks: Task[] = [
        { id: 'uuid1', userId: 'user-uuid', description: 'Task 1', isDone: false, createdAt: new Date() },
        { id: 'uuid2', userId: 'user-uuid', description: 'Task 2', isDone: true, createdAt: new Date(), completedAt: new Date() },
      ];
      mockTasksService.findAll.mockReturnValue(allTasks);

      const result = controller.findAll();

      expect(tasksService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(allTasks);
    });

    it('should call tasksService.findAll with a status and return filtered tasks', () => {
      const openTasks: Task[] = [{ id: 'uuid1', userId: 'user-uuid', description: 'Task 1', isDone: false, createdAt: new Date() }];
      mockTasksService.findAll.mockReturnValue(openTasks);

      const result = controller.findAll(TaskStatusEnum.OPEN);

      expect(tasksService.findAll).toHaveBeenCalledWith(TaskStatusEnum.OPEN);
      expect(result).toEqual(openTasks);
    });

    it('should call tasksService.findAll with an invalid status and ignore it', () => {
      const allTasks: Task[] = [
        { id: 'uuid1', userId: 'user-uuid', description: 'Task 1', isDone: false, createdAt: new Date() },
        { id: 'uuid2', userId: 'user-uuid', description: 'Task 2', isDone: true, createdAt: new Date() },
      ];
      mockTasksService.findAll.mockReturnValue(allTasks);

      const result = controller.findAll('INVALID' as any);

      expect(tasksService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(allTasks);
    });
  });

  describe('findByUser', () => {
    it('should call tasksService.findByUser with userId and no status, and return the tasks', () => {
      const userId = 'user123';
      const userTasks: Task[] = [
        { id: 'uuid1', userId: userId, description: 'Task 1', isDone: false, createdAt: new Date() },
        { id: 'uuid2', userId: userId, description: 'Task 2', isDone: true, createdAt: new Date(), completedAt: new Date() },
      ];
      mockTasksService.findByUser.mockReturnValue(userTasks);

      const result = controller.findByUser(userId, undefined);

      expect(tasksService.findByUser).toHaveBeenCalledWith(userId, undefined);
      expect(result).toEqual(userTasks);
    });

    it('should call tasksService.findByUser with userId and status, and return the tasks', () => {
      const userId = 'user123';
      const openTasks: Task[] = [{ id: 'uuid1', userId: userId, description: 'Task 1', isDone: false, createdAt: new Date() }];
      mockTasksService.findByUser.mockReturnValue(openTasks);

      const result = controller.findByUser(userId, TaskStatusEnum.OPEN);

      expect(tasksService.findByUser).toHaveBeenCalledWith(userId, TaskStatusEnum.OPEN);
      expect(result).toEqual(openTasks);
    });

    it('should call tasksService.findByUser with userId and an invalid status, and ignore the status', () => {
      const userId = 'user123';
      const userTasks: Task[] = [
        { id: 'uuid1', userId: userId, description: 'Task 1', isDone: false, createdAt: new Date() },
        { id: 'uuid2', userId: userId, description: 'Task 2', isDone: true, createdAt: new Date() },
      ];
      mockTasksService.findByUser.mockReturnValue(userTasks);

      const result = controller.findByUser(userId, 'INVALID' as any);

      expect(tasksService.findByUser).toHaveBeenCalledWith(userId, undefined);
      expect(result).toEqual(userTasks);
    });
  });

  describe('markAsDone', () => {
    it('should call tasksService.markAsDone with taskId and userId, and return the updated task', () => {
      const taskId = 'task-uuid';
      const userId = 'user-uuid';
      const updatedTask: Task = { id: taskId, userId: userId, description: 'Task 1', isDone: true, createdAt: new Date(), completedAt: new Date() };
      mockTasksService.markAsDone.mockReturnValue(updatedTask);

      const result = controller.markAsDone(taskId, userId);

      expect(tasksService.markAsDone).toHaveBeenCalledWith(taskId, userId);
      expect(result).toEqual(updatedTask);
    });
  });
});
