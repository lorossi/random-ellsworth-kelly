/**
* Each canvas is fully deterministic. You can generate a canvas with a set seed.
* Normally the seed is based on time, but you can set whatever you want (including strings).
*/

class Sketch extends Engine {
  preload() {
    this._scl = 50; // size of each rectangle
    this._sub_scl = 2.5;  // size of each sub rectangle
    this._texture_scl = 10; // size of each texture rectangle
    this._d_hue = 10; // max hue variation
    this._d_color = 5; // max r, g, b channel variation
    this._noise_scl = 0.1;
    this._rect_noise_scl = 0.05;
    this._texture_noise_scl = 0.0025;
    this._border = 0.1;
  }

  setup() {
    // maximum distance between rectangle and center
    this._max_dist = (Math.SQRT2 / 2) * this.width;
    // title length
    this._title_length = 11;
    // rgb values of color palette
    this._colors = [
      "#e8e03a",
      "#96de46",
      "#6ad178",
      "#00adb4",
      "#328bd5",
      "#6273c5",
      "#7261a3",
      "#8c689a",
      "#ce6978",
      "#f26865",
      "#fa8c00",
      "#fa8c00",
    ];
  }

  draw() {
    // seed generation - equals the epoch
    const seed = Date.now();

    // setup noise
    this._simplex = new SimplexNoise(seed);
    const d_hue = this._noise(seed) * this._d_hue;
    this._canvas_title = this._title(seed);

    this.ctx.save();
    this.background("#fbefdf");
    // draw texture
    this._texture();
    // translating and scaling to accomodate border
    this.ctx.translate(this._border * this.width / 2, this._border * this.height / 2);
    this.ctx.scale(1 - this._border, 1 - this._border);
    // start drawing rectangles
    for (let x = 0; x < this.width; x += this._scl) {
      for (let y = 0; y < this.height; y += this._scl) {
        // compute total and relative distance between the center of the rectangle and the center
        //  of the canvas
        const rect_dist = dist(x + this._scl / 2, y + this._scl / 2, this.width / 2, this.height / 2);
        const dist_percent = ease(rect_dist / this._max_dist); // eased to add some variance
        // noise relative to position
        const n = (this._noise(x, y, seed) + 1) / 2;
        // there's a lower chance for far rectangles to be shown
        if (n >= dist_percent) {
          // select color from palette
          const index = Math.floor((this._noise(x, y, seed, 10000, 1000) + 1) / 2 * this._colors.length);
          const rect_color = this._colors[index];
          // rect displacement
          const dx = this._noise(x, y, seed, 20000) * this._scl / 150;
          const dy = this._noise(x, y, seed, 30000) * this._scl / 150;
          // rect rotation
          const theta = this._noise(x, y, seed, 40000) * Math.PI / 150;

          this.ctx.save();
          // traslate to top right corner of rectangle
          this.ctx.translate(x + dx, y + dy);
          this.ctx.rotate(theta);
          // start drawing sub rectangles
          for (let xr = 0; xr < this._scl; xr += this._sub_scl) {
            for (let yr = 0; yr < this._scl; yr += this._sub_scl) {
              // create new color and set the hex of the picked color from palette
              const sub_color = new Color();
              sub_color.hex = rect_color;

              // add global hue variance
              sub_color.h += d_hue;
              // add rect r, g, b variance
              sub_color.r += this._noise(x + xr, y + yr, seed, 500000, this._rect_noise_scl) * this._d_color;
              sub_color.g += this._noise(x + xr, y + yr, seed, 600000, this._rect_noise_scl) * this._d_color;
              sub_color.b += this._noise(x + xr, y + yr, seed, 700000, this._rect_noise_scl) * this._d_color;
              sub_color.a += this._noise(x + xr, y + yr, seed, 800000, this._rect_noise_scl) * 0.2 + 0.8;
              // draw rect
              this.ctx.fillStyle = sub_color.hsla;
              this.ctx.fillRect(xr, yr, this._sub_scl + 1, this._sub_scl + 1);
            }
          }

          // draw outer line
          const border_color = new Color();
          border_color.hex = this._colors[index];
          border_color.l = 0.2;
          border_color.a = Math.abs(this._noise(x, y, seed, 900000, this._rect_noise_scl) * 0.1) + 0.05;
          this.ctx.strokeStyle = border_color.rgba;
          this.ctx.strokeRect(0, 0, this._scl, this._scl);

          this.ctx.restore();
        }
      }
    }


    this.ctx.restore();

    // draw title
    // compute size and displacement
    const font_size = this._border * this.width / 4;
    const bottom = this._border * this.width / 6;
    const right = this._border * this.width / 8;
    // position is relative to bottom right corner
    this.ctx.save();
    this.ctx.fillStyle = "#322f2c80";
    this.ctx.font = `${font_size}px Aqua-Grotesque`;
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "bottom";
    this.ctx.fillText("N°" + this._canvas_title, this.width - bottom, this.height - right);
    this.ctx.restore();

    // stop looping, restart with click
    this.noLoop();
  }

  // generate noise, scaled to noise_scl so you don't have to multiply each time
  _noise(x = 0, y = 0, z = 0, w = 0, scl = this._noise_scl) {
    return this._simplex.noise4D(x * scl, y * scl, z * scl, w * scl);
  }

  // generate the title by shuffling the seed. Once more is deterministic as
  // we are using a seeded title and noise function
  _title(seed) {
    // title generated from noise function
    let title = (this._noise(seed, Math.PI, Math.E, Math.SQRT1_2) + 1) / 2;
    // round it to desired digits
    title = Math.floor(title * 10 ** this._title_length).toString().padEnd(this._title_length, 0);
    title = title.split("").sort((_, i) => (this._noise(seed, i))).join("");
    return title;
  }

  // generate the texture for the background
  _texture(seed) {
    for (let x = 0; x < this.width; x += this._texture_scl) {
      for (let y = 0; y < this.height; y += this._texture_scl) {
        const lightness = (this._noise(x, y, seed, 100000, this._texture_noise_scl) + 1) / 2 * 30 + 50;
        const alpha = 0.2;

        this.ctx.save();
        this.ctx.fillStyle = `hsla(45, 40%, ${lightness}%, ${alpha})`;
        this.ctx.fillRect(x, y, this._texture_scl, this._texture_scl);
        this.ctx.restore();
      }
    }
  }

  click() {
    this.loop();
  }

  download() {
    // generate file title
    const file_title = `random-ellsworth-kelly-${this._canvas_title}`;
    // actual download
    this.saveAsImage(file_title);
  }
}