"use client";

import * as React from "react";
import { cn } from "./utils";
import {
  createBackdropClickHandler,
  stopModalPointerPropagation,
} from "./modalOverlayGuards";

type ModalBackdropProps = React.ComponentProps<"div"> & {
  onClose: () => void;
};

/** Custom full-screen backdrop (non-Radix). Safe with portaled Select/Popover menus. */
function ModalBackdrop({
  onClose,
  className,
  onClick,
  ...props
}: ModalBackdropProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
        className,
      )}
      onClick={(event) => {
        createBackdropClickHandler(onClose)(event);
        onClick?.(event);
      }}
      {...props}
    />
  );
}

type ModalPanelProps = React.ComponentProps<"div">;

/** Inner panel for custom modals — blocks backdrop dismiss when clicking inside. */
function ModalPanel({ className, onClick, onPointerDown, ...props }: ModalPanelProps) {
  return (
    <div
      className={cn(
        "relative z-[1] w-full max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl",
        className,
      )}
      onPointerDown={(event) => {
        stopModalPointerPropagation.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        stopModalPointerPropagation.onClick(event);
        onClick?.(event);
      }}
      {...props}
    />
  );
}

export {
  ModalBackdrop,
  ModalPanel,
  createBackdropClickHandler,
  stopModalPointerPropagation,
};
