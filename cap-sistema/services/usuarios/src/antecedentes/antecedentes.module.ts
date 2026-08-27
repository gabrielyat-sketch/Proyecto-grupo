import { Module } from '@nestjs/common';
import { CifradoModule } from '../comun/cifrado.module';
import { AntecedentesController } from './antecedentes.controller';
import { AntecedentesService } from './antecedentes.service';

@Module({
  imports: [CifradoModule],
  controllers: [AntecedentesController],
  providers: [AntecedentesService],
})
export class AntecedentesModule {}
