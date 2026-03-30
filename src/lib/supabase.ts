import { createClient } from "@supabase/supabase-js";

export type Business = {
  id: string;
  name: string;
  category: string;
  region: string;
  address: string;
  phone: string;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  email: string | null;
  email_verified: boolean;
  created_at: string;
};

export type EmailCampaign = {
  id: string;
  business_id: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
  business?: Business;
};

export type CrmStatus = {
  id: string;
  business_id: string;
  status: "contacted" | "replied" | "meeting" | "contracted";
  updated_at: string;
  business?: Business;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
