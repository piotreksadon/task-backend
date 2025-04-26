import {CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable} from "@nestjs/common";
import {Observable} from "rxjs";
import {CreateTaskDto} from "../dto/create-task.dto";

@Injectable()
export class TaskRateLimitGuard implements CanActivate {
    private readonly userCreationTimestamps: Map<string, Date[]> = new Map();
    private globalCreationTimestamps: Date[] = [];

    private readonly USER_RATE_LIMIT = Number(process.env.USER_RATE_LIMIT);
    private readonly USER_RATE_LIMIT_WINDOW_MS = Number(process.env.USER_RATE_LIMIT_WINDOW_MS);

    private readonly GLOBAL_RATE_LIMIT = Number(process.env.GLOBAL_RATE_LIMIT);
    private readonly GLOBAL_RATE_LIMIT_WINDOW_MS = Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS);

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const body: CreateTaskDto = request.body;
        const userId = body.userId;
        const now = new Date();

        this.checkUserRateLimit(userId, now);
        this.checkGlobalRateLimit(now);

        this.recordUserTimestamp(userId, now);
        this.recordGlobalTimestamp(now);

        return true;
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