import { Module } from '@nestjs/common';
import { IntentosService } from './intentos.service';

@Module({ providers: [IntentosService], exports: [IntentosService] })
export class IntentosModule {}
