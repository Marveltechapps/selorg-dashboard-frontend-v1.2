import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  adminFormClass,
  adminFormGrid2Class,
  adminFormGrid3Class,
  adminFieldClass,
  adminInputErrorClass,
} from './adminFormLayout';

export {
  adminFormClass,
  adminFormGrid2Class,
  adminFormGrid3Class,
  adminFieldClass,
  adminInputErrorClass,
};

export function AdminFieldHint({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-rose-600 mt-1">{error}</p>;
}

type AdminFormProps = React.FormHTMLAttributes<HTMLFormElement>;

export function AdminForm({ className, children, ...props }: AdminFormProps) {
  return (
    <form className={cn(adminFormClass, className)} {...props}>
      {children}
    </form>
  );
}

/** Form body when actions are outside a `<form>` (e.g. footer buttons call handlers) */
export function AdminFormBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(adminFormClass, className)}>{children}</div>;
}

type AdminFormGridProps = {
  cols?: 2 | 3;
  className?: string;
  children: React.ReactNode;
};

export function AdminFormGrid({ cols = 2, className, children }: AdminFormGridProps) {
  return (
    <div className={cn(cols === 3 ? adminFormGrid3Class : adminFormGrid2Class, className)}>
      {children}
    </div>
  );
}

type AdminFieldProps = {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function AdminField({ label, htmlFor, error, hint, className, children }: AdminFieldProps) {
  return (
    <div className={cn(adminFieldClass, className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <AdminFieldHint error={error} />
      {hint && !error ? (
        typeof hint === 'string' ? (
          <p className="text-xs text-gray-500 mt-1">{hint}</p>
        ) : (
          hint
        )
      ) : null}
    </div>
  );
}
