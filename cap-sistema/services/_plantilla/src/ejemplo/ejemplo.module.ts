import { Module } from '@nestjs/common';
import { EjemploController } from './ejemplo.controller';
import { EjemploService } from './ejemplo.service';

@Module({
  controllers: [EjemploController],
  providers: [EjemploService],
})
export class EjemploModule {}
