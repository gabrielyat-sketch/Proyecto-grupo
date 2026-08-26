import { Module } from '@nestjs/common';
import { InventarioController } from './inventario.controller';

@Module({ controllers: [InventarioController] })
export class InventarioModule {}
