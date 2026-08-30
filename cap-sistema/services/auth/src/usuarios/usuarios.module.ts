import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { TokensModule } from '../tokens/tokens.module';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [TokensModule, MfaModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
