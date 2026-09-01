import { Module } from '@nestjs/common';
import { CifradoModule } from '../comun/cifrado.module';
import { CarnetController } from './carnet.controller';
import { CarnetService } from './carnet.service';

@Module({
  imports: [CifradoModule],
  controllers: [CarnetController],
  providers: [CarnetService],
})
export class CarnetModule {}
