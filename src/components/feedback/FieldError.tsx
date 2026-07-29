type FieldErrorProps = { id?: string; message?: string | null };

export default function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}