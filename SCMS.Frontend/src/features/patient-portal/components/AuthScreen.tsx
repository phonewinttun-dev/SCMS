import { useState, type FormEvent } from "react";
import { loginAPI, registerAPI } from "../../../services/authService";
import { Icon } from "./Icons";

export interface AuthScreenProps {
  onLogin: (displayName: string) => void;
}

interface FormState {
  name: string;
  mobile: string;
  password: string;
  confirmPw: string;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>({
    name: "",
    mobile: "",
    password: "",
    confirmPw: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (!formData.name || !formData.mobile || !formData.password) {
        setError("လိုအပ်သော အချက်အလက်များကို ဖြည့်သွင်းပေးပါ။");
        return;
      }
      if (formData.password !== formData.confirmPw) {
        setError("စကားဝှက်နှစ်ခု တူညီမှု မရှိပါ။");
        return;
      }
      if (formData.password.length < 8) {
        setError("စကားဝှက်သည် အနည်းဆုံး ၈ လုံး ရှိရပါမည်။");
        return;
      }
    } else if (!formData.mobile || !formData.password) {
      setError("ဖုန်းနံပါတ်နှင့် စကားဝှက် ထည့်သွင်းပေးပါ။");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const result = await registerAPI({
          name: formData.name,
          mobileNo: formData.mobile,
          password: formData.password,
        });
        onLogin(result.user?.name ?? formData.name);
      } else {
        const result = await loginAPI({
          mobileNo: formData.mobile,
          password: formData.password,
        });
        onLogin(result.user?.name ?? "User");
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ||
        (err as Error).message ||
        "ဝင်ရောက်မှု မအောင်မြင်ပါ။";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", mobile: "", password: "", confirmPw: "" });
    setError(null);
  };

  return (
    <div className="auth-wrap fade-up">
      <div className="auth-logo">S</div>
      <h1 className="auth-title">
        {mode === "login" ? "မင်္ဂလာပါ" : "အကောင့်ဖွင့်ရန်"}
      </h1>
      <p className="auth-sub">
        {mode === "login"
          ? "SCMS user portal သို့ ဝင်ရောက်ရန်"
          : "ကျန်းမာရေးမှတ်တမ်းများကို ကြည့်ရှုရန်"}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          {mode === "register" && (
            <div className="field">
              <label htmlFor="pp-name">အမည် (Full Name)</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Icon name="user" size={18} />
                </span>
                <input
                  id="pp-name"
                  name="name"
                  type="text"
                  placeholder="ဦးဘဘ"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="pp-mobile">ဖုန်းနံပါတ် (Mobile Number)</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Icon name="phone" size={18} />
              </span>
              <input
                id="pp-mobile"
                name="mobile"
                type="tel"
                required
                placeholder="09 xxx xxxx xx"
                value={formData.mobile}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="pp-password">
              {mode === "login" ? "စကားဝှက်" : "စကားဝှက် သတ်မှတ်ရန်"}
            </label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Icon name="lock" size={18} />
              </span>
              <input
                id="pp-password"
                name="password"
                type={showPw ? "text" : "password"}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPw(!showPw)}
                aria-label="စကားဝှက် ပြရန်"
              >
                <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="field">
              <label htmlFor="pp-confirm">စကားဝှက် အတည်ပြုရန် (Confirm Password)</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Icon name="lock" size={18} />
                </span>
                <input
                  id="pp-confirm"
                  name="confirmPw"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={formData.confirmPw}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="auth-error shake">{error}</p>}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {loading ? (
            <div className="spinner" />
          ) : mode === "login" ? (
            "ဝင်ရောက်မည် (Sign In)"
          ) : (
            "အကောင့်ဖွင့်မည် (Register)"
          )}
        </button>
      </form>

      <p className="auth-toggle">
        {mode === "login" ? (
          <>
            အကောင့်မရှိသေးဘူးလား?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                resetForm();
              }}
            >
              ဒီမှာ ဖွင့်ပါ
            </button>
          </>
        ) : (
          <>
            အကောင့်ရှိပြီးသားလား?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetForm();
              }}
            >
              ဝင်ရောက်မည်
            </button>
          </>
        )}
      </p>
    </div>
  );
}
