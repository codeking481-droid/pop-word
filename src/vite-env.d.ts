interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PAYSTACK_PAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
