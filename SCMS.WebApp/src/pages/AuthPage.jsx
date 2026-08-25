import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  EyeOpenIcon,
  EyeClosedIcon,
  LockClosedIcon,
  EnvelopeClosedIcon,
  PersonIcon,
  CheckCircledIcon,
  SunIcon,
  MoonIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { BrandLogoIcon } from "../components/BrandLogo";
import { showError } from "../services/dialogs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { sanitizeText, validateMyanmarMobile, validateEmail } from "../utils/validation";

const demoAccounts = [
  {
    roleKey: "roleOwner",
    email: "admin@scms.demo",
    password: "password",
    role: "owner",
    route: "/app/dashboard",
    badge: "Owner / Admin",
  },
  {
    roleKey: "roleDoctor",
    email: "doctor@scms.demo",
    password: "password",
    role: "doctor",
    route: "/doctor/dashboard",
    badge: "Doctor",
  },
  {
    roleKey: "rolePatient",
    email: "user@scms.demo",
    password: "password",
    role: "user",
    route: "/user/dashboard",
    badge: "Patient",
  },
];

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const { t, language, toggleLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, user, token, isTokenExpired, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && (!token || !isTokenExpired || !isTokenExpired(token))) {
      const userRoles = Array.isArray(user.roles)
        ? user.roles.map((r) => String(r).toLowerCase())
        : [String(user.role || "").toLowerCase()];

      if (userRoles.includes("owner") || userRoles.includes("admin") || userRoles.includes("staff")) {
        navigate("/app/dashboard", { replace: true });
      } else if (userRoles.includes("doctor")) {
        navigate("/doctor/dashboard", { replace: true });
      } else if (userRoles.includes("user") || userRoles.includes("patient")) {
        navigate("/user/dashboard", { replace: true });
      } else {
        navigate("/app/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, token, isTokenExpired, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("owner");
  const [form, setForm] = useState({
    name: "",
    email: "admin@scms.demo",
    password: "password",
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyDemoAccount = (acc) => {
    setSelectedRole(acc.role);
    setForm({
      name: "",
      email: acc.email,
      password: acc.password,
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    const cleanEmailOrMobile = sanitizeText(form.email);
    const cleanPassword = form.password;
    const cleanName = sanitizeText(form.name);

    if (!cleanEmailOrMobile || !cleanPassword || (isRegister && !cleanName)) {
      await showError(t.requiredFields || "Please fill in all required fields.", "Required Fields");
      return;
    }

    if (isRegister) {
      if (cleanName.length < 2) {
        await showError("Full Name must be at least 2 characters.", "Invalid Name");
        return;
      }
      if (cleanPassword.length < 6) {
        await showError("Password must be at least 6 characters.", "Invalid Password");
        return;
      }
      const emailVal = validateEmail(cleanEmailOrMobile, false);
      const phoneVal = validateMyanmarMobile(cleanEmailOrMobile, false);
      if (!emailVal.isValid && !phoneVal.isValid) {
        await showError("Please enter a valid email address or Myanmar mobile number.", "Invalid Account");
        return;
      }
    }

    try {
      setLoading(true);
      if (isRegister) {
        await register({
          name: cleanName,
          email: cleanEmailOrMobile,
          password: cleanPassword,
        });
      }

      const loggedUser = await login({
        emailOrMobile: cleanEmailOrMobile,
        password: cleanPassword,
      });

      const userRoles = Array.isArray(loggedUser?.roles)
        ? loggedUser.roles.map((r) => String(r).toLowerCase())
        : [String(loggedUser?.role || "").toLowerCase()];

      if (userRoles.includes("owner") || userRoles.includes("admin") || userRoles.includes("staff")) {
        navigate(location.state?.from?.pathname || "/app/dashboard", { replace: true });
      } else if (userRoles.includes("doctor")) {
        navigate("/doctor/dashboard", { replace: true });
      } else if (userRoles.includes("user") || userRoles.includes("patient")) {
        navigate("/user/dashboard", { replace: true });
      } else {
        navigate(location.state?.from?.pathname || "/app/dashboard", { replace: true });
      }
    } catch (error) {
      await showError(
        error?.response?.data?.message || error?.message || t.signInFailed,
        t.signInFailed
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-12 transition-colors">
      {/* Warm Ambient Glow Lighting */}
      <div className="absolute -top-28 -left-28 w-[30rem] h-[30rem] bg-apricot-200/40 dark:bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-[30rem] h-[30rem] bg-indigo-200/30 dark:bg-indigo-900/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-apricot-100/25 dark:bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Floating Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title={isDark ? t.lightMode : t.darkMode}
          aria-label="Toggle dark mode"
          className="rounded-2xl h-10 w-10 bg-card/80 backdrop-blur-md shadow-sm border-border/80"
        >
          {isDark ? <SunIcon className="w-4 h-4 text-amber-400 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={toggleLanguage}
          className="h-10 px-3.5 text-xs font-bold rounded-2xl bg-card/80 backdrop-blur-md shadow-sm border-border/80"
        >
          {language === "en" ? "မြန်မာ" : "English"}
        </Button>
      </div>

      {/* Main Container Grid */}
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
        {/* Left Frosted Brand Hero Banner */}
        <section className="hidden lg:flex flex-col rounded-3xl border border-border/80 bg-card/75 dark:bg-card/60 backdrop-blur-2xl p-10 shadow-scms space-y-8">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm shrink-0">
              <BrandLogoIcon size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">ကုမယ်</h1>
              <p className="text-xs font-medium text-muted-foreground tracking-wide mt-0.5">
                Smart Clinic Management Platform
              </p>
            </div>
          </div>

          {/* Quick Demo Switcher */}
          <div className="space-y-3.5 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              {t.demoRoles}
            </span>
            <div className="grid gap-3">
              {demoAccounts.map((acc) => {
                const isSelected = selectedRole === acc.role && form.email === acc.email;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => applyDemoAccount(acc)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-foreground shadow-xs font-semibold ring-1 ring-orange-400/30"
                        : "bg-background/40 border-border/60 text-muted-foreground hover:bg-background/80 hover:text-foreground hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <CheckCircledIcon
                        className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          isSelected ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/30"
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-relaxed truncate">{t[acc.roleKey] || acc.roleKey}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{acc.email}</div>
                      </div>
                    </div>
                    <Badge variant={isSelected ? "default" : "secondary"} className={cn("shrink-0 ml-2", isSelected && "bg-orange-500 hover:bg-orange-600 text-white")}>
                      {acc.badge}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Form Card */}
        <section className="flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-md space-y-6">
            <Card className="border-border/80 bg-card/90 dark:bg-card/80 shadow-scms-raised">
              <CardHeader className="space-y-1.5 pb-6">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {isRegister ? t.register : t.welcome}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  {isRegister ? t.registerHint : t.loginHint}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  {isRegister && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-foreground">
                        {t.fullName} <span className="text-destructive">*</span>
                      </span>
                      <Input
                        startIcon={<PersonIcon className="w-4 h-4 shrink-0" />}
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="e.g., Dr. Thandar Aung"
                        required
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">
                      {t.email} <span className="text-destructive">*</span>
                    </span>
                    <Input
                      type="email"
                      startIcon={<EnvelopeClosedIcon className="w-4 h-4 shrink-0" />}
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="name@clinic.com"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">
                      {t.password} <span className="text-destructive">*</span>
                    </span>
                    <Input
                      type={showPassword ? "text" : "password"}
                      startIcon={<LockClosedIcon className="w-4 h-4 shrink-0" />}
                      endIcon={
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeClosedIcon className="w-4 h-4 shrink-0" />
                          ) : (
                            <EyeOpenIcon className="w-4 h-4 shrink-0" />
                          )}
                        </button>
                      }
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                    />
                  </label>

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    loading={loading}
                  >
                    <span>{isRegister ? t.register : t.login}</span>
                  </Button>
                </form>

                {isRegister && (
                  <div className="mt-6 pt-4 border-t border-border/80 text-center text-xs text-muted-foreground">
                    <span>
                      Already have an account?{" "}
                      <Link to="/login" className="font-semibold text-foreground hover:underline">
                        {t.login}
                      </Link>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

