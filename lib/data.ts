import { supabase, type Installatie } from "./supabase";

export async function laadInstallaties(): Promise<Installatie[]> {
  const { data, error } = await supabase.from("installatie_overzicht").select("*").order("klant_naam");
  if (error) throw error;
  return data as Installatie[];
}
