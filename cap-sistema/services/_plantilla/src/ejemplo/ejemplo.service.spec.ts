import { NotFoundException } from '@nestjs/common';
import { EjemploService } from './ejemplo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EjemploService', () => {
  const prisma = {
    ejemplo: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const servicio = new EjemploService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('lista con los valores de paginacion por defecto', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    const pagina = await servicio.listar({});
    expect(pagina.pagina).toBe(1);
    expect(pagina.tamano).toBe(25);
  });

  it('recorta un tamano de pagina abusivo al maximo permitido', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 500]);
    (prisma.ejemplo.findMany as jest.Mock).mockResolvedValue([]);
    await servicio.listar({ tamano: 100000 });
    const consultaEnviada = (prisma.ejemplo.findMany as jest.Mock).mock.calls[0]?.[0];
    expect(consultaEnviada.take).toBeLessThanOrEqual(100);
  });

  it('calcula el desplazamiento a partir de la pagina', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    (prisma.ejemplo.findMany as jest.Mock).mockResolvedValue([]);
    await servicio.listar({ pagina: 3, tamano: 10 });
    expect((prisma.ejemplo.findMany as jest.Mock).mock.calls[0][0].skip).toBe(20);
  });

  it('pide datos y total en la misma transaccion', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    await servicio.listar({});
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('lanza NotFound si el registro no existe', async () => {
    (prisma.ejemplo.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(servicio.obtener('inexistente')).rejects.toThrow(NotFoundException);
  });

  it('crea con activo en true por defecto', async () => {
    (prisma.ejemplo.create as jest.Mock).mockResolvedValue({});
    await servicio.crear({ nombre: 'Comunidad El Rancho' });
    expect((prisma.ejemplo.create as jest.Mock).mock.calls[0][0].data.activo).toBe(true);
  });
});
