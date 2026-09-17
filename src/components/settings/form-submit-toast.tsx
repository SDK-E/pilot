"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function FormSubmitToast({ message }: { message: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (!pending && wasPending.current) {
      toast.success(message);
    }
    wasPending.current = pending;
  }, [pending, message]);

  return null;
}
