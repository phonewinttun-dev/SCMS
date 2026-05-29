import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerAPI } from "../../../services/authService";
// Phone နေရာတွင် Mail ကို အစားထိုးသွင်းလိုက်ပါသည်
import { UserPlus, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // mobileNo မှ email သို့ ပြောင်းလဲခြင်း
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      Swal.fire({
        title: "မှားယွင်းနေပါသည်",
        text: "စကားဝှက်နှစ်ခု တူညီမှု မရှိပါဘဲ။",
        icon: "error",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    setLoading(true);

    try {
      // mobileNo နေရာတွင် email ကို API သို့ ပေးပို့ပါသည်
      await registerAPI({
        name,
        email,
        password,
        role: "User", // စနစ်အလိုက် 'Patient' သို့မဟုတ် 'User' လိုအပ်သလို ပြောင်းနိုင်ပါသည်
      });

      Swal.fire({
        title: "Registration Success!",
        text: "အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။ Login ပြန်ဝင်ပေးပါဗျာ။",
        icon: "success",
        confirmButtonColor: "#4f46e5",
      });

      navigate("/login");
    } catch (error) {
      console.error("Registration Error:", error);
      Swal.fire({
        title: "Registration Failed",
        text:
          error.response?.data?.message ||
          "အကောင့်အသစ်ဆောက်ရာတွင် တစ်ခုခုမှားယွင်းနေပါသည်။",
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
        <div>
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            S
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Sign up to access patient portal
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleRegister}>
          <div className="rounded-md space-y-4">
            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 block w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="မောင်မောင်"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
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

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"} // စကားဝှက်ကို ကြည့်ရှုခြင်း/ဖျောက်ခြင်း စနစ်နှင့် ချိတ်ဆက်ထားပါသည်
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 block w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400 mt-6"
          >
            <UserPlus size={18} className="mr-2" />
            {loading ? "အကောင့်ဆောက်နေပါသည်..." : "Register"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
