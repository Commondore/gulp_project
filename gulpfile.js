import gulp from "gulp";
const { src, dest, watch, series, parallel } = gulp;

import gulpSass from "gulp-sass";
import nodeSass from "node-sass";
const sass = gulpSass(nodeSass);

import cleanCSS from "gulp-clean-css";
import rename from "gulp-rename";
import sourcemaps from "gulp-sourcemaps";
import gulpIf from "gulp-if";

import pug from "gulp-pug";
import notify from "gulp-notify";
import plumber from "gulp-plumber";

// images optimization
import imagemin from "gulp-imagemin";
import imageminPngquant from "imagemin-pngquant";
import imageminZopfli from "imagemin-zopfli";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminGiflossy from "imagemin-giflossy";
import imageminSvgo from "imagemin-svgo";

import svgSymbols from "gulp-svg-symbols";

import ttf2woff2 from "gulp-ttf2woff2";

import uglify from "gulp-uglify";
import del from "del";

import browserSync from "browser-sync";
const brSync = browserSync.create();
import devip from "dev-ip";

import webpackStream from "webpack-stream";

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
  brSync.init({
    server: {
      baseDir: path.build.root,
    },
    host: devip()
  });

  done();
}

export async function clean() {
  return await del.sync(path.build.root);
}

function html() {
  return src(path.dev.html)
    .pipe(dest(path.build.root))
    .pipe(brSync.stream());
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
    .pipe(brSync.stream());
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
    .pipe(brSync.stream());
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
              options: {
                presets: ["@babel/env"],
              },
            },
          ],
        },
        mode: isDevelopment ? "development" : "production",
      })
    )
    .pipe(gulpIf(isDevelopment, uglify()))
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(dest(path.build.js))
    .pipe(brSync.stream());
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
        imageminSvgo({
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

export const build = series(
  clean,
  parallel(pugTask, styles, scripts, imagesBuild, sprite, fonts)
);


export default series(
  clean,
  parallel(pugTask, styles, scripts, images, sprite, fonts),
  liveReload,
  watcher
);
