import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { ConfigModule } from './config';
import { BusinessModules } from './modules';
import { PrismaModule } from './prisma';
import { ProxyImageController } from './proxy-image.controller';
import { StorageModule } from './storage';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot(),
    StorageModule.forRoot(),
    ...BusinessModules,
  ],
  controllers: [AppController, ProxyImageController],
})
export class AppModule {}
