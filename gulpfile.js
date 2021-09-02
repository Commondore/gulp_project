const { src, dest, watch, series, parallel } = require("gulp");
const sass = require("gulp-sass");
const cleanCSS = require("gulp-clean-css");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const gulpIf = require("gulp-if");

const pug = require("gulp-pug");
const notify = require("gulp-notify");
const plumber = require("gulp-plumber");

// images optimization
const imagemin = require("gulp-imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminZopfli = require("imagemin-zopfli");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminGiflossy = require("imagemin-giflossy");

const svgSymbols = require("gulp-svg-symbols");

const ttf2woff2 = require("gulp-ttf2woff2");

const uglify = require("gulp-uglify");
const del = require("del");

const browserSync = require("browser-sync").create();
const devip = require("dev-ip");

const webpackStream = require("webpack-stream");

// check prod or dev
const isDevelopment = !(process.argv[2] === "build");
console.log(isDevelopment);

const path = {
  dev: {
    sass: "src/sass/**/*.{sass,scss}",
    js: "src/js",
    html: "src/*.{html,php}",
    img: ["src/img/**/*.*", "!src/img/icons/*.svg"],
    icons: "src/img/icons/*.svg",
    fonts: "src/fonts/**/*.ttf",
    pug: "src/pug/pages/*.pug",
  },
  build: {
    root: "dist",
    css: "dist/css",
    js: "dist/js",
    html: "dist/*.html",
    img: "dist/img",
    fonts: "dist/fonts",
    root: "dist",
  },
};

function liveReload(done) {
  browserSync.init({
    server: {
      baseDir: path.build.root,
    },
    host: devip()
  });

  done();
}

async function clean() {
  return await del.sync(path.build.root);
}

function html() {
  return src(path.dev.html)
    .pipe(dest(path.build.root))
    .pipe(browserSync.stream());
}

function pugTask() {
  return src(path.dev.pug)
    .pipe(
      plumber({
        errorHandler: notify.onError(function (err) {
          return {
            title: "Pug",
            message: err.message,
          };
        }),
      })
    )
    .pipe(
      pug({
        pretty: "  ",
      })
    )
    .pipe(dest(path.build.root))
    .pipe(browserSync.stream());
}

function styles() {
  return src(path.dev.sass)
    .pipe(
      plumber({
        errorHandler: notify.onError(function (err) {
          return {
            title: "Sass",
            message: err.message,
          };
        }),
      })
    )
    .pipe(gulpIf(isDevelopment, sourcemaps.init()))
    .pipe(sass())
    .pipe(dest(path.build.css))
    .pipe(
      cleanCSS({
        level: 2,
      })
    )
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(gulpIf(isDevelopment, sourcemaps.write()))
    .pipe(dest(path.build.css))
    .pipe(browserSync.stream());
}

function scripts() {
  return src(`${path.dev.js}/main.js`)
    .pipe(
      webpackStream({
        output: {
          filename: "main.js",
        },
        module: {
          rules: [
            {
              test: /\.(js)$/,
              exclude: /(node_modules)/,
              loader: "babel-loader",
              query: {
                presets: ["@babel/env"],
              },
            },
          ],
        },
        mode: isDevelopment ? "development" : "production"
      })
    )
    .pipe(gulpIf(isDevelopment, uglify()))
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browserSync.stream());
}

function imagesBuild() {
  return src(path.dev.img)
    .pipe(
      imagemin([
        imageminGiflossy({
          optimizationLevel: 3,
          optimize: 3,
          lossy: 2,
        }),
        imageminPngquant({
          speed: 5,
          quality: [0.6, 0.8],
        }),
        imageminZopfli({
          more: true,
        }),
        imageminMozjpeg({
          progressive: true,
          quality: 70,
        }),
        imagemin.svgo({
          plugins: [
            { removeViewBox: false },
            { removeUnusedNS: false },
            { removeUselessStrokeAndFill: false },
            { cleanupIDs: false },
            { removeComments: true },
            { removeEmptyAttrs: true },
            { removeEmptyText: true },
            { collapseGroups: true },
          ],
        }),
      ])
    )
    .pipe(dest(path.build.img));
}
function sprite(done) {
  src(path.dev.icons)
    .pipe(
      svgSymbols({
        templates: [`default-svg`],
      })
    )
    .pipe(rename('sprite.svg'))
    .pipe(dest(path.build.img));

  done();
}
function images() {
  return src(path.dev.img).pipe(dest(path.build.img));
}

function fonts() {
  return src(path.dev.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

function watcher(done) {
  watch(path.dev.sass, styles);
  watch(path.dev.js, scripts);
  watch(path.dev.html, html);
  watch(path.dev.img, images);
  watch(path.dev.fonts, fonts);
  watch(path.dev.pug, pugTask);
  watch(path.dev.icons, sprite);
  done();
}

exports.styles = styles;
exports.watcher = watcher;
exports.scripts = scripts;
exports.images = images;
exports.html = html;
exports.fonts = fonts;
exports.clean = clean;

exports.build = series(
  clean,
  parallel(pugTask, styles, scripts, imagesBuild, sprite, fonts)
);

exports.default = series(
  clean,
  parallel(pugTask, styles, scripts, images, sprite, fonts),
  liveReload,
  watcher
);
