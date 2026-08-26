import { Module } from '@nestjs/common';
import { EmbarazoController } from './embarazo.controller';
import { EmbarazoService } from './embarazo.service';

@Module({
  controllers: [EmbarazoController],
  providers: [EmbarazoService],
})
export class EmbarazoModule {}
