/// <reference types="vite/client" />

declare const __APP_COMMIT__: string;
declare const __APP_BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
