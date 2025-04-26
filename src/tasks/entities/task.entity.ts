export interface Task {
    id: string;
    userId: string;
    description: string;
    isDone: boolean;
    createdAt: Date;
    completedAt?: Date;
}