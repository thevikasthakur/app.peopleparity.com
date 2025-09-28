import { Strategy as SamlStrategy } from 'passport-saml';
import { ConfigService } from '@nestjs/config';
declare const MicrosoftSamlStrategy_base: new (...args: [options: import("passport-saml").SamlConfig] | [options: import("passport-saml").SamlConfig]) => SamlStrategy & {
    validate(...args: any[]): unknown;
};
export declare class MicrosoftSamlStrategy extends MicrosoftSamlStrategy_base {
    private configService;
    constructor(configService: ConfigService);
    validate(profile: any): Promise<any>;
}
export {};
//# sourceMappingURL=saml.strategy.d.ts.map