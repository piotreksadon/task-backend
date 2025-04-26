import {AppController} from "./app.controller";
import {Test, TestingModule} from "@nestjs/testing";

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return the health status', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});