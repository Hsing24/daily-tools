import { Routes } from "@angular/router";

import { Layout } from "./layout/layout";

export const routes: Routes = [
  {
    path: "",
    component: Layout,
    children: [
      {
        path: "",
        loadComponent: () => import("./home/home").then((m) => m.Home),
      },
      {
        path: "word-count",
        loadComponent: () =>
          import("./tools/word-count/word-count").then((m) => m.WordCount),
      },
      {
        path: "text-markdown-html",
        loadComponent: () =>
          import("./tools/text-markdown-html/text-markdown-html").then(
            (m) => m.TextMarkdownHtml
          ),
      },
      {
        path: "image-converter",
        loadComponent: () =>
          import("./tools/image-converter/image-converter").then(
            (m) => m.ImageConverter
          ),
      },
      {
        path: "design",
        loadComponent: () => import("./design/design").then((m) => m.Design),
      },
    ],
  },
];
