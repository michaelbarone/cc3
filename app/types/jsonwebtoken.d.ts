declare module "jsonwebtoken" {
  export interface JwtPayload {
    [key: string]: any;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    clockTimestamp?: number;
    clockTolerance?: number;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    subject?: string;
    maxAge?: string | number;
  }

  export interface SignOptions {
    algorithm?: string;
    keyid?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    subject?: string;
    issuer?: string;
    jwtid?: string;
    mutatePayload?: boolean;
    noTimestamp?: boolean;
    header?: object;
    encoding?: string;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions,
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions,
  ): JwtPayload | string;

  export function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean },
  ): null | JwtPayload | string;

  export default {
    sign,
    verify,
    decode,
  };
}
