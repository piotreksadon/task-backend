import { Controller, Get, Post, Body, Param, Patch, Query, ParseUUIDPipe, ValidationPipe, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiCreatedResponse, ApiOkResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiQuery, ApiParam, ApiOperation } from '@nestjs/swagger';
import { TasksService, TaskStatusEnum } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({
    description: 'The task has been successfully created.',
    //type: TaskModel, // I had to comment this swagger property, because the interface cant be assigned as type. In real life it would be an entity class.
  })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTaskDto: CreateTaskDto): Task {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiOkResponse({
    description: 'Returns all tasks, optionally filtered by status.',
    //type: [TaskModel], // I had to comment this swagger property, because the interface cant be assigned as type. In real life it would be an entity class.
  })
  @ApiQuery({
    name: 'status',
    enum: TaskStatusEnum,
    required: false,
    description: 'Filter tasks by status',
  })
  findAll(@Query('status') status?: TaskStatusEnum): Task[] {
    const validStatuses = [TaskStatusEnum.DONE, TaskStatusEnum.OPEN];
    if (status && !validStatuses.includes(status)) {
      console.warn(`Invalid status query parameter received: ${status}. Ignoring filter.`);
      status = undefined;
    }
    return this.tasksService.findAll(status);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get tasks for a specific user' })
  @ApiOkResponse({
    description: 'Returns tasks for the specified user, optionally filtered by status.',
    //type: [TaskModel], // I had to comment this swagger property, because the interface cant be assigned as type. In real life it would be an entity class.
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'The ID of the user',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'status',
    enum: TaskStatusEnum,
    required: false,
    description: 'Filter tasks by status',
  })
  @ApiBadRequestResponse({ description: 'Invalid user ID format' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findByUser(
      @Param('userId') userId: string,
      @Query('status') status?: TaskStatusEnum
  ): Task[] {
    const validStatuses = [TaskStatusEnum.DONE, TaskStatusEnum.OPEN];
    if (status && !validStatuses.includes(status)) {
      console.warn(`Invalid status query parameter received: ${status}. Ignoring filter.`);
      status = undefined;
    }
    return this.tasksService.findByUser(userId, status);
  }

  @Patch(':taskId/user/:userId/done')
  @ApiOperation({ summary: 'Mark a task as done for a specific user' })
  @ApiOkResponse({
    description: 'The task has been successfully marked as done.',
    // type: TaskModel, // I had to comment this swagger property, because the interface cant be assigned as type. In real life it would be an entity class.
  })
  @ApiParam({
    name: 'taskId',
    type: String,
    description: 'The ID of the task',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'The ID of the user',
  })
  @ApiBadRequestResponse({ description: 'Invalid task or user ID format' })
  @ApiNotFoundResponse({ description: 'Task or user not found' })
  markAsDone(
      @Param('taskId', ParseUUIDPipe) taskId: string,
      @Param('userId') userId: string
  ): Task {
    return this.tasksService.markAsDone(taskId, userId);
  }
}

