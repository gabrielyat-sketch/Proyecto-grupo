import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefrescarDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  tokenRefresco!: string;
}
