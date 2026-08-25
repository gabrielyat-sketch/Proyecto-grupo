import { Module } from '@nestjs/common';
import { HipertensionController } from './hipertension.controller';
import { HipertensionService } from './hipertension.service';

@Module({
  controllers: [HipertensionController],
  providers: [HipertensionService],
})
export class HipertensionModule {}
