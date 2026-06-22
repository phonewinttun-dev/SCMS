import { Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { BrandLogoIcon } from "../components/BrandLogo";
import { showError } from "../services/dialogs";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const { t, language, toggleLanguage } = useLanguage();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: isRegister ? "" : "dr.thandar@scms.demo",
    password: isRegister ? "" : "password",
    mobileNo: "",
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();

    if (isRegister) {
      if (!form.name.trim() || !form.mobileNo.trim() || !form.password.trim()) {
        await showError(t.requiredFields);
        return;
      }
    } else {
      if (!form.email.trim() || !form.password.trim()) {
        await showError(t.requiredFields);
        return;
      }
    }

    try {
      setLoading(true);
      if (isRegister) {
        await register({
          name: form.name.trim(),
          email: form.email.trim() || null,
          mobileNo: form.mobileNo.trim(),
          password: form.password,
        });
      }

      const loginIdentifier = (isRegister && !form.email.trim()) ? form.mobileNo.trim() : form.email.trim();
      const user = await login({ emailOrMobile: loginIdentifier, password: form.password });
      if (user?.role === "user") {
        navigate("/user/dashboard", { replace: true });
      } else {
        navigate(location.state?.from?.pathname || "/app/dashboard", { replace: true });
      }
    } catch (error) {
      await showError(error?.response?.data?.message || error?.message || t.signInFailed, t.signInFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-scms-bg lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden items-center justify-center p-12 lg:flex">
        <div className="w-full max-w-xl rounded-[30px] bg-gradient-to-br from-scms-primary to-scms-primaryDark p-10 text-white shadow-[0_30px_80px_rgba(0,82,204,0.22)]">
          <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-white shrink-0 shadow-md"><BrandLogoIcon size={34} /></div>
          <h1 className="mt-7 text-4xl font-black tracking-tight">ကုမယ် Portal</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/80">
            Smart Clinic Management System for appointments, EMR, prescriptions, medicines, payments and reports.
          </p>
          <div className="mt-8 grid gap-3">
            {["Secure admin login", "Real-time clinic workflow", "Clean medical dashboard"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-extrabold">
                <ShieldCheck size={18} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8">
        <form className="w-full max-w-md rounded-[28px] border border-scms-border bg-white p-7 shadow-scms-raised" onSubmit={submit}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white border border-scms-border lg:hidden shrink-0 shadow-sm"><BrandLogoIcon size={24} /></div>
              <h2 className="mt-4 text-3xl font-black text-scms-text">{isRegister ? t.register : t.welcome}</h2>
              <p className="mt-2 text-sm leading-6 text-scms-muted">{isRegister ? t.registerHint : t.loginHint}</p>
            </div>
            <button type="button" className="scms-btn-outline" onClick={toggleLanguage}>
              {t.language}
            </button>
          </div>

          {isRegister && (
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-extrabold text-scms-text">{t.fullName}</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-scms-muted" size={18} />
                <input className="scms-input scms-input-icon w-full" value={form.name} onChange={(event) => update("name", event.target.value)} />
              </div>
            </label>
          )}

          {isRegister && (
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-extrabold text-scms-text">{t.phone}</span>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-scms-muted" size={18} />
                <input className="scms-input scms-input-icon w-full" value={form.mobileNo} onChange={(event) => update("mobileNo", event.target.value)} />
              </div>
            </label>
          )}

          <label className="mb-4 block">
            <span className="mb-2 block text-xs font-extrabold text-scms-text">
              {isRegister 
                ? `${t.email} (${language === "en" ? "Optional" : "ရွေးချယ်ရန်"})` 
                : `${t.email} / ${t.phone}`}
            </span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-scms-muted" size={18} />
              <input className="scms-input scms-input-icon w-full" type={isRegister ? "email" : "text"} value={form.email} onChange={(event) => update("email", event.target.value)} />
            </div>
          </label>

          <div className="mb-5 block">
            <span className="mb-2 block text-xs font-extrabold text-scms-text">{t.password}</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-scms-muted" size={18} />
              <input className="scms-input scms-input-icon w-full pr-12" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} />
              <button 
                type="button" 
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-scms-muted hover:text-scms-text transition-colors focus:outline-none" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword((prev) => !prev);
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="scms-btn-primary w-full" disabled={loading}>
            {loading && <span className="loading loading-spinner loading-sm" />}
            {isRegister ? t.register : t.login}
          </button>

          {isRegister && (
            <div className="mt-5 text-center text-sm text-scms-muted">
              <Link className="font-extrabold text-scms-primary" to="/login">
                {t.login}
              </Link>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
