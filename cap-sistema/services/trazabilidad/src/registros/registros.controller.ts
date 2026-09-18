import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginaDe, Rol, Roles, Usuario, UsuarioAutenticado, type Pagina } from '@cap/shared';
import { RegistrosService } from './registros.service';
import { RegistrarRegistroDto } from './dto/registrar-registro.dto';
import { ConsultarRegistrosDto } from './dto/consultar-registros.dto';
import { RegistroDto, VerificacionDto } from './dto/respuestas.dto';

@ApiTags('registros')
@ApiBearerAuth()
@Controller('registros')
export class RegistrosController {
  constructor(private readonly servicio: RegistrosService) {}

  /**
   * Sin @Roles: lo llama cualquier servicio en nombre del usuario que origino
   * la accion, y ese usuario puede tener cualquiera de los seis roles. Un
   * medico que corrige un diagnostico tiene que poder dejar su propio rastro;
   * si registrar exigiera un rol privilegiado, la accion mas comun del sistema
   * quedaria sin auditar.
   *
   * El usuarioId NO sale del cuerpo de la peticion: sale del JWT. Si el
   * llamador pudiera decir en nombre de quien registra, la bitacora no
   * probaria nada.
   */
  @Post()
  @ApiCreatedResponse({ type: RegistroDto })
  @HttpCode(201)
  @ApiOperation({
    summary: 'Agrega una entrada a la bitacora',
    description:
      'Encadena la entrada al ultimo registro existente. El usuario y el rol se toman ' +
      'del token, no del cuerpo. Los valores anterior y nuevo se cifran antes de guardarse.',
  })
  registrar(
    @Body() dto: RegistrarRegistroDto,
    @Usuario() usuario: UsuarioAutenticado,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.registrar(dto, usuario, req.trazaId ?? 'sin-traza');
  }

  /**
   * Leer la bitacora es un privilegio: dice quien atendio a quien y cuando.
   * Se limita a los dos roles que responden por el CAP ante el MSPAS.
   */
  @Get()
  @ApiPaginaDe(RegistroDto)
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Consulta la bitacora, paginada',
    description: 'Orden descendente: lo mas reciente primero, que es como se audita.',
  })
  consultar(@Query() filtros: ConsultarRegistrosDto) {
    return this.servicio.consultar(filtros);
  }

  /**
   * La verificacion se expone por API ademas del script de consola porque el
   * personal del CAP no va a abrir una terminal. El script existe para que la
   * comprobacion sea posible aunque el servicio no arranque.
   */
  @Get('verificacion')
  @ApiOkResponse({ type: VerificacionDto })
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Recorre la cadena y reporta si esta intacta',
    description:
      'Devuelve el numero del primer registro que no cuadra, si lo hay. ' +
      'No necesita las llaves de descifrado: el hash cubre el texto cifrado.',
  })
  verificar() {
    return this.servicio.verificar();
  }
}
