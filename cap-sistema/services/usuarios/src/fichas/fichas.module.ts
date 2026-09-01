import { Module } from '@nestjs/common';
import { CifradoModule } from '../comun/cifrado.module';
import { FichasController } from './fichas.controller';
import { FichasService } from './fichas.service';

@Module({
  imports: [CifradoModule],
  controllers: [FichasController],
  providers: [FichasService],
})
export class FichasModule {}
