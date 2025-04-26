import { ExecutionContext, HttpException } from '@nestjs/common';
import { TaskRateLimitGuard } from './task-rate-limit.guard';
import { CreateTaskDto } from '../dto/create-task.dto';

describe('TaskRateLimitGuard', () => {
    let guard: TaskRateLimitGuard;
    let originalDate: any;
    let now: Date;
    const userId = 'testUser';
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = {
            ...originalEnv,
            USER_RATE_LIMIT: '2',
            USER_RATE_LIMIT_WINDOW_MS: '1000',
            GLOBAL_RATE_LIMIT: '3',
            GLOBAL_RATE_LIMIT_WINDOW_MS: '2000',
        };

        originalDate = global.Date;
        now = new originalDate();

        class MockDate extends originalDate {
            constructor(...args: any[]) {
                if (args.length === 0) {
                    super(now.getTime());
                } else {
                    super(...args);
                }
            }

            static now() {
                return now.getTime();
            }
        }

        global.Date = MockDate as unknown as DateConstructor;

        guard = new TaskRateLimitGuard();
        (guard as any).userCreationTimestamps = new Map();
        (guard as any).globalCreationTimestamps = [];

        expect(process.env.USER_RATE_LIMIT).toBe('2');
        expect(process.env.USER_RATE_LIMIT_WINDOW_MS).toBe('1000');
        expect(process.env.GLOBAL_RATE_LIMIT).toBe('3');
        expect(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS).toBe('2000');
    });

    afterEach(() => {
        global.Date = originalDate;
        process.env = originalEnv;
    });

    const createMockContext = (userId: string): ExecutionContext =>
        ({
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    body: { userId } as CreateTaskDto,
                }),
            }),
        } as any);

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('should allow the first request for a user', () => {
            const context = createMockContext(userId);
            expect(guard.canActivate(context)).toBe(true);
            expect((guard as any).userCreationTimestamps.get(userId).map((d: Date) => d.getTime())).toEqual([
                now.getTime(),
            ]);
            expect((guard as any).globalCreationTimestamps.map((d: Date) => d.getTime())).toEqual([
                now.getTime(),
            ]);
        });

        it('should allow requests within the user rate limit window', () => {
            const context = createMockContext(userId);
            const recentTimestamp = new originalDate(now.getTime() - 500);
            (guard as any).userCreationTimestamps.set(userId, [recentTimestamp]);

            const result = guard.canActivate(context);
            expect(result).toBe(true);

            const userTimestamps = (guard as any).userCreationTimestamps.get(userId);
            expect(userTimestamps.map((d: Date) => d.getTime())).toEqual([
                recentTimestamp.getTime(),
                now.getTime(),
            ]);

            expect((guard as any).globalCreationTimestamps.map((d: Date) => d.getTime())).toEqual([
                now.getTime(),
            ]);
        });

        it('should block requests exceeding the user rate limit', () => {
            const context = createMockContext(userId);
            const timestamps: Date[] = [];
            for (let i = 0; i < Number(process.env.USER_RATE_LIMIT); i++) {
                timestamps.push(new originalDate(now.getTime() - i * 100));
            }
            (guard as any).userCreationTimestamps.set(userId, timestamps);

            try {
                guard.canActivate(context);
                fail('Expected HttpException, but none was thrown');
            } catch (error: any) {
                expect(error).toBeInstanceOf(HttpException);
                expect(error.message).toBe(
                    `User rate limit exceeded. Max ${process.env.USER_RATE_LIMIT} tasks per ${Number(process.env.USER_RATE_LIMIT_WINDOW_MS) / 1000} seconds per user.`
                );
            }
        });

        it('should allow the first few global requests', () => {
            for (let i = 0; i < Number(process.env.GLOBAL_RATE_LIMIT) - 1; i++) {
                now = new originalDate(now.getTime() + 100);
                const context = createMockContext(`user${i}`);
                guard.canActivate(context);
            }

            now = new originalDate(now.getTime() + 100);
            const context = createMockContext('finalUser');
            const result = guard.canActivate(context);
            expect(result).toBe(true);
        });

        it('should block requests exceeding the global rate limit', () => {
            const context = createMockContext('overLimitUser');
            const globalRateLimit = parseInt(process.env.GLOBAL_RATE_LIMIT || '0', 10);
            const globalRateLimitWindow = parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || '0', 10);

            const timestamps: Date[] = [];
            for (let i = 0; i < globalRateLimit; i++) {
                timestamps.push(new originalDate(now.getTime() - i * (globalRateLimitWindow / globalRateLimit)));
            }
            (guard as any).globalCreationTimestamps = timestamps;

            now = new originalDate(now.getTime() + 1);

            expect(() => guard.canActivate(context)).toThrowError(HttpException);
        });
    });
});
