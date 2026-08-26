import { Global, Module } from '@nestjs/common';
import { CLIENTE_PACIENTES, ClientePacientes } from './cliente-pacientes';

@Global()
@Module({
  providers: [{ provide: CLIENTE_PACIENTES, useClass: ClientePacientes }],
  exports: [CLIENTE_PACIENTES],
})
export class PacientesModule {}
