import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('meta')
@Controller({ path: 'version', version: VERSION_NEUTRAL })
export class MetaController {
    constructor(private readonly config: ConfigService) { }

    @Get()
    getVersion() {
        return {
            apiVersion: this.config.get<string>('app.apiVersion'),
            env: this.config.get<string>('app.env'),
        };
    }
}
