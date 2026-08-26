"use client";

import {
    forwardRef,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";

type FormFieldProps = {
    label: ReactNode;
    children: ReactNode;

    htmlFor?: string;
    error?:
        | string
        | string[]
        | null;
    hint?: ReactNode;
    required?: boolean;
    className?: string;
};

function firstError(
    error:
        | string
        | string[]
        | null
        | undefined,
) {
    if (
        Array.isArray(error)
    ) {
        return error[0] ?? null;
    }

    return error ?? null;
}

export function FormField({
    label,
    children,
    htmlFor,
    error,
    hint,
    required = false,
    className = "",
}: FormFieldProps) {
    const errorMessage =
        firstError(error);

    const labelContent = (
        <>
            {label}

            {required ? (
                <span
                    className="ml-1 text-admin-seal"
                    aria-hidden="true"
                >
                    *
                </span>
            ) : null}
        </>
    );

    return (
        <div
            className={className}
        >
            {htmlFor ? (
                <label
                    htmlFor={htmlFor}
                    className="mb-1.5 block text-sm font-medium text-admin-muted"
                >
                    {labelContent}
                </label>
            ) : (
                <span className="mb-1.5 block text-sm font-medium text-admin-muted">
                    {labelContent}
                </span>
            )}

            {children}

            {errorMessage ? (
                <p
                    role="alert"
                    className="mt-1 text-xs text-admin-seal"
                >
                    {errorMessage}
                </p>
            ) : hint ? (
                <p className="mt-1 text-xs leading-5 text-admin-muted">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

type ControlStyleProps = {
    invalid?: boolean;
};

function controlClassName(
    invalid: boolean,
    className?: string,
) {
    return `w-full rounded-md border bg-admin-paper px-3 py-2 text-sm text-admin-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
        invalid
            ? "border-admin-seal focus:border-admin-seal"
            : "border-admin-line focus:border-admin-gold"
    } ${className ?? ""}`;
}

export const TextInput =
    forwardRef<
        HTMLInputElement,
        InputHTMLAttributes<HTMLInputElement> &
            ControlStyleProps
    >(function TextInput(
        {
            invalid = false,
            className,
            ...props
        },
        ref,
    ) {
        return (
            <input
                ref={ref}
                aria-invalid={
                    invalid ||
                    undefined
                }
                className={controlClassName(
                    invalid,
                    className,
                )}
                {...props}
            />
        );
    });

export const SelectInput =
    forwardRef<
        HTMLSelectElement,
        SelectHTMLAttributes<HTMLSelectElement> &
            ControlStyleProps
    >(function SelectInput(
        {
            invalid = false,
            className,
            ...props
        },
        ref,
    ) {
        return (
            <select
                ref={ref}
                aria-invalid={
                    invalid ||
                    undefined
                }
                className={controlClassName(
                    invalid,
                    className,
                )}
                {...props}
            />
        );
    });

export const TextArea =
    forwardRef<
        HTMLTextAreaElement,
        TextareaHTMLAttributes<HTMLTextAreaElement> &
            ControlStyleProps
    >(function TextArea(
        {
            invalid = false,
            className,
            ...props
        },
        ref,
    ) {
        return (
            <textarea
                ref={ref}
                aria-invalid={
                    invalid ||
                    undefined
                }
                className={controlClassName(
                    invalid,
                    `resize-y ${className ?? ""}`,
                )}
                {...props}
            />
        );
    });
