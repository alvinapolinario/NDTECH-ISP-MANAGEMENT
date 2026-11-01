declare module 'radius' {
  type RadiusAttribute = [string, string | number | Buffer];

  export function encode(options: {
    code: string;
    secret: string;
    identifier?: number;
    attributes?: RadiusAttribute[];
  }): Buffer;

  export function decode(options: {
    packet: Buffer;
    secret: string;
  }): {
    code: string;
    identifier?: number;
    attributes?: RadiusAttribute[];
  };
}
