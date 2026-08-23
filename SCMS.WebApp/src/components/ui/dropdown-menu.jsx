import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Accessible DropdownMenu component for header user profiles, contextual menus, and multi-actions.
 */

export function DropdownMenu({ children, className = "" }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          isOpen,
          setIsOpen,
          closeMenu: () => setIsOpen(false),
        });
      })}
    </div>
  );
}

export function DropdownMenuTrigger({ children, isOpen, setIsOpen, className = "", asChild = false }) {
  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen?.(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      "aria-expanded": isOpen,
      "aria-haspopup": "menu",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      className={cn("cursor-pointer focus-visible:outline-none", className)}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  isOpen,
  closeMenu,
  align = "right",
  className = "",
}) {
  if (!isOpen) return null;

  return (
    <div
      role="menu"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute z-[100] mt-2 min-w-[14rem] overflow-hidden rounded-2xl border border-border/80 bg-card p-1.5 text-card-foreground shadow-2xl animate-fadeIn",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, { closeMenu });
      })}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  closeMenu,
  destructive = false,
  disabled = false,
  className = "",
  icon,
}) {
  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    closeMenu?.();
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none",
        destructive
          ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 font-semibold [&>span]:text-rose-600 dark:[&>span]:text-rose-400"
          : "text-foreground hover:bg-secondary hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate flex-1 text-left">{children}</span>
    </button>
  );
}

export function DropdownMenuSeparator({ className = "" }) {
  return <div className={cn("-mx-1.5 my-1.5 h-px bg-border/70", className)} />;
}

export function DropdownMenuLabel({ children, className = "" }) {
  return (
    <div className={cn("px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </div>
  );
}
