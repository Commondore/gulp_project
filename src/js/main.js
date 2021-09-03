import Swiper, { Navigation, Pagination } from "swiper";

Swiper.use([Navigation, Pagination]);

new Swiper("#main-slide", {
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  pagination: {
    el: ".swiper-pagination",
    type: "bullets",
    clickable: true,
  },
});
