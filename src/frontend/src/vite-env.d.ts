/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string;
	readonly VITE_USE_BACKEND?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
