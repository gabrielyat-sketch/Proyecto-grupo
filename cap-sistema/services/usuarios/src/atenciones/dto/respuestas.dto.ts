import { ApiProperty } from '@nestjs/swagger';

/**
 * Una atencion del historial, con los campos clinicos ya descifrados.
 *
 * Sobre peso, talla y temperatura: en la base son `Decimal` y **viajan como
 * texto** en JSON, no como numero. Prisma los serializa asi para no perder
 * precision al pasar por el punto flotante de JavaScript. El frontend debe
 * convertirlos antes de operar con ellos; documentarlos como numero seria una
 * mentira que reventaria en el primer `toFixed()`.
 */
export class AtencionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ format: 'uuid', description: 'Usuario del sistema que la registro.' })
  registradaPor!: string;

  @ApiProperty({ description: 'true si proviene de transcribir una atencion en papel.' })
  digitalizada!: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'Descifrado. En la base es ilegible.' })
  motivo!: string | null;

  @ApiProperty({ type: String, nullable: true })
  diagnostico!: string | null;

  @ApiProperty({ type: String, nullable: true })
  tratamiento!: string | null;

  @ApiProperty({ type: String, nullable: true })
  notas!: string | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '72.5' })
  pesoKg!: string | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '158.0' })
  tallaCm!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 148 })
  presionSistolica!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 94 })
  presionDiastolica!: number | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '37.2' })
  temperaturaC!: string | null;
}
