import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = forwardRef(function PasswordInput(
  { label, error, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label && <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>}
      <div className="relative">
        <input
          {...props}
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">{error.message}</p>}
    </div>
  );
});

export default PasswordInput;
