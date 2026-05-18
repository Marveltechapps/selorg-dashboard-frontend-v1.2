/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_NEW_NAV?: string;
  /** Optional override for the admin top-bar environment pill (e.g. Staging, UAT). */
  readonly VITE_ENV_LABEL?: string;
}
