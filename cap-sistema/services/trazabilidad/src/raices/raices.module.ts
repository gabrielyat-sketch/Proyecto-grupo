import { Module } from '@nestjs/common';
import { RaicesController } from './raices.controller';
import { RaicesService } from './raices.service';

@Module({
  controllers: [RaicesController],
  providers: [RaicesService],
  exports: [RaicesService],
})
export class RaicesModule {}
