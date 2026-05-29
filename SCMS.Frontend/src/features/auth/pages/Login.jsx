import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI } from "../../../services/authService";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("dr.thandar@scms.demo");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      // ================= LOGIN API =================

      const data = await loginAPI({
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", data);

      // ================= TOKEN =================

      const token =
        data?.accessToken ||
        data?.access_token ||
        data?.token ||
        data?.data?.accessToken ||
        data?.result?.accessToken;

      // ================= USER =================

      const user = data?.user || data?.data?.user || data?.result?.user || {};

      // ================= ROLES =================

      const roles = user?.roles || [];

      const userRole = roles[0]?.toLowerCase() || "user";

      // ================= TOKEN CHECK =================

      if (!token) {
        console.error("Full Response:", data);

        throw new Error("Token not found in login response");
      }

      // ================= LOCAL STORAGE =================

      localStorage.setItem("token", token);

      localStorage.setItem("userRole", userRole);

      localStorage.setItem("user", JSON.stringify(user));

      // ================= SUCCESS =================

      Swal.fire({
        title: "Login Success!",
        text: "SCMS စနစ်သို့ ကြိုဆိုပါသည်",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // ================= NAVIGATION =================

      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login Error:", error);

      Swal.fire({
        title: "Login Failed",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။",
        icon: "error",
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        {/* ================= LOGO ================= */}

        <div>
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            S
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            SCMS Portal Login
          </h2>

          <p className="mt-2 text-center text-sm text-gray-500">
            Enter your email and password to continue
          </p>
        </div>

        {/* ================= FORM ================= */}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            {/* ================= EMAIL ================= */}

            <div className="flex flex-col text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>

              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="admin@scms.demo"
                />
              </div>
            </div>

            {/* ================= PASSWORD ================= */}

            <div className="flex flex-col text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>

              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 block w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* ================= BUTTON ================= */}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400 mt-4"
          >
            {loading ? "စစ်ဆေးနေပါသည်..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
