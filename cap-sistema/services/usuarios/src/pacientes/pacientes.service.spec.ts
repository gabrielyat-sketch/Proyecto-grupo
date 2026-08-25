import { PacientesService } from './pacientes.service';

describe('PacientesService.edad', () => {
  function edadDe(anio: number, mes: number, dia: number): number {
    return PacientesService.edad(new Date(anio, mes - 1, dia));
  }

  it('calcula la edad de un adulto', () => {
    const hoy = new Date();
    expect(edadDe(hoy.getFullYear() - 40, hoy.getMonth() + 1, hoy.getDate())).toBe(40);
  });

  it('no cuenta el ano si el cumpleanos aun no llego', () => {
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    // Nacido manana hace 30 anos: todavia tiene 29.
    expect(edadDe(hoy.getFullYear() - 30, manana.getMonth() + 1, manana.getDate())).toBe(29);
  });

  it('devuelve 0 para un recien nacido, que es el caso del programa de desnutricion', () => {
    const hoy = new Date();
    expect(edadDe(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate())).toBe(0);
  });
});
