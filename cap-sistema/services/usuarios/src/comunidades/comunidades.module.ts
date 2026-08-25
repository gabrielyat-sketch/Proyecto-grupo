import { Module } from '@nestjs/common';
import { ComunidadesController } from './comunidades.controller';
import { ComunidadesService } from './comunidades.service';

@Module({
  controllers: [ComunidadesController],
  providers: [ComunidadesService],
  exports: [ComunidadesService],
})
export class ComunidadesModule {}
