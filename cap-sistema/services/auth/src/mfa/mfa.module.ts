import { Module } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { DispositivosService } from './dispositivos.service';

@Module({
  providers: [MfaService, DispositivosService],
  exports: [MfaService, DispositivosService],
})
export class MfaModule {}
