/** An immutable complex number. JavaScript has no built-in complex type. */
export class Complex {
  constructor(
    readonly re: number,
    readonly im: number = 0,
  ) {}

  static readonly ZERO = new Complex(0, 0);
  static readonly ONE = new Complex(1, 0);
  static readonly I = new Complex(0, 1);

  /** r·e^(iθ) */
  static polar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  static from(x: number | Complex): Complex {
    return typeof x === "number" ? new Complex(x, 0) : x;
  }

  add(o: Complex): Complex {
    return new Complex(this.re + o.re, this.im + o.im);
  }

  sub(o: Complex): Complex {
    return new Complex(this.re - o.re, this.im - o.im);
  }

  mul(o: Complex): Complex {
    return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re);
  }

  scale(k: number): Complex {
    return new Complex(this.re * k, this.im * k);
  }

  div(o: Complex): Complex {
    const d = o.re * o.re + o.im * o.im;
    return new Complex((this.re * o.re + this.im * o.im) / d, (this.im * o.re - this.re * o.im) / d);
  }

  conj(): Complex {
    return new Complex(this.re, -this.im);
  }

  neg(): Complex {
    return new Complex(-this.re, -this.im);
  }

  abs(): number {
    return Math.hypot(this.re, this.im);
  }

  arg(): number {
    return Math.atan2(this.im, this.re);
  }

  /** Principal square root. */
  sqrt(): Complex {
    return Complex.polar(Math.sqrt(this.abs()), this.arg() / 2);
  }

  isFinite(): boolean {
    return Number.isFinite(this.re) && Number.isFinite(this.im);
  }
}
