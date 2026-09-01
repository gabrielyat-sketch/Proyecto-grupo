import { Module } from '@nestjs/common';
import { CifradoModule } from '../comun/cifrado.module';
import { DigitalizacionController } from './digitalizacion.controller';
import { DigitalizacionService } from './digitalizacion.service';

@Module({
  imports: [CifradoModule],
  controllers: [DigitalizacionController],
  providers: [DigitalizacionService],
})
export class DigitalizacionModule {}
