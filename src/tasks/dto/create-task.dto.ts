import {IsString, IsNotEmpty, MaxLength, IsDate} from 'class-validator';
import {Transform} from "class-transformer";

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    description: string;

    @IsNotEmpty()
    @IsDate()
    @Transform(({ value }) => new Date(value))
    startTime: Date;

    @IsNotEmpty()
    @IsDate()
    @Transform(({ value }) => new Date(value))
    endTime: Date;
}