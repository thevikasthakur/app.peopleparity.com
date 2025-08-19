import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
export declare class UsersModule implements OnModuleInit {
    private usersService;
    private configService;
    constructor(usersService: UsersService, configService: ConfigService);
    onModuleInit(): Promise<void>;
}
//# sourceMappingURL=users.module.d.ts.map