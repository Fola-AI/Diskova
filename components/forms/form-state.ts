/** Shared shape returned by Server Actions used with useActionState. */
export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export const initialFormState: FormState = {};
