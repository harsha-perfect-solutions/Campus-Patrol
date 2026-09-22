import { Moon, Sun } from "lucide-react";
import { useCmadms } from "@/lib/cmadms-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useCmadms();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
      className={cn(
        "rounded-full p-1 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer border border-transparent hover:border-border select-none shrink-0",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 dark:text-slate-200 transition-transform duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}
