import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TasksModule } from './tasks/tasks.module';
import { AppController } from './app.controller';
import * as Joi from 'joi';


@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    validationSchema: Joi.object({
      APP_PORT: Joi.number().default(3000),
      USER_RATE_LIMIT: Joi.number().required(),
      USER_RATE_LIMIT_WINDOW_MS: Joi.number().required(),
      GLOBAL_RATE_LIMIT: Joi.number().required(),
      GLOBAL_RATE_LIMIT_WINDOW_MS: Joi.number().required(),
    }),
  }),
      TasksModule],
  controllers: [AppController],
})
export class AppModule {}