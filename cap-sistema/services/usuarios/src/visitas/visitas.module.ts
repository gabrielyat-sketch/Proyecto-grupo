import { Module } from '@nestjs/common';
import { CifradoModule } from '../comun/cifrado.module';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';

@Module({
  imports: [CifradoModule],
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
