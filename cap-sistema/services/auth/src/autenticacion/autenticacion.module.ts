import { Module } from '@nestjs/common';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { TokensModule } from '../tokens/tokens.module';
import { IntentosModule } from '../intentos/intentos.module';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [TokensModule, IntentosModule, MfaModule],
  controllers: [AutenticacionController],
  providers: [AutenticacionService],
})
export class AutenticacionModule {}
