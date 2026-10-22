// Remplace @supabase/functions-js dans le site : Takoras n'appelle aucune Edge Function depuis le navigateur.
const off = () => {
  throw new Error('Edge Functions Supabase non incluses dans le site (voir src/lib/stubs/supabase-functions.ts)');
};
export class FunctionsClient {
  invoke = off;
  setAuth() {}
}
export class FunctionsError extends Error {}
export class FunctionsFetchError extends FunctionsError {}
export class FunctionsHttpError extends FunctionsError {}
export class FunctionsRelayError extends FunctionsError {}
export const FunctionRegion = {};
