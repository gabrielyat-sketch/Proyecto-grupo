import { Module } from '@nestjs/common';
import { EmbarazoController } from './embarazo.controller';
import { EmbarazoService } from './embarazo.service';
import { ControlesDesdeFichas } from './controles-desde-fichas';

@Module({
  controllers: [EmbarazoController],
  providers: [EmbarazoService, ControlesDesdeFichas],
})
export class EmbarazoModule {}
