import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { useCoachAuth } from "../auth/CoachAuthContext";
import bgUrl from "../assets/backgroud.png";

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();

  const from = (loc.state as any)?.from as string | undefined;
  const { coachProfile, signIn, resetPassword, error: authError, loading: authLoading } = useCoachAuth();
  const alreadyAuthed = !!coachProfile;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);
  const canSendReset = useMemo(() => resetEmail.trim().length > 0, [resetEmail]);

  useEffect(() => {
    if (alreadyAuthed) nav("/schools", { replace: true });
  }, [alreadyAuthed, nav]);

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-5rem)] px-4 py-8 md:py-10 bg-black/35">
        <div className="max-w-md mx-auto space-y-4">
      <div className="flex justify-center px-2">
        <BrandMark label="Coach / staff access" onDark size={44} />
      </div>

      <div className="glass rounded-2xl p-5 md:p-6">
        {showForgotPassword ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
            <p className="text-gray-600 mt-2 text-sm">
              Enter your coach email and we&apos;ll send you a link to reset your password.
            </p>

            {resetSuccess ? (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm">
                  Check your email. We sent a password reset link to <strong>{resetEmail}</strong>. If you don&apos;t see it, check your spam folder.
                </div>
                <button
                  type="button"
                  className="w-full border-2 border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-4 py-3 font-semibold"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                    setResetError(null);
                    setResetEmail("");
                  }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!canSendReset || resetSubmitting) return;
                  setResetSubmitting(true);
                  setResetError(null);
                  const res = await resetPassword(resetEmail);
                  setResetSubmitting(false);
                  if (res.ok) {
                    setResetSuccess(true);
                  } else {
                    setResetError(res.error ?? "Failed to send reset email");
                  }
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <input
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your coach email"
                  />
                </div>
                {resetError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                    {resetError}
                  </div>
                )}
                <button
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:hover:bg-primary-500 text-white rounded-xl px-4 py-3 font-semibold"
                  disabled={!canSendReset || resetSubmitting}
                  type="submit"
                >
                  {resetSubmitting ? "Sending…" : "Send reset link"}
                </button>
                <button
                  type="button"
                  className="w-full border-2 border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-4 py-3 font-semibold"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetError(null);
                    setResetEmail("");
                  }}
                >
                  Back to sign in
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
            <p className="text-gray-600 mt-2 text-sm">
              Sign in with your coach email and password.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!canSubmit || submitting) return;
                setSubmitting(true);
                setError(null);

                const res = await signIn(email.trim(), password);
                setSubmitting(false);

                if (!res.ok) {
                  setError(res.error ?? "Login failed");
                  return;
                }

                nav(from ?? "/schools", { replace: true });
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <input
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="Enter email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <button
                    type="button"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="w-full p-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg grid place-items-center hover:bg-gray-100 text-gray-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}
              {!error && authError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                  {authError}
                </div>
              )}

              <button
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:hover:bg-primary-500 text-white rounded-xl px-4 py-3 font-semibold"
                disabled={!canSubmit || submitting || authLoading}
                type="submit"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}

