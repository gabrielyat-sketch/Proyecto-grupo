import { Module } from '@nestjs/common';
import { DigitalizacionController } from './digitalizacion.controller';
import { DigitalizacionService } from './digitalizacion.service';

@Module({
  controllers: [DigitalizacionController],
  providers: [DigitalizacionService],
})
export class DigitalizacionModule {}
