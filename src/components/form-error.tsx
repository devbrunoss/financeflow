export function FormError({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-sm text-red-800">Erro: {error}</p> : null;
}
