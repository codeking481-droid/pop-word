interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  PaystackPop?: {
    setup: (options: {
      key?: string;
      email: string;
      amount: number;
      currency: string;
      ref: string;
      metadata: { user_id: string };
      callback: (response: { reference?: string }) => void | Promise<void>;
      onClose: () => void;
    }) => { openIframe: () => void };
  };
}
