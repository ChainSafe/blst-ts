export interface FuzzTestCase {
  name: string;
  target: (data: Buffer) => any;
}
